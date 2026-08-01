"""Déviants positifs : qui fait mieux que son profil ne le prédit ?

L'IPE classe les wilayas par gravité. Il ne peut pas répondre à la question la
plus utile pour l'action : *à profil socio-économique égal*, laquelle scolarise
le mieux ? Une wilaya pauvre, rurale et jeune qui obtient de bons résultats est
un modèle transférable ; une wilaya favorisée qui sous-performe est une anomalie
à expliquer.

Méthode : on prédit le taux de hors-école de chaque wilaya à partir de son seul
profil (pauvreté, ruralité, dépendance des jeunes, densité d'écoles), puis on
lit les **résidus**. Avec 13 observations, une prédiction ajustée sur toutes les
wilayas serait complaisante : chaque wilaya est donc prédite par un modèle
estimé **sans elle** (validation « leave-one-out »), ce qui rend le résidu
honnête.

Une forêt d'isolement complète le diagnostic en repérant les profils atypiques
sur l'ensemble des dimensions, indépendamment du résultat scolaire.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import StandardScaler

PREDICTEURS = [
    "taux_pauvrete",
    "part_rurale",
    "ratio_dependance_jeunes",
    "ecoles_pour_1000_enfants",
]
LABELS = {
    "taux_pauvrete": "Taux de pauvreté",
    "part_rurale": "Part rurale",
    "ratio_dependance_jeunes": "Dépendance des jeunes",
    "ecoles_pour_1000_enfants": "Écoles / 1000 enfants",
}
CIBLE = "scol_Hors_ecole_formelle"
SEED = 42


def run_deviants(features: pd.DataFrame | None = None) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/wilaya_features.csv")
    df = features.copy()
    X = df[PREDICTEURS].to_numpy(dtype=float)
    y = df[CIBLE].to_numpy(dtype=float)
    n = len(df)

    # --- prédiction leave-one-out -------------------------------------------
    attendu = np.empty(n)
    for i in range(n):
        garde = np.ones(n, bool)
        garde[i] = False
        sc = StandardScaler().fit(X[garde])
        modele = RidgeCV(alphas=np.logspace(-2, 3, 30)).fit(sc.transform(X[garde]), y[garde])
        attendu[i] = float(modele.predict(sc.transform(X[i:i + 1]))[0])

    residu = y - attendu
    sigma = float(residu.std(ddof=1))

    # --- modèle complet, pour lire les coefficients --------------------------
    sc = StandardScaler().fit(X)
    plein = RidgeCV(alphas=np.logspace(-2, 3, 30)).fit(sc.transform(X), y)
    r2_loo = 1 - float(((y - attendu) ** 2).sum() / ((y - y.mean()) ** 2).sum())

    coefficients = [
        {"variable": v, "label": LABELS[v], "coefficient_standardise": round(float(c), 2)}
        for v, c in zip(PREDICTEURS, plein.coef_)
    ]
    coefficients.sort(key=lambda c: -abs(c["coefficient_standardise"]))

    # --- forêt d'isolement : profils atypiques -------------------------------
    iso = IsolationForest(n_estimators=300, contamination=0.15, random_state=SEED)
    iso.fit(sc.transform(X))
    score_atypie = -iso.score_samples(sc.transform(X))  # plus haut = plus atypique

    lignes = []
    for i, r in df.iterrows():
        z = float(residu[i] / sigma) if sigma else 0.0
        if z <= -1.0:
            statut = "deviant_positif"
        elif z >= 1.0:
            statut = "sous_performance"
        else:
            statut = "conforme"
        lignes.append(
            {
                "wilaya": r["wilaya"],
                "observe_pct": round(float(y[i]), 1),
                "attendu_pct": round(float(attendu[i]), 1),
                "residu_pts": round(float(residu[i]), 1),
                "residu_z": round(z, 2),
                "statut": statut,
                "atypie": round(float(score_atypie[i]), 3),
                "profil_atypique": bool(iso.predict(sc.transform(X[i:i + 1]))[0] == -1),
                "taux_pauvrete": round(float(r["taux_pauvrete"]), 1),
                "part_rurale": round(float(r["part_rurale"]), 1),
                "ecoles_pour_1000_enfants": round(float(r["ecoles_pour_1000_enfants"]), 2),
                "enfants_hors_ecole": int(r["enfants_hors_ecole"]),
            }
        )
    lignes.sort(key=lambda d: d["residu_pts"])

    positifs = [d for d in lignes if d["statut"] == "deviant_positif"]
    negatifs = [d for d in lignes if d["statut"] == "sous_performance"]

    def _nom(liste: list[dict]) -> str:
        return ", ".join(d["wilaya"] for d in liste) or "aucune"

    return {
        "r2_leave_one_out": round(r2_loo, 3),
        "ecart_type_residus_pts": round(sigma, 2),
        "coefficients": coefficients,
        "wilayas": lignes,
        "deviants_positifs": [d["wilaya"] for d in positifs],
        "sous_performances": [d["wilaya"] for d in negatifs],
        "profils_atypiques": [d["wilaya"] for d in lignes if d["profil_atypique"]],
        "lecture": (
            f"Le profil socio-économique explique {round(max(r2_loo, 0) * 100)} % de la variance du "
            f"taux de hors-école en validation croisée (écart-type des résidus : {sigma:.1f} points). "
            f"Déviants positifs — font nettement mieux que leur profil : {_nom(positifs)}. "
            f"Sous-performances — font nettement moins bien : {_nom(negatifs)}. "
            "Les premières sont des cas à documenter et à transposer ; les secondes signalent un "
            "problème qui ne s'explique pas par la pauvreté ni par l'éloignement."
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_deviants()
    dump_json("data/processed/analytics/deviants.json", res, indent=2)

    print(f"R² (leave-one-out) = {res['r2_leave_one_out']}  |  "
          f"σ(résidus) = {res['ecart_type_residus_pts']} pts")
    print("\n--- poids du profil ---")
    for c in res["coefficients"]:
        print(f"  {c['label']:<26}{c['coefficient_standardise']:+.2f}")
    print(f"\n{'wilaya':<20}{'observé':>9}{'attendu':>9}{'résidu':>9}{'z':>7}  statut")
    for d in res["wilayas"]:
        marque = {"deviant_positif": "◄ modèle", "sous_performance": "◄ alerte"}.get(d["statut"], "")
        print(f"{d['wilaya']:<20}{d['observe_pct']:>8.1f}%{d['attendu_pct']:>8.1f}%"
              f"{d['residu_pts']:>+9.1f}{d['residu_z']:>+7.2f}  {marque}")
    print(f"\n{res['lecture']}")
