"""Indice de Priorité Éducative (IPE).

IPE = 0.40 * Volume + 0.35 * Intensité + 0.25 * Vulnérabilité
Chaque dimension est normalisée en 0-100 (min-max) sur les 13 wilayas.
- Volume     : nombre d'enfants 6-14 hors école formelle (échelle log pour atténuer l'effet taille)
- Intensité  : taux (%) d'enfants 6-14 hors école formelle
- Vulnérabilité : taux de pauvreté (%) + prime de surcharge démographique (ratio dépendance jeunes)
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def normalize(s: pd.Series, log: bool = False) -> pd.Series:
    s = s.astype(float)
    if log:
        s = np.log1p(s)
    s_min, s_max = s.min(), s.max()
    if s_max == s_min:
        return pd.Series(50.0, index=s.index)
    return (s - s_min) / (s_max - s_min) * 100


def build_index(features: pd.DataFrame) -> pd.DataFrame:
    df = features.copy()
    df["volume_norm"] = normalize(df["enfants_hors_ecole"], log=True)
    df["intensite_norm"] = normalize(df["scol_Hors_ecole_formelle"])
    vuln = 0.75 * normalize(df["taux_pauvrete"]) + 0.25 * normalize(df["ratio_dependance_jeunes"])
    df["vulnerabilite_norm"] = vuln
    df["ipe"] = (
        0.40 * df["volume_norm"]
        + 0.35 * df["intensite_norm"]
        + 0.25 * df["vulnerabilite_norm"]
    )
    df["ipe"] = df["ipe"].round(1)
    df["rang_ipe"] = df["ipe"].rank(ascending=False, method="min").astype(int)

    # levier d'action dominant
    def levier(row: pd.DataFrame) -> str:
        if row["scol_Aucune instruction"] > 30:
            return "Construire des écoles"
        if row["scol_Mahadra_trad"] > 25:
            return "Passerelles vers le formel"
        if row["scol_Mahadra_trad"] > 10:
            return "Valoriser l'enseignement traditionnel"
        if row["scol_Hors_ecole_formelle"] > 25:
            return "Renforcer la rétention scolaire"
        return "Consolider / suivre"

    df["levier_action"] = df.apply(levier, axis=1)
    return df


if __name__ == "__main__":
    features = pd.read_csv("data/processed/wilaya_features.csv")
    out = build_index(features)
    cols = ["wilaya", "rang_ipe", "ipe", "volume_norm", "intensite_norm",
            "vulnerabilite_norm", "enfants_hors_ecole", "levier_action"]
    print(out[cols].sort_values("rang_ipe").to_string(index=False))
    out.to_csv("data/processed/analytics/indice_priorite_educative.csv", index=False)
