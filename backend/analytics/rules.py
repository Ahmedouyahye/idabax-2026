"""Data mining : règles d'association (Apriori) sur les enfants 6-14 de l'EPCV.

Questions : quelles combinaisons de facteurs (âge, sexe, milieu, pauvreté,
région) sont associées à la non-scolarisation ?

Note méthodologique la variable `nivcm` (« Niveau d'éducation du CM ») n'est
PAS l'éducation parentale mais un regroupement du niveau d'instruction de
l'enfant lui-même. Les items `cm_sans_education` / `cm_education_traditionnelle`
qu'elle produisait généraient des règles tautologiques (confiance 100 %) : ils
sont retirés des transactions.
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
            "age_6_9": kids["B4"].between(6, 9),
            "age_10_14": kids["B4"].between(10, 14),
        }
    )
    wilaya = kids["wilaya"].map(REGION_GROUPS)
    out = pd.concat([out, pd.get_dummies(wilaya, prefix="region", dtype=bool)], axis=1)
    return out


def run_rules(min_support: float = 0.02, min_confidence: float = 0.55) -> dict:
    """Seuils : support 2 % (≈ 330 enfants, un sous-groupe qui pèse) et confiance 55 %
    (plus d'un enfant sur deux du profil est hors école). L'ancien couple
    (5 %, 60 %) n'était atteignable que grâce aux items tautologiques issus de
    `nivcm`, qui plafonnaient à 100 % de confiance ; sans eux, la confiance
    maximale réelle est de 0,70."""
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
    top_lift = out[out["confidence"] >= min_confidence].head(10).to_dict("records")
    # règles socio-démographiques pures (hors découpage régional) : elles disent
    # « quel profil d'enfant », indépendamment du territoire.
    top_confiance = (
        out[~out["antecedents_str"].str.contains("region_", regex=False)]
        .sort_values("confidence", ascending=False)
        .head(10)
        .to_dict("records")
    )
    by_region = (
        out[out["antecedents_str"].str.contains("region_", regex=False)]
        .sort_values("lift", ascending=False)
        .head(8)
        .to_dict("records")
    )
    return {
        "n_rules": int(len(rules)),
        "rules": top_lift,
        "top_confiance": top_confiance,
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
    print("--- top confiance (profils socio-démographiques) ---")
    for r in res["top_confiance"][:6]:
        print(f"  [{r['antecedents_str']}] -> [{r['consequents_str']}] "
              f"(conf={r['confidence']}, lift={r['lift']})")
