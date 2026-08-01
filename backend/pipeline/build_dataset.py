"""Master data pipeline: EPCV 2019 + HDX population + OSM schools + boundaries.

Produces:
  - data/processed/wilaya_features.csv   (master wilaya-level feature table, 13 wilayas)
  - data/processed/mauritania_wilayas.geojson (boundaries joined with indicators)
  - data/processed/epcv_indicators.json  (detailed per-wilaya education status, by sex/milieu)
  - data/processed/national_summary.json
Run: python -m backend.pipeline.build_dataset
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pyreadstat

from backend.sanitize import dump_json

ROOT = "."
RAW = f"{ROOT}/data/raw"
PROC = f"{ROOT}/data/processed"

# ---- canonical wilaya table -------------------------------------------------
CANONICAL = {
    1: "Hodh Ech Chargui",
    2: "Hodh El Gharbi",
    3: "Assaba",
    4: "Gorgol",
    5: "Brakna",
    6: "Trarza",
    7: "Adrar",
    8: "Dakhlet Nouadhibou",
    9: "Tagant",
    10: "Guidimakha",
    11: "Tiris Zemmour",
    12: "Inchiri",
    13: "Nouakchott",
}
CANONICAL_BY_NAME = {
    "Hodh charghy": "Hodh Ech Chargui",
    "Hodh Chargui": "Hodh Ech Chargui",
    "Hodh El Chargi": "Hodh Ech Chargui",
    "Hodh Gharby": "Hodh El Gharbi",
    "Hodh El Gharbi": "Hodh El Gharbi",
    "Dakhlett Nouadibou": "Dakhlet Nouadhibou",
    "Dakhlet Nouadhibou": "Dakhlet Nouadhibou",
    "Dakhlet-Nouadhibou": "Dakhlet Nouadhibou",
    "Guidimagha": "Guidimakha",
    "Guidimakha": "Guidimakha",
    "Tirs-ezemour": "Tiris Zemmour",
    "Tiris Zemmour": "Tiris Zemmour",
    "Tris-Zemmour": "Tiris Zemmour",
}
WILAYA_CODES = {v: k for k, v in CANONICAL.items()}


def canonical(name: str | None) -> str | None:
    if name is None:
        return None
    name = name.strip()
    if name in CANONICAL_BY_NAME:
        return CANONICAL_BY_NAME[name]
    for canonical_name in CANONICAL.values():
        if name.lower() == canonical_name.lower():
            return canonical_name
    if name.startswith("Nouakchott"):
        return "Nouakchott"
    return name


# ---- 1. EPCV loader ---------------------------------------------------------
def load_epcv() -> pd.DataFrame:
    df, meta = pyreadstat.read_sav(f"{RAW}/EPCV2019_60600_individuals.sav")
    labels = meta.variable_value_labels

    def lab(col: str):
        return df[col].map(labels.get(col, {}))

    out = pd.DataFrame(
        {
            "sexe": lab("B2"),
            "age": df["B4"],
            "age_groupe": lab("Groupe_age"),
            "milieu": lab("milieu"),
            "wilaya": df["wilaya"].map(CANONICAL),
            "educ_statut": lab("C2"),
            "niveau": lab("C4N"),
            "nivcm": lab("nivcm"),
            "dejall": lab("dejall"),
            "chomage": df["chom"],
            "pauvre": df["pauv"],
        }
    )
    out["sexe"] = out["sexe"].str.strip()
    out["milieu"] = out["milieu"].str.strip()
    return out


def age_group6_14(df: pd.DataFrame) -> pd.DataFrame:
    return df[(df["age"] >= 6) & (df["age"] <= 14)].copy()


def educ_composition(grp: pd.DataFrame, label: str) -> dict:
    total = len(grp)
    if total == 0:
        return {"n": 0}
    comp = {}
    for cat in ["Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"]:
        comp.setdefault("Formel", 0)
    comp = {
        "Formel": ((grp["educ_statut"].isin(
            ["Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"]
        )).mean() * 100),
        "Mahadra": ((grp["educ_statut"] == "Oui Mahadra uniquement").mean() * 100),
        "Coranique": ((grp["educ_statut"] == "Oui enseignement coranique uniquement").mean() * 100),
        "Aucune instruction": ((grp["educ_statut"] == "Non").mean() * 100),
    }
    # Enseignement traditionnel (mahadra + coranique) : on apprend, sans diplôme reconnu
    comp["Mahadra_trad"] = comp["Mahadra"] + comp["Coranique"]
    comp["Hors_ecole_formelle"] = comp["Mahadra_trad"] + comp["Aucune instruction"]
    comp["n"] = int(total)
    return {label + "_" + k if k != "n" else "n": (round(v, 2) if k != "n" else v) for k, v in comp.items()}


def build_epcv_indicators(epcv: pd.DataFrame) -> pd.DataFrame:
    kids = age_group6_14(epcv)
    rows = []
    for wilaya, grp in epcv.groupby("wilaya"):
        kgrp = kids[kids["wilaya"] == wilaya]
        rec = {"wilaya": wilaya}

        rec["effectif_enquete"] = int(len(grp))
        rec["part_enfants_6_14"] = round(len(kgrp) / len(grp) * 100, 2)
        rec["taux_pauvrete"] = round(grp["pauvre"].mean() * 100, 2)
        rec["part_rurale"] = round((grp["milieu"] == "Rural").mean() * 100, 2)
        rec["taux_chomage"] = round(grp["chomage"].mean() * 100, 2)
        rec["part_cm_sans_education"] = round((grp["nivcm"] == "Aucun").mean() * 100, 2)

        rec.update(educ_composition(kgrp, "scol"))

        # gender gap among children 6-14
        if len(kgrp) > 0:
            g = (kgrp["sexe"] == "Masculin").mean()
            rec["part_garcons_6_14"] = round(g * 100, 2)
            masc = kgrp[kgrp["sexe"] == "Masculin"]
            fem = kgrp[kgrp["sexe"] == "Féminin"]
            if len(masc):
                rec["hors_ecole_garcons"] = round(
                    ((masc["educ_statut"] != "Oui Ecole formelle uniquement")
                     & (~masc["educ_statut"].isin(["Oui Ecole formelle et enseignement coranique"]))).mean() * 100, 2)
            if len(fem):
                rec["hors_ecole_filles"] = round(
                    ((fem["educ_statut"] != "Oui Ecole formelle uniquement")
                     & (~fem["educ_statut"].isin(["Oui Ecole formelle et enseignement coranique"]))).mean() * 100, 2)
            rec["ecart_genre_hors_ecole"] = round(rec["hors_ecole_garcons"] - rec["hors_ecole_filles"], 2)

        # composition by milieu for children 6-14
        if len(kgrp) > 0:
            urb = kgrp[kgrp["milieu"] == "Urbain"]
            rur = kgrp[kgrp["milieu"] == "Rural"]
            if len(urb):
                rec.update(educ_composition(urb, "scol_urbain"))
            if len(rur):
                rec.update(educ_composition(rur, "scol_rural"))

        rows.append(rec)
    df = pd.DataFrame(rows).sort_values("wilaya").reset_index(drop=True)
    return df


# ---- 2. HDX population ------------------------------------------------------
def load_hdx_pop() -> pd.DataFrame:
    df = pd.read_csv(f"{RAW}/mrt_admpop_adm1_2022.csv")
    out = []
    for _, r in df.iterrows():
        out.append(
            {
                "wilaya": canonical(r["ADM1_EN"]),
                "population_2022": int(r["T_TL"]),
                "pop_6_14_2022": int(r["T_05_09"] + r["T_10_14"]),
                "pop_0_14_2022": int(r["T_00_04"] + r["T_05_09"] + r["T_10_14"]),
                "pop_15_64_2022": int(r["T_15_19"] + r["T_20_24"] + r["T_25_29"] + r["T_30_34"]
                                        + r["T_35_39"] + r["T_40_44"] + r["T_45_49"] + r["T_50_54"]
                                        + r["T_55_59"] + r["T_60_64"]),
                "part_0_14_pct": round((r["T_00_04"] + r["T_05_09"] + r["T_10_14"]) / r["T_TL"] * 100, 2),
                "ratio_dependance_jeunes": round(
                    (r["T_00_04"] + r["T_05_09"] + r["T_10_14"]) / max(
                        r["T_15_19"] + r["T_20_24"] + r["T_25_29"] + r["T_30_34"]
                        + r["T_35_39"] + r["T_40_44"] + r["T_45_49"] + r["T_50_54"]
                        + r["T_55_59"] + r["T_60_64"], 1) * 100, 1),
                "garcons_6_14": int(r["M_05_09"] + r["M_10_14"]),
                "filles_6_14": int(r["F_05_09"] + r["F_10_14"]),
            }
        )
    return pd.DataFrame(out)


# ---- 3. OSM schools ---------------------------------------------------------
def load_osm_schools() -> pd.DataFrame:
    d = json.load(open(f"{RAW}/education_facilities.geojson"))
    rows = []
    for f in d["features"]:
        p = f["properties"]
        if p.get("amenity") not in ("school", "kindergarten", "college", "university"):
            continue
        w = canonical(p.get("adm1_name"))
        if w is None:
            continue
        rows.append({"wilaya": w})
    sdf = pd.DataFrame(rows)
    return sdf.groupby("wilaya").size().rename("nb_etablissements").reset_index()


# ---- 4. merge ---------------------------------------------------------------
def build_master() -> pd.DataFrame:
    epcv = load_epcv()
    epcv_ind = build_epcv_indicators(epcv)
    pop = load_hdx_pop()
    sch = load_osm_schools()

    master = epcv_ind.merge(pop, on="wilaya", how="outer")
    master = master.merge(sch, on="wilaya", how="left")
    master["nb_etablissements"] = master["nb_etablissements"].fillna(0).astype(int)
    master = master.sort_values("wilaya").reset_index(drop=True)

    # absolute numbers: rate -> effectifs
    master["enfants_hors_ecole"] = np.round(
        master["scol_Hors_ecole_formelle"] / 100 * master["pop_6_14_2022"]
    ).astype(int)
    master["enfants_formel"] = np.round(
        master["scol_Formel"] / 100 * master["pop_6_14_2022"]
    ).astype(int)
    master["enfants_mahadra"] = np.round(
        master["scol_Mahadra_trad"] / 100 * master["pop_6_14_2022"]
    ).astype(int)
    master["enfants_coranique"] = np.round(
        master["scol_Coranique"] / 100 * master["pop_6_14_2022"]
    ).astype(int)
    master["enfants_aucune_instruction"] = np.round(
        master["scol_Aucune instruction"] / 100 * master["pop_6_14_2022"]
    ).astype(int)
    master["ecoles_pour_1000_enfants"] = np.round(
        master["nb_etablissements"] / master["pop_6_14_2022"] * 1000, 2
    )
    return master


def build_geojson(master: pd.DataFrame) -> None:
    d = json.load(open(f"{RAW}/mrt_admin1.geojson"))
    features = []
    for f in d["features"]:
        name = canonical(f["properties"]["adm1_name"])
        f = dict(f)
        f["properties"] = dict(f["properties"])
        if name and name in set(master["wilaya"]):
            row = master[master["wilaya"] == name].iloc[0].to_dict()
            for k, v in row.items():
                f["properties"][k] = v
        features.append(f)
    d["features"] = features
    dump_json(f"{PROC}/mauritania_wilayas.geojson", d)
    print(f"  geojson: {len(features)} features")


def build_national(master: pd.DataFrame) -> dict:
    pop_6_14 = int(master["pop_6_14_2022"].sum())
    return {
        "wilayas": len(master),
        "population_totale_2022": int(master["population_2022"].sum()),
        "population_6_14_2022": pop_6_14,
        "enfants_hors_ecole_formelle": int(master["enfants_hors_ecole"].sum()),
        "taux_hors_ecole_national_pct": round(
            master["enfants_hors_ecole"].sum() / pop_6_14 * 100, 1),
        "taux_pauvrete_national_pct": round(
            master["taux_pauvrete"].mean(), 2),
        "enfants_mahadra": int(master["enfants_mahadra"].sum()),
        "enfants_aucune_instruction": int(master["enfants_aucune_instruction"].sum()),
        "nb_etablissements": int(master["nb_etablissements"].sum()),
    }


if __name__ == "__main__":
    import os
    os.makedirs(PROC, exist_ok=True)
    print("building master table...")
    master = build_master()
    master.to_csv(f"{PROC}/wilaya_features.csv", index=False)
    print(f"  wilaya_features.csv: {master.shape}")
    build_geojson(master)
    national = build_national(master)
    dump_json(f"{PROC}/national_summary.json", national, indent=2)
    print(f"  national_summary.json: {json.dumps(national, ensure_ascii=False)}")
    print(master[["wilaya", "population_2022", "taux_pauvrete", "scol_Hors_ecole_formelle",
                  "enfants_hors_ecole", "ratio_dependance_jeunes"]].to_string(index=False))
