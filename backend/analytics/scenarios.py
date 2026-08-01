"""Scénarios d'investissement à l'horizon 2030.

À partir du taux de hors-école national 2022 (33,1 %) et de la tendance
observée (WDI, enfants hors école primaire, %), on projette quatre trajectoires
nationales et on traduit la réponse "construction" en besoin d'établissements
et en coût estimé par wilaya.

Hypothèses documentées :
- tendance annuelle = pente OLS de SE.PRM.UNER.ZS (2008-2024), bornée [-1.0, 0]
- coût moyen par établissement : 25 M MRO (hypothèse de démonstration)
- 1 EUR ≈ 400 MRO
"""
from __future__ import annotations

import numpy as np
import pandas as pd

HORIZON = 2030
YEARS = HORIZON - 2022
COST_PER_SCHOOL_MRO = 25_000_000.0
MRO_PER_EUR = 400.0


def annual_trend() -> float:
 wb = pd.read_csv("data/raw/worldbank_indicators.csv")
 d = wb[(wb["indicator"] == "SE.PRM.UNER.ZS") & wb["value"].notna()].copy()
 d = d[d["year"] >= 2008]
 if len(d) < 3:
 return -0.5
 x = d["year"].astype(float)
 y = d["value"].astype(float)
 slope = float(np.polyfit(x, y, 1)[0])
 return float(np.clip(slope, -1.0, 0.0))


def run_scenarios(features: pd.DataFrame) -> dict:
 trend = annual_trend()
 nat = json_national()

 taux0 = nat["taux_hors_ecole_national_pct"]
 pop0 = nat["population_6_14_2022"]
 he0 = nat["enfants_hors_ecole_formelle"]
 mahadra0 = nat["enfants_mahadra"]

 def project(convert_share: float | None, build_target: float | None) -> dict:
 # trajectoire tendancielle
 taux_ref = max(taux0 + trend * YEARS, 0.0)
 taux = taux_ref
 detail = {}
 if convert_share is not None:
 # conversion d'une part des enfants mahadra vers le formel, en plus de la tendance
 converted = mahadra0 * convert_share
 detail["converted_children"] = int(round(converted))
 taux = max(taux_ref - (converted / pop0 * 100), 0.0)
 if build_target is not None:
 detail["ecoles_a_creer"] = int(round(build_target))
 detail["cout_mro"] = round(build_target * COST_PER_SCHOOL_MRO, 0)
 detail["cout_meuro"] = round(build_target * COST_PER_SCHOOL_MRO / MRO_PER_EUR / 1e6, 1)
 enfants = int(round(taux / 100 * pop0))
 return {
 "taux_2030": round(taux, 1),
 "enfants_hors_ecole_2030": enfants,
 "reduction_enfants_vs_2022": he0 - enfants,
 **detail,
 }

 scenarios = [
 {
 "id": "reference",
 "label": "Trajectoire tendancielle",
 "description": f"Progression observée ({trend:+.2f} pt/an, WDI 2008-2024) prolongée jusqu'en 2030.",
 "color": "#a19077",
 **project(convert_share=None, build_target=None),
 },
 {
 "id": "passerelles_25",
 "label": "Passerelles mahadra → formel (25 %)",
 "description": "Convertir un quart des enfants en éducation traditionnelle vers le formel d'ici 2030.",
 "color": "#eeb74f",
 **project(convert_share=0.25, build_target=None),
 },
 {
 "id": "passerelles_50",
 "label": "Passerelles mahadra → formel (50 %)",
 "description": "Convertir la moitié des enfants en éducation traditionnelle vers le formel d'ici 2030.",
 "color": "#4ec3a3",
 **project(convert_share=0.50, build_target=None),
 },
 {
 "id": "construction",
 "label": "Construction d'écoles de proximité",
 "description": "Atteindre 1 établissement pour 1 000 enfants dans chaque wilaya (densité actuelle : "
 "0,59/1000 au niveau national).",
 "color": "#ef6f5f",
 **project(convert_share=None, build_target=build_needs(features)),
 },
 ]

 par_wilaya = []
 for _, r in features.iterrows():
 target = max(1.0 - r["ecoles_pour_1000_enfants"], 0.0)
 besoin = int(round(target * r["pop_6_14_2022"] / 1000))
 par_wilaya.append(
 {
 "wilaya": r["wilaya"],
 "taux_2022": round(r["scol_Hors_ecole_formelle"], 1),
 "enfants_hors_ecole": int(r["enfants_hors_ecole"]),
 "enfants_mahadra": int(r["enfants_mahadra"]),
 "ecoles_pour_1000_enfants": round(float(r["ecoles_pour_1000_enfants"]), 2),
 "ecoles_a_creer": besoin,
 "cout_mro": round(besoin * COST_PER_SCHOOL_MRO, 0),
 "cout_meuro": round(besoin * COST_PER_SCHOOL_MRO / MRO_PER_EUR / 1e6, 1),
 }
 )
 par_wilaya.sort(key=lambda x: -x["ecoles_a_creer"])

 return {
 "horizon": HORIZON,
 "years": YEARS,
 "trend_annual_pts": round(trend, 3),
 "cost_per_school_mro": COST_PER_SCHOOL_MRO,
 "baseline": {
 "taux_hors_ecole_2022": taux0,
 "enfants_hors_ecole_2022": he0,
 "enfants_mahadra_2022": mahadra0,
 "population_6_14_2022": pop0,
 },
 "scenarios": scenarios,
 "par_wilaya": par_wilaya,
 }


def build_needs(features: pd.DataFrame) -> int:
 return int(sum(max(1.0 - r["ecoles_pour_1000_enfants"], 0.0) * r["pop_6_14_2022"] / 1000
 for _, r in features.iterrows()))


def json_national() -> dict:
 import json

 return json.load(open("data/processed/national_summary.json"))


if __name__ == "__main__":
 from backend.sanitize import dump_json

 features = pd.read_csv("data/processed/wilaya_features.csv")
 res = run_scenarios(features)
 dump_json("data/processed/analytics/scenarios.json", res, indent=2)
 print(f"Tendance: {res['trend_annual_pts']} pt/an horizon {res['horizon']}")
 for s in res["scenarios"]:
 print(f" {s['label']:36s} taux2030={s['taux_2030']:5.1f}% enfants={s['enfants_hors_ecole_2030']:>7d}")
 top = res["par_wilaya"][0]
 print(f" Construction nationale: {res['scenarios'][-1]['ecoles_a_creer']} écoles, "
 f"{res['scenarios'][-1]['cout_meuro']} M€ ex. {top['wilaya']}: {top['ecoles_a_creer']} écoles")
