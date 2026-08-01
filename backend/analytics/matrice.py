"""Matrice de stratégie volume × intensité.

Croise deux dimensions de l'IPE :
- Volume    : effectif d'enfants 6-14 hors école formelle (échelle log)
- Intensité : taux (%) de hors-école formelle
Le partage se fait sur les médianes (13 wilayas). Chaque quadrant reçoit une
stratégie d'investissement nommée et une recommandation.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

QUADRANTS = {
    (1, 1): {
        "id": "massif",
        "label": "Effort massif",
        "description": "Beaucoup d'enfants et un taux élevé : le double fardeau. Priorité absolue "
                       "de construction et de recrutement.",
        "color": "#ef6f5f",
    },
    (1, 0): {
        "id": "viviers",
        "label": "Ciblage des effectifs",
        "description": "De grands viviers d'enfants avec un taux modéré : l'effort se porte sur la "
                       "conversion des effectifs (passerelles, rétention).",
        "color": "#eeb74f",
    },
    (0, 1): {
        "id": "intensif",
        "label": "Traitement local",
        "description": "Petits effectifs mais forte exclusion : solutions de proximité, mahadra "
                       "à intégrer, suivi ciblé des zones à risque.",
        "color": "#ef9460",
    },
    (0, 0): {
        "id": "vigilance",
        "label": "Consolidation",
        "description": "Effectifs et taux contenus : maintenir, suivre les flux et prévenir tout "
                       "recul de la scolarisation.",
        "color": "#4ec3a3",
    },
}


def run_matrice(features: pd.DataFrame) -> dict:
    df = features.copy()
    df["volume_log"] = np.log1p(df["enfants_hors_ecole"])
    hi_v = df["volume_log"] >= df["volume_log"].median()
    hi_i = df["scol_Hors_ecole_formelle"] >= df["scol_Hors_ecole_formelle"].median()
    df["quadrant"] = [(1 if v else 0, 1 if i else 0) for v, i in zip(hi_v, hi_i)]

    quadrants = []
    for key, q in QUADRANTS.items():
        sel = df[df["quadrant"] == key]
        quadrants.append(
            {
                **q,
                "key": f"{key[0]}{key[1]}",
                "wilayas": sel["wilaya"].tolist(),
                "enfants_hors_ecole": int(sel["enfants_hors_ecole"].sum()),
            }
        )
    quadrants.sort(key=lambda q: -q["enfants_hors_ecole"])

    scatter = df[["wilaya", "scol_Hors_ecole_formelle", "volume_log", "enfants_hors_ecole", "quadrant"]].to_dict("records")
    for s in scatter:
        s["quadrant_id"] = QUADRANTS[tuple(s["quadrant"])]["id"]
        s["quadrant"] = [int(x) for x in s["quadrant"]]

    return {
        "median_volume_log": float(df["volume_log"].median()),
        "median_intensite": float(df["scol_Hors_ecole_formelle"].median()),
        "quadrants": quadrants,
        "scatter": scatter,
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    features = pd.read_csv("data/processed/wilaya_features.csv")
    res = run_matrice(features)
    dump_json("data/processed/analytics/matrice.json", res, indent=2)
    for q in res["quadrants"]:
        print(f"{q['label']:22s} {q['enfants_hors_ecole']:>6d}  {', '.join(q['wilayas'])}")
