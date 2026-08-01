"""Matrice de corrélations entre indicateurs wilaya.

Réseau complet des corrélations de Pearson entre les indicateurs clés
(13 wilayas). Sert à la page « Indicateurs » (heatmap).
"""
from __future__ import annotations

import pandas as pd

INDICATEURS = [
    ("scol_Hors_ecole_formelle", "Taux hors école formelle"),
    ("scol_Mahadra_trad", "Mahadra / coranique (%)"),
    ("scol_Aucune instruction", "Aucune instruction (%)"),
    ("taux_pauvrete", "Pauvreté (%)"),
    ("part_rurale", "Ruralité (%)"),
    ("ratio_dependance_jeunes", "Dépendance jeunes"),
    ("ecoles_pour_1000_enfants", "Écoles / 1000 enf."),
    ("ecart_genre_hors_ecole", "Écart genre hors école"),
    ("taux_chomage", "Chômage (%)"),
    ("part_adultes_sans_instruction", "Adultes 15+ sans instruction (%)"),
    ("part_0_14_pct", "Population 0-14 (%)"),
    ("enfants_hors_ecole", "Effectif hors école"),
]


def run_indicateurs(features: pd.DataFrame) -> dict:
    cols = [k for k, _ in INDICATEURS]
    sub = features[cols].copy()
    sub["enfants_hors_ecole"] = sub["enfants_hors_ecole"].apply(lambda x: round(float(x) ** 0.5, 3))
    labels = dict(INDICATEURS)
    labels["enfants_hors_ecole"] = "Effectif hors école (√)"

    corr = sub.corr(method="pearson")

    matrix = []
    for i, row in enumerate(corr.index):
        for j, col in enumerate(corr.columns):
            matrix.append(
                {
                    "x": labels[col],
                    "y": labels[row],
                    "value": round(float(corr.loc[row, col]), 2),
                }
            )

    top = []
    for i in range(len(corr.columns)):
        for j in range(i + 1, len(corr.columns)):
            a, b = corr.columns[i], corr.columns[j]
            r = float(corr.loc[a, b])
            top.append({"a": labels[a], "b": labels[b], "r": round(r, 2)})
    top.sort(key=lambda x: -abs(x["r"]))

    return {
        "indicators": [{"key": k, "label": labels[k]} for k, _ in INDICATEURS],
        "matrix": matrix,
        "top_correlations": top[:20],
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    features = pd.read_csv("data/processed/wilaya_features.csv")
    res = run_indicateurs(features)
    dump_json("data/processed/analytics/indicateurs.json", res, indent=2)
    print("--- top corrélations ---")
    for t in res["top_correlations"][:8]:
        print(f"  {t['a']:28s} × {t['b']:28s} r={t['r']:+.2f}")
