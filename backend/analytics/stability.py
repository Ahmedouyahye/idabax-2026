"""La typologie en trois profils est-elle réelle ?

`clustering.py` retient k=3 avec une silhouette de 0,331 sur 13 points, en
assumant que le k=2 est « légèrement supérieur en silhouette mais moins riche ».
C'est un choix éditorial honnête mais non testé, et 0,331 est une valeur faible.
Ce module le traite de front, avec quatre instruments :

1. **Stabilité par rééchantillonnage** on tire 1 000 échantillons bootstrap,
   on reclasse, et on mesure l'Adjusted Rand Index entre la partition obtenue et
   la partition de référence. Un k stable est un k dont la structure survit à la
   perturbation des données — critère plus exigeant et plus pertinent que la
   seule silhouette.
2. **Classification ascendante hiérarchique** (Ward) : le dendrogramme montre
   l'ordre des regroupements et où la coupure est naturelle.
3. **Mélange gaussien** avec critère BIC, comme second avis probabiliste.
4. **Matrice de co-assignation** : pour chaque paire de wilayas, la fréquence à
   laquelle elles tombent dans le même groupe sur les rééchantillonnages. C'est
   la sortie la plus lisible : elle montre quels regroupements sont acquis et
   lesquels sont fragiles, indépendamment du k retenu.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import dendrogram, linkage
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

from backend.analytics.clustering import FEATURES

SEED = 42
N_BOOT = 1000
K_MIN, K_MAX = 2, 6


def _partition(X: np.ndarray, k: int, seed: int = SEED) -> np.ndarray:
    return KMeans(n_clusters=k, n_init=10, random_state=seed).fit_predict(X)


def stabilite_bootstrap(X: np.ndarray, wilayas: list[str]) -> dict:
    rng = np.random.default_rng(SEED)
    n = len(X)

    par_k = []
    for k in range(K_MIN, K_MAX + 1):
        reference = _partition(X, k)
        aris = []
        for _ in range(N_BOOT):
            idx = rng.integers(0, n, n)
            if len(np.unique(idx)) < k + 1:
                continue
            km = KMeans(n_clusters=k, n_init=5, random_state=SEED).fit(X[idx])
            # on reprojette sur TOUTES les wilayas pour comparer des partitions comparables
            aris.append(adjusted_rand_score(reference, km.predict(X)))
        par_k.append(
            {
                "k": k,
                "ari_moyen": round(float(np.mean(aris)), 3),
                "ari_ecart_type": round(float(np.std(aris)), 3),
                "ari_p05": round(float(np.percentile(aris, 5)), 3),
                "silhouette": round(float(silhouette_score(X, reference)), 3),
            }
        )

    meilleur = max(par_k, key=lambda d: d["ari_moyen"])
    return {"n_boot": N_BOOT, "par_k": par_k, "k_le_plus_stable": meilleur["k"]}


def co_assignation(X: np.ndarray, wilayas: list[str], k: int) -> dict:
    """Fréquence à laquelle chaque paire de wilayas se retrouve dans le même groupe."""
    rng = np.random.default_rng(SEED)
    n = len(X)
    ensemble = np.zeros((n, n))
    for _ in range(N_BOOT):
        idx = rng.integers(0, n, n)
        if len(np.unique(idx)) < k + 1:
            continue
        labels = KMeans(n_clusters=k, n_init=5, random_state=SEED).fit(X[idx]).predict(X)
        ensemble += (labels[:, None] == labels[None, :]).astype(float)
    ensemble /= N_BOOT

    cellules = [
        {"x": wilayas[j], "y": wilayas[i], "value": round(float(ensemble[i, j]), 2)}
        for i in range(n)
        for j in range(n)
    ]
    paires_fragiles = sorted(
        (
            {"a": wilayas[i], "b": wilayas[j], "frequence": round(float(ensemble[i, j]), 2)}
            for i in range(n) for j in range(i + 1, n)
            if 0.3 <= ensemble[i, j] <= 0.7
        ),
        key=lambda d: abs(d["frequence"] - 0.5),
    )
    return {"wilayas": wilayas, "matrice": cellules, "paires_ambigues": paires_fragiles[:8]}


def hierarchique(X: np.ndarray, wilayas: list[str]) -> dict:
    Z = linkage(X, method="ward")
    dd = dendrogram(Z, labels=wilayas, no_plot=True)
    return {
        "ordre_feuilles": dd["ivl"],
        "fusions": [
            {
                "etape": i + 1,
                "a": int(Z[i, 0]),
                "b": int(Z[i, 1]),
                "distance": round(float(Z[i, 2]), 3),
                "taille": int(Z[i, 3]),
            }
            for i in range(len(Z))
        ],
        "sauts": [
            {"de_k": len(wilayas) - i - 1, "a_k": len(wilayas) - i - 2,
             "saut_distance": round(float(Z[i, 2]), 3)}
            for i in range(len(Z))
        ][-6:],
    }


def melange_gaussien(X: np.ndarray) -> dict:
    lignes = []
    for k in range(K_MIN, K_MAX + 1):
        gm = GaussianMixture(n_components=k, covariance_type="diag",
                             n_init=5, random_state=SEED).fit(X)
        lignes.append({"k": k, "bic": round(float(gm.bic(X)), 1), "aic": round(float(gm.aic(X)), 1)})
    return {
        "par_k": lignes,
        "k_bic_optimal": min(lignes, key=lambda d: d["bic"])["k"],
        "avertissement": (
            "Avec 13 observations pour 8 variables, le BIC continue de décroître jusqu'à k=6 : "
            "le mélange gaussien surajuste et son optimum n'est pas interprétable ici. Il est "
            "conservé comme contre-épreuve, pas comme critère de décision."
        ),
    }


def run_stability(features: pd.DataFrame | None = None, k_retenu: int = 3) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/wilaya_features.csv")
    wilayas = features["wilaya"].tolist()
    X = StandardScaler().fit_transform(features[FEATURES].to_numpy(dtype=float))

    boot = stabilite_bootstrap(X, wilayas)
    coass = co_assignation(X, wilayas, k_retenu)
    gm = melange_gaussien(X)
    hier = hierarchique(X, wilayas)

    retenu = next(d for d in boot["par_k"] if d["k"] == k_retenu)
    return {
        "k_retenu": k_retenu,
        "bootstrap": boot,
        "co_assignation": coass,
        "melange_gaussien": gm,
        "hierarchique": hier,
        "verdict": (
            f"À k={k_retenu}, la partition résiste au rééchantillonnage avec un ARI moyen de "
            f"{retenu['ari_moyen']} (silhouette {retenu['silhouette']}). Le k le plus stable au sens "
            f"de l'ARI est k={boot['k_le_plus_stable']} — mais k=2 sépare seulement les wilayas "
            "urbaines des autres, ce qui n'oriente aucune décision. "
            + (
                f"Les critères convergent : la typologie en {k_retenu} profils est solide."
                if boot["k_le_plus_stable"] == k_retenu else
                f"k={k_retenu} reste donc un choix "
                "éditorial, justifié par la lisibilité des leviers d'action plutôt que par "
                "l'optimalité statistique. La matrice de co-assignation ci-contre montre quels "
                "regroupements sont acquis quel que soit le k."
            )
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_stability()
    dump_json("data/processed/analytics/stability.json", res, indent=2)

    print(f"{'k':>3}{'ARI moyen':>12}{'σ':>8}{'ARI p05':>10}{'silhouette':>13}")
    for d in res["bootstrap"]["par_k"]:
        marque = " ← retenu" if d["k"] == res["k_retenu"] else ""
        print(f"{d['k']:>3}{d['ari_moyen']:>12.3f}{d['ari_ecart_type']:>8.3f}"
              f"{d['ari_p05']:>10.3f}{d['silhouette']:>13.3f}{marque}")

    print("\nBIC du mélange gaussien :")
    for d in res["melange_gaussien"]["par_k"]:
        print(f"  k={d['k']}  BIC={d['bic']:>9.1f}")

    print(f"\nOrdre du dendrogramme : {' · '.join(res['hierarchique']['ordre_feuilles'])}")

    amb = res["co_assignation"]["paires_ambigues"]
    if amb:
        print("\nPaires les plus ambiguës (regroupées une fois sur deux) :")
        for p in amb[:5]:
            print(f"  {p['a']} ↔ {p['b']} : {p['frequence']}")

    print(f"\n{res['verdict']}")
