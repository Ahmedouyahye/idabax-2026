"""Décomposition de l'exclusion scolaire.

Relit les microdonnées EPCV 2019 (enfants 6-14) et décompose le hors-école
par tranche d'âge (6-9 / 10-14), milieu (urbain / rural), sexe et type
d'exclusion (mahadra-coranique vs aucune instruction) au niveau national
et par wilaya. Tous les indicateurs sont des parts (%) de la population 6-14.
"""
from __future__ import annotations

import pandas as pd

from backend.pipeline.build_dataset import age_group6_14, load_epcv

FORMEL = {"Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"}


def _hors_ecole(grp: pd.DataFrame) -> float:
 n = len(grp)
 if n == 0:
 return 0.0
 return round((~grp["educ_statut"].isin(FORMEL)).mean() * 100, 1)


def _split_out(grp: pd.DataFrame) -> dict:
 """Parmi les enfants hors école formelle : mahadra vs aucune instruction."""
 he = grp[~grp["educ_statut"].isin(FORMEL)]
 n = len(he)
 if n == 0:
 return {"mahadra_pct_he": 0.0, "aucune_pct_he": 0.0}
 mah = he["educ_statut"].isin(["Oui Mahadra uniquement", "Oui enseignement coranique uniquement"]).mean() * 100
 return {"mahadra_pct_he": round(mah, 1), "aucune_pct_he": round(100 - mah, 1)}


def run_decomposition() -> dict:
 epcv = load_epcv()
 kids = age_group6_14(epcv)

 def row(grp: pd.DataFrame, wilaya: str) -> dict:
 age_6_9 = grp[grp["age"].between(6, 9)]
 age_10_14 = grp[grp["age"].between(10, 14)]
 urb = grp[grp["milieu"] == "Urbain"]
 rur = grp[grp["milieu"] == "Rural"]
 fem = grp[grp["sexe"] == "Féminin"]
 masc = grp[grp["sexe"] == "Masculin"]
 d = {
 "wilaya": wilaya,
 "n": int(len(grp)),
 "age_6_9_hors_ecole": _hors_ecole(age_6_9),
 "age_10_14_hors_ecole": _hors_ecole(age_10_14),
 "urbain_hors_ecole": _hors_ecole(urb),
 "rural_hors_ecole": _hors_ecole(rur),
 "filles_hors_ecole": _hors_ecole(fem),
 "garcons_hors_ecole": _hors_ecole(masc),
 }
 d.update(_split_out(grp))
 return d

 wilayas = [row(g, w) for w, g in kids.groupby("wilaya")]
 national = row(kids, "National")
 national["wilaya"] = "Mauritanie"

 # parts de la population 6-14 : structure de l'exclusion au niveau national
 he = kids[~kids["educ_statut"].isin(FORMEL)]
 national["structure"] = {
 "filles_pct_he": round((he["sexe"] == "Féminin").mean() * 100, 1),
 "rural_pct_he": round((he["milieu"] == "Rural").mean() * 100, 1),
 "age_6_9_pct_he": round((he["age"].between(6, 9)).mean() * 100, 1),
 "mahadra_pct_he": round(
 he["educ_statut"].isin(["Oui Mahadra uniquement", "Oui enseignement coranique uniquement"]).mean() * 100, 1),
 "aucune_pct_he": round(
 (he["educ_statut"] == "Non").mean() * 100, 1),
 }

 return {"national": national, "wilayas": wilayas, "n_children_6_14": int(len(kids))}


if __name__ == "__main__":
 from backend.sanitize import dump_json

 res = run_decomposition()
 dump_json("data/processed/analytics/decomposition.json", res, indent=2)
 nat = res["national"]
 print(f"National: {nat['n']} enfants 6-14 hors école {nat['age_6_9_hors_ecole']}% (6-9) / "
 f"{nat['age_10_14_hors_ecole']}% (10-14)")
 print(f" structure: {nat['structure']}")
