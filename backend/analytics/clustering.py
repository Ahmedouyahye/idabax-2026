"""Typologie des wilayas par clustering (K-means + hiérarchique).

Features normalisées (z-score) : intensité hors école, pauvreté, ruralité,
surcharge démographique, part enseignement traditionnel, densité d'écoles,
écart de genre hors école.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import fcluster, linkage
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "scol_Hors_ecole_formelle",
    "taux_pauvrete",
    "part_rurale",
    "ratio_dependance_jeunes",
    "scol_Mahadra_trad",
    "scol_Aucune instruction",
    "ecart_genre_hors_ecole",
    "ecoles_pour_1000_enfants",
]


def choose_k(X: np.ndarray, k_max: int = 6) -> tuple[int, list[float]]:
    from sklearn.metrics import silhouette_score

    inertias, silhouettes = [], []
    for k in range(2, k_max + 1):
        km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
        inertias.append(float(km.inertia_))
        silhouettes.append(float(silhouette_score(X, km.labels_)))
    best = int(2 + np.argmax(silhouettes))
    return best, inertias


def run_clustering(features: pd.DataFrame, k: int | None = None) -> pd.DataFrame:
    df = features.copy()
    X = StandardScaler().fit_transform(df[FEATURES].values)

    if k is None:
        k, inertias = choose_k(X)
    else:
        inertias = [float(KMeans(n_clusters=kk, n_init=10, random_state=42).fit(X).inertia_)
                    for kk in range(2, 7)]

    km = KMeans(n_clusters=k, n_init=20, random_state=42).fit(X)
    df["cluster"] = km.labels_

    # profil de chaque cluster (moyennes)
    profiles = df.groupby("cluster")[FEATURES].mean().round(2)
    profile_meta = []
    for c in range(k):
        row = profiles.loc[c]
        meta = {
            "cluster": int(c),
            "wilayas": sorted(df[df["cluster"] == c]["wilaya"].tolist()),
            "taille": int((df["cluster"] == c).sum()),
            "hors_ecole_moyen_pct": float(row["scol_Hors_ecole_formelle"]),
            "pauvrete_moyen_pct": float(row["taux_pauvrete"]),
            "ruralite_moyen_pct": float(row["part_rurale"]),
            "dependance_jeunes_moyen": float(row["ratio_dependance_jeunes"]),
            "mahadra_moyen_pct": float(row["scol_Mahadra_trad"]),
            "aucune_instruction_moyen_pct": float(row["scol_Aucune instruction"]),
        }
        if row["scol_Hors_ecole_formelle"] <= 20:
            meta["label"] = "Scolarisation proche de l'universel"
            meta["levier"] = "Consolider et suivre"
        elif row["scol_Mahadra_trad"] > row["scol_Aucune instruction"]:
            meta["label"] = "Exclusion à dominante traditionnelle"
            meta["levier"] = "Passerelles mahadra → formel"
        else:
            meta["label"] = "Exclusion à dominante 'aucune instruction'"
            meta["levier"] = "Construire des écoles"
        profile_meta.append(meta)

    with open("data/processed/analytics/clusters.json", "w") as fh:
        from sklearn.metrics import silhouette_score

        sil = round(float(silhouette_score(X, km.labels_)), 3)
        json.dump({"k": k, "inertias": inertias, "silhouette": sil, "profiles": profile_meta},
                  fh, ensure_ascii=False, indent=2)
    return df


if __name__ == "__main__":
    features = pd.read_csv("data/processed/wilaya_features.csv")
    out = run_clustering(features)
    print(out[["wilaya", "cluster"]].sort_values("cluster").to_string(index=False))
    out.to_csv("data/processed/analytics/clusters.csv", index=False)
