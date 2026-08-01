"""Régression logistique : déterminants individuels du hors-école.

Sur les 16 451 enfants de 6-14 ans de l'EPCV 2019, on estime la probabilité
d'être hors de l'école formelle en fonction de : sexe, tranche d'âge, milieu,
pauvreté, éducation du chef de ménage et wilaya (référence : Nouakchott).

Le résultat clé est l'odds-ratio ajusté de chaque facteur l'effet d'un
facteur toutes choses égales par ailleurs.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm

WILAYAS = ["Hodh Ech Chargui", "Hodh El Gharbi", "Assaba", "Gorgol", "Brakna", "Trarza",
 "Adrar", "Dakhlet Nouadhibou", "Tagant", "Guidimakha", "Tiris Zemmour",
 "Inchiri", "Nouakchott"]

LABELS = {
 "sexe_feminin": ("Sexe féminin", "Sexe"),
 "age_6_9": ("Âge 6-9 ans (réf. 10-14)", "Âge"),
 "milieu_rural": ("Milieu rural (réf. urbain)", "Milieu"),
 "pauvre": ("Ménage pauvre (réf. non pauvre)", "Pauvreté"),
 "cm_sans_education": ("Chef de ménage sans éducation", "Éducation du chef"),
}


def build_dataset(epcv_path: str = "data/raw/EPCV2019_60600_individuals.sav") -> pd.DataFrame:
 import pyreadstat

 df, meta = pyreadstat.read_sav(epcv_path)
 kids = df[(df["B4"] >= 6) & (df["B4"] <= 14)].copy()
 labels = meta.variable_value_labels

 def lab(col: str):
 return kids[col].map(labels.get(col, {}))

 out = pd.DataFrame(
 {
 "hors_ecole": (~kids["C2"].isin([3.0, 4.0])).astype(int),
 "sexe_feminin": lab("B2").eq("Féminin").astype(int),
 "age_6_9": kids["B4"].between(6, 9).astype(int),
 "milieu_rural": lab("milieu").eq("Rural").astype(int),
 "pauvre": kids["pauv"].astype(bool).astype(int),
 "cm_sans_education": lab("nivcm").eq("Aucun").astype(int),
 "wilaya": kids["wilaya"].map(dict(zip(range(1, 14), WILAYAS))),
 }
 )
 return out


def run_logit() -> dict:
 df = build_dataset()
 y = df["hors_ecole"]
 # La variable cm_sans_education est PARFAITEMENT prédictive (séparation
 # complète : tout enfant dont le CM est sans éducation est hors école) 
 # son coefficient ne peut pas être estimé par maximum de vraisemblance.
 # Elle est traitée par les règles d'association (confiance 100 %, lift 3,02).
 df["cm_sans_education_predictive"] = df["cm_sans_education"]
 X = df.drop(columns=["hors_ecole", "wilaya", "cm_sans_education", "cm_sans_education_predictive"])
 for w in WILAYAS:
 if w != "Nouakchott":
 X[f"wilaya_{w}"] = (df["wilaya"] == w).astype(int)
 X = sm.add_constant(X)

 model = sm.Logit(y, X).fit(disp=0, maxiter=200)

 coef = model.params
 se = model.bse
 pv = model.pvalues
 ci = model.conf_int()

 base_prevalence = float(y.mean())

 features = []
 for name in [c for c in X.columns if c != "const"]:
 orr = float(np.clip(np.exp(coef[name]), 1e-6, 1e6))
 orr_lo = float(np.clip(np.exp(ci.loc[name, 0]), 1e-6, 1e6))
 orr_hi = float(np.clip(np.exp(ci.loc[name, 1]), 1e-6, 1e6))
 label, cat = LABELS.get(name, (name.replace("wilaya_", ""), "Wilaya"))
 features.append(
 {
 "name": name,
 "label": label,
 "categorie": cat,
 "odds_ratio": round(orr, 2),
 "ci_lo": round(orr_lo, 2),
 "ci_hi": round(orr_hi, 2),
 "coef": round(float(coef[name]), 3),
 "pvalue": float(pv[name]),
 "wilaya": name.startswith("wilaya_"),
 }
 )
 features.sort(key=lambda f: -abs(f["coef"]))

 wilaya_features = [f for f in features if f["wilaya"]]
 wilaya_features.sort(key=lambda f: -f["odds_ratio"])

 return {
 "n_children_6_14": int(len(df)),
 "prevalence_hors_ecole_pct": round(base_prevalence * 100, 1),
 "pseudo_r2": round(float(model.prsquared), 3),
 "aic": float(model.aic),
 "features": features,
 "wilayas": wilaya_features,
 "reference_wilaya": "Nouakchott",
 "facteur_determinant": "cm_sans_education",
 "facteur_determinant_note": (
 "Un chef de ménage sans éducation est un facteur parfaitement prédictif "
 "du hors-école (séparation complète) : son effet n'est pas estimable par "
 "le modèle et est présenté via les règles d'association (confiance 100 %, lift 3,02)."
 ),
 "interpretation": (
 "Un odds-ratio > 1 augmente la probabilité d'exclusion, < 1 la réduit. "
 "Tous les effets sont ajustés sur les autres facteurs (toutes choses égales par ailleurs). "
 "Références : garçon, 10-14 ans, urbain, ménage non pauvre, wilaya de Nouakchott."
 ),
 }


if __name__ == "__main__":
 from backend.sanitize import dump_json

 res = run_logit()
 dump_json("data/processed/analytics/logit.json", res, indent=2)
 print(f"n={res['n_children_6_14']} pseudo-R²={res['pseudo_r2']} "
 f"prévalence={res['prevalence_hors_ecole_pct']}%")
 print("--- odds-ratios ajustés (facteurs individuels) ---")
 for f in res["features"]:
 if not f["wilaya"]:
 star = "***" if f["pvalue"] < 0.001 else ("**" if f["pvalue"] < 0.01 else ("*" if f["pvalue"] < 0.05 else ""))
 print(f" {f['label']:42s} OR={f['odds_ratio']:>5.2f} [{f['ci_lo']}, {f['ci_hi']}] {star}")
 print("--- wilayas (réf. Nouakchott) ---")
 for f in res["wilayas"][:6]:
 print(f" {f['label']:24s} OR={f['odds_ratio']:>5.2f}")
