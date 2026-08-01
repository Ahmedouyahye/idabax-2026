"""Concentration territoriale du hors-école (Pareto + Gini).

L'exclusion scolaire n'est pas uniformément répartie. Ce module quantifie la
concentration : part des enfants hors école portée par les premières wilayas,
nombre de wilayas pour atteindre 50 % du problème, courbe de Lorenz et
indice de Gini locational (0 = répartition égale, 1 = concentration totale).
"""
from __future__ import annotations

import pandas as pd


def _lorenz_gini(x: list[float]) -> tuple[list[dict], float]:
 x_sorted = sorted(x, reverse=True)
 total = sum(x_sorted)
 cum = 0.0
 n = len(x_sorted)
 points = []
 for i, v in enumerate(x_sorted):
 cum += v
 points.append({"x": round((i + 1) / n * 100, 1), "y": round(cum / total * 100, 1)})
 # Indice de Gini standard (formule par paires, insensible à l'ordre) :
 # G = Σ_i Σ_j |x_i − x_j| / (2 n Σ x)
 gini = 0.0
 for i in range(n):
 for j in range(n):
 gini += abs(x[i] - x[j])
 gini = round(gini / (2 * n * total), 3)
 return points, gini


def run_concentration(features: pd.DataFrame) -> dict:
 df = features.sort_values("enfants_hors_ecole", ascending=False).reset_index(drop=True)
 total = int(df["enfants_hors_ecole"].sum())
 df["part_cumulee"] = (df["enfants_hors_ecole"].cumsum() / total * 100).round(1)

 n_50 = int((df["part_cumulee"] < 50).sum() + 1)

 top5 = df.head(5)[["wilaya", "enfants_hors_ecole", "part_cumulee"]].to_dict("records")
 top3 = df.head(3)
 lorenz, gini = _lorenz_gini(df["enfants_hors_ecole"].tolist())

 return {
 "total_enfants_hors_ecole": total,
 "top5_share": float(df.head(5)["enfants_hors_ecole"].sum() / total * 100),
 "top3_share": float(top3["enfants_hors_ecole"].sum() / total * 100),
 "top1": df.iloc[0]["wilaya"],
 "n_wilayas_pour_50pct": n_50,
 "gini": gini,
 "top5": top5,
 "lorenz": lorenz,
 "classement": df[["wilaya", "enfants_hors_ecole", "part_cumulee"]].to_dict("records"),
 }


if __name__ == "__main__":
 from backend.sanitize import dump_json

 features = pd.read_csv("data/processed/wilaya_features.csv")
 res = run_concentration(features)
 dump_json("data/processed/analytics/concentration.json", res, indent=2)
 print(f"{res['top5_share']:.1f}% du hors-école dans les 5 premières wilayas")
 print(f"Gini locational: {res['gini']} {res['n_wilayas_pour_50pct']} wilayas pour 50% du problème")
