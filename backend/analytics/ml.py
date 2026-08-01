"""Modèle prédictif validé et interprétable du hors-école.

Le logit existant (`logit.py`) rapporte un pseudo-R² calculé sur les données
d'entraînement : aucune métrique de test, aucune courbe de calibration, et
l'âge y est réduit à une variable binaire 6-9 / 10-14. Ce module ajoute ce qui
manque pour qu'un modèle soit défendable :

- un **protocole de validation** : découpage stratifié train/test, validation
  croisée 5 blocs, ROC-AUC, PR-AUC, courbe de calibration, matrice de confusion
  au seuil optimal (indice de Youden) ;
- un **modèle non linéaire** (gradient boosting) confronté au logit régularisé,
  avec l'âge en continu ;
- une **interprétation SHAP** : importance globale, effet de l'âge année par
  année, et interactions (rural × pauvre).

Le point de comparaison compte autant que le modèle : si le gain d'AUC du
gradient boosting sur le logit est faible, cela veut dire que les déterminants
du hors-école sont simples et structurels — ce qui renforce le message plutôt
que de l'affaiblir. Le résultat est rapporté tel quel dans les deux cas.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, confusion_matrix, roc_auc_score,
                             roc_curve)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from backend.pipeline.build_dataset import age_group6_14, load_epcv

FORMEL = {"Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"}
SEED = 42

LABELS = {
    "age": "Âge (continu)",
    "rural": "Milieu rural",
    "pauvre": "Ménage pauvre",
    "feminin": "Sexe féminin",
    "densite_ecoles": "Écoles / 1000 enfants (wilaya)",
    "taux_pauvrete_wilaya": "Taux de pauvreté (wilaya)",
    "part_rurale_wilaya": "Part rurale (wilaya)",
}


def build_matrix() -> tuple[pd.DataFrame, pd.Series]:
    """Individus 6-14 ans, enrichis de trois caractéristiques de leur wilaya."""
    kids = age_group6_14(load_epcv())
    feats = pd.read_csv("data/processed/wilaya_features.csv").set_index("wilaya")

    X = pd.DataFrame(
        {
            "age": kids["age"].astype(float),
            "rural": (kids["milieu"] == "Rural").astype(float),
            "pauvre": kids["pauvre"].astype(bool).astype(float),
            "feminin": (kids["sexe"] == "Féminin").astype(float),
            "densite_ecoles": kids["wilaya"].map(feats["ecoles_pour_1000_enfants"]).astype(float),
            "taux_pauvrete_wilaya": kids["wilaya"].map(feats["taux_pauvrete"]).astype(float),
            "part_rurale_wilaya": kids["wilaya"].map(feats["part_rurale"]).astype(float),
        },
        index=kids.index,
    )
    y = (~kids["educ_statut"].isin(FORMEL)).astype(int)
    return X, y


def _metrics(y_true: np.ndarray, proba: np.ndarray) -> dict:
    auc = float(roc_auc_score(y_true, proba))
    ap = float(average_precision_score(y_true, proba))
    fpr, tpr, thr = roc_curve(y_true, proba)
    j = int(np.argmax(tpr - fpr))
    seuil = float(thr[j])
    pred = (proba >= seuil).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
    return {
        "auc": round(auc, 3),
        "pr_auc": round(ap, 3),
        "seuil_youden": round(seuil, 3),
        "sensibilite": round(float(tp / (tp + fn)), 3),
        "specificite": round(float(tn / (tn + fp)), 3),
        "matrice": {"vn": int(tn), "fp": int(fp), "fn": int(fn), "vp": int(tp)},
        "roc": [
            {"fpr": round(float(a), 4), "tpr": round(float(b), 4)}
            for a, b in zip(fpr[:: max(1, len(fpr) // 60)], tpr[:: max(1, len(tpr) // 60)])
        ],
    }


def run_ml() -> dict:
    X, y = build_matrix()
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=SEED
    )

    gbm = HistGradientBoostingClassifier(
        max_iter=300, learning_rate=0.06, max_leaf_nodes=15,
        l2_regularization=1.0, random_state=SEED,
    )
    logit = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, C=1.0))

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    modeles = {}
    for nom, est in (("Gradient boosting", gbm), ("Régression logistique", logit)):
        cv_scores = cross_val_score(est, X_tr, y_tr, cv=cv, scoring="roc_auc")
        est.fit(X_tr, y_tr)
        proba_te = est.predict_proba(X_te)[:, 1]
        proba_tr = est.predict_proba(X_tr)[:, 1]
        modeles[nom] = {
            "cv_auc_moyenne": round(float(cv_scores.mean()), 3),
            "cv_auc_ecart_type": round(float(cv_scores.std()), 3),
            "auc_entrainement": round(float(roc_auc_score(y_tr, proba_tr)), 3),
            **_metrics(y_te.to_numpy(), proba_te),
        }

    gain = modeles["Gradient boosting"]["auc"] - modeles["Régression logistique"]["auc"]

    # ---- calibration (modèle retenu : gradient boosting) --------------------
    proba_te = gbm.predict_proba(X_te)[:, 1]
    frac_pos, moy_pred = calibration_curve(y_te, proba_te, n_bins=10, strategy="quantile")
    calibration = [
        {"predit": round(float(a), 3), "observe": round(float(b), 3)}
        for a, b in zip(moy_pred, frac_pos)
    ]

    # ---- interprétation SHAP ------------------------------------------------
    import shap

    ech = X_te.sample(min(2000, len(X_te)), random_state=SEED)
    valeurs = shap.TreeExplainer(gbm).shap_values(ech)
    if isinstance(valeurs, list):          # certaines versions renvoient une liste par classe
        valeurs = valeurs[1]
    valeurs = np.asarray(valeurs)
    if valeurs.ndim == 3:                  # (n, p, classes)
        valeurs = valeurs[:, :, -1]

    importance = [
        {
            "feature": c,
            "label": LABELS.get(c, c),
            "importance": round(float(np.abs(valeurs[:, i]).mean()), 4),
        }
        for i, c in enumerate(ech.columns)
    ]
    importance.sort(key=lambda d: -d["importance"])

    # effet de l'âge, année par année : ce que le logit binarisé écrase
    i_age = list(ech.columns).index("age")
    effet_age = (
        pd.DataFrame({"age": ech["age"].to_numpy(), "shap": valeurs[:, i_age]})
        .groupby("age")["shap"].mean().round(4).reset_index()
        .rename(columns={"shap": "effet_shap"})
        .to_dict("records")
    )

    # interaction rural x pauvre : effet moyen observé sur les 4 combinaisons
    combi = []
    for rural in (0.0, 1.0):
        for pauvre in (0.0, 1.0):
            sel = (ech["rural"] == rural) & (ech["pauvre"] == pauvre)
            if sel.sum() < 20:
                continue
            combi.append(
                {
                    "rural": bool(rural),
                    "pauvre": bool(pauvre),
                    "n": int(sel.sum()),
                    "proba_moyenne_pct": round(float(gbm.predict_proba(ech[sel])[:, 1].mean() * 100), 1),
                }
            )
    combi.sort(key=lambda d: -d["proba_moyenne_pct"])

    return {
        "n_total": int(len(X)),
        "n_entrainement": int(len(X_tr)),
        "n_test": int(len(X_te)),
        "prevalence_pct": round(float(y.mean() * 100), 1),
        "modeles": modeles,
        "gain_auc_gbm_vs_logit": round(float(gain), 3),
        "calibration": calibration,
        "shap_importance": importance,
        "effet_age": effet_age,
        "interaction_rural_pauvre": combi,
        "conclusion": (
            f"Le gradient boosting atteint une AUC de test de {modeles['Gradient boosting']['auc']} "
            f"contre {modeles['Régression logistique']['auc']} pour la régression logistique, soit "
            f"{gain:+.3f}. "
            + (
                "Le gain est marginal : les déterminants du hors-école sont simples, additifs et "
                "structurels. Un modèle complexe n'apporte rien de plus qu'un modèle lisible — "
                "c'est un argument pour la transparence de la décision, pas contre le modèle."
                if abs(gain) < 0.02 else
                "Le gain est réel : il existe des effets non linéaires ou des interactions que le "
                "modèle linéaire ne capte pas, détaillés ci-dessous."
            )
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_ml()
    dump_json("data/processed/analytics/ml.json", res, indent=2)

    print(f"n={res['n_total']} (train {res['n_entrainement']} / test {res['n_test']}), "
          f"prévalence {res['prevalence_pct']} %")
    print(f"{'modèle':<24}{'CV AUC':>10}{'AUC test':>10}{'PR-AUC':>9}{'Sens.':>8}{'Spéc.':>8}")
    for nom, m in res["modeles"].items():
        print(f"{nom:<24}{m['cv_auc_moyenne']:>10.3f}{m['auc']:>10.3f}{m['pr_auc']:>9.3f}"
              f"{m['sensibilite']:>8.3f}{m['specificite']:>8.3f}")
    print(f"\n{res['conclusion']}")

    print("\n--- importance SHAP ---")
    for f in res["shap_importance"]:
        print(f"  {f['label']:<34}{f['importance']:.4f}")

    print("\n--- interaction milieu x pauvreté (probabilité prédite) ---")
    for c in res["interaction_rural_pauvre"]:
        print(f"  rural={str(c['rural']):<5} pauvre={str(c['pauvre']):<5} "
              f"n={c['n']:>4}  {c['proba_moyenne_pct']:>5.1f} %")

    print("\n--- effet de l'âge (SHAP moyen) ---")
    for e in res["effet_age"]:
        print(f"  {int(e['age'])} ans : {e['effet_shap']:+.3f}")
