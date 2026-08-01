"""Data mining : règles d'association (Apriori) sur les enfants 6-14 de l'EPCV.

Questions : quelles combinaisons de facteurs (milieu, pauvreté, éducation du
chef de ménage, région) sont associées à la non-scolarisation ?
"""
from __future__ import annotations

import json

import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules

REGION_GROUPS = {
    1: "Est", 2: "Est", 3: "Sud-Est",
    4: "Sud", 10: "Sud", 5: "Sud", 6: "Sud-Ouest",
    9: "Centre", 7: "Nord", 12: "Nord", 11: "Nord",
    8: "Nord", 13: "Nouakchott",
}


def prepare_transactions(epcv_path: str = "data/raw/EPCV2019_60600_individuals.sav") -> pd.DataFrame:
    import pyreadstat

    df, meta = pyreadstat.read_sav(epcv_path)
    kids = df[(df["B4"] >= 6) & (df["B4"] <= 14)].copy()
    labels = meta.variable_value_labels

    def lab(col: str):
        return kids[col].map(labels.get(col, {}))

    out = pd.DataFrame(
        {
            "hors_ecole": (~kids["C2"].isin([3.0, 4.0])),
            "sexe_feminin": lab("B2").eq("Féminin"),
            "milieu_rural": lab("milieu").eq("Rural"),
            "pauvre": kids["pauv"].astype(bool),
            "cm_sans_education": lab("nivcm").eq("Aucun"),
            "cm_education_traditionnelle": lab("nivcm").isin(["traditionnel", "alphabétisation"]),
            "age_6_9": kids["B4"].between(6, 9),
            "age_10_14": kids["B4"].between(10, 14),
        }
    )
    wilaya = kids["wilaya"].map(REGION_GROUPS)
    out = pd.concat([out, pd.get_dummies(wilaya, prefix="region", dtype=bool)], axis=1)
    return out


def run_rules(min_support: float = 0.05, min_confidence: float = 0.60) -> dict:
    trans = prepare_transactions()
    freq = apriori(trans, min_support=min_support, use_colnames=True)
    rules = association_rules(freq, metric="confidence", min_threshold=0.50)
    # garder uniquement les règles dont la conséquence est exactement {hors_ecole}
    mask = rules["consequents"].apply(lambda s: s == frozenset({"hors_ecole"}))
    rules = rules[mask].copy()
    rules = rules[rules["lift"] > 1.05].copy()

    def fmt(s) -> str:
        return " & ".join(sorted(str(x) for x in s))

    rules["antecedents_str"] = rules["antecedents"].apply(fmt)
    rules["consequents_str"] = rules["consequents"].apply(fmt)
    rules["lift"] = rules["lift"].round(2)
    rules["confidence"] = rules["confidence"].round(3)
    rules["support"] = rules["support"].round(3)

    out = (
        rules[["antecedents_str", "consequents_str", "support", "confidence", "lift"]]
        .sort_values("lift", ascending=False)
    )
    top_lift = out[out["confidence"] >= 0.6].head(10).to_dict("records")
    no_cm = out[
        ~out["antecedents_str"].str.contains("cm_", regex=False)
    ].head(10).to_dict("records")
    by_region = (
        out[out["antecedents_str"].str.contains("region_", regex=False)]
        .sort_values("lift", ascending=False)
        .head(8)
        .to_dict("records")
    )
    return {
        "n_rules": int(len(rules)),
        "rules": top_lift,
        "sans_cm": no_cm,
        "par_region": by_region,
        "n_children_6_14": int(len(trans)),
    }


if __name__ == "__main__":
    res = run_rules()
    with open("data/processed/analytics/regles_association.json", "w") as fh:
        json.dump(res, fh, ensure_ascii=False, indent=2)
    print(f"{res['n_rules']} règles sur {res['n_children_6_14']} enfants 6-14")
    print("--- top lift ---")
    for r in res["rules"][:6]:
        print(f"  [{r['antecedents_str']}] -> [{r['consequents_str']}] "
              f"(conf={r['confidence']}, lift={r['lift']})")
    print("--- sans variable CM ---")
    for r in res["sans_cm"][:6]:
        print(f"  [{r['antecedents_str']}] -> [{r['consequents_str']}] "
              f"(conf={r['confidence']}, lift={r['lift']})")
