"""Mesures d'équité décomposables.

`concentration.py` répond déjà à « où sont les enfants hors école ». Ce module
répond à trois questions différentes, que le Gini ne sait pas traiter :

1. **Theil (T)** : l'exclusion est-elle un problème *entre* territoires ou
   *à l'intérieur* de chaque territoire (fracture urbain/rural) ? Le Theil est
   additivement décomposable, contrairement au Gini.
2. **Human Opportunity Index** (Banque mondiale) : quelle part de l'accès à
   l'école formelle est distribuée indépendamment des circonstances que l'enfant
   ne choisit pas (wilaya, milieu, pauvreté du ménage, sexe) ?
   HOI = couverture × (1 − D), où D est l'indice de dissimilarité.
3. **Adéquation offre / besoin** : les 494 établissements recensés sont-ils là où
   sont les enfants ? Indice de dissimilarité écoles/enfants et courbe de
   concentration de l'offre en fonction du besoin.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

from backend.pipeline.build_dataset import age_group6_14, load_epcv

FORMEL = {"Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"}


# ---------------------------------------------------------------------------
# 1. Theil décomposé
# ---------------------------------------------------------------------------
def _theil_T(y: np.ndarray, n: np.ndarray) -> float:
    """Theil T sur des taux y pondérés par les effectifs n."""
    mask = (y > 0) & (n > 0)
    y, n = y[mask], n[mask]
    if len(y) == 0:
        return 0.0
    ybar = np.average(y, weights=n)
    share = n / n.sum()
    return float((share * (y / ybar) * np.log(y / ybar)).sum())


def theil_decomposition(kids: pd.DataFrame) -> dict:
    """Décompose l'inégalité d'exclusion entre wilayas et à l'intérieur (urbain/rural)."""
    kids = kids.copy()
    kids["hors"] = (~kids["educ_statut"].isin(FORMEL)).astype(float)

    cells = (
        kids.groupby(["wilaya", "milieu"])["hors"]
        .agg(taux="mean", n="size")
        .reset_index()
    )
    cells["taux"] *= 100

    total = _theil_T(cells["taux"].to_numpy(), cells["n"].to_numpy())

    # composante inter-wilaya : chaque wilaya réduite à son taux moyen
    par_wilaya = kids.groupby("wilaya")["hors"].agg(taux="mean", n="size").reset_index()
    par_wilaya["taux"] *= 100
    between = _theil_T(par_wilaya["taux"].to_numpy(), par_wilaya["n"].to_numpy())

    within = total - between
    ybar = np.average(par_wilaya["taux"], weights=par_wilaya["n"])

    # contribution de chaque wilaya à la composante intra
    contribs = []
    for wilaya, grp in cells.groupby("wilaya"):
        n_w = grp["n"].sum()
        y_w = float(np.average(grp["taux"], weights=grp["n"]))
        t_w = _theil_T(grp["taux"].to_numpy(), grp["n"].to_numpy())
        contribs.append(
            {
                "wilaya": wilaya,
                "theil_interne": round(t_w, 4),
                "contribution_intra": round(float(n_w / cells["n"].sum() * (y_w / ybar) * t_w), 5),
                "taux_urbain": round(float(grp[grp["milieu"] == "Urbain"]["taux"].mean()), 1)
                if (grp["milieu"] == "Urbain").any() else None,
                "taux_rural": round(float(grp[grp["milieu"] == "Rural"]["taux"].mean()), 1)
                if (grp["milieu"] == "Rural").any() else None,
            }
        )
        last = contribs[-1]
        if last["taux_urbain"] is not None and last["taux_rural"] is not None:
            last["ecart_urbain_rural"] = round(last["taux_rural"] - last["taux_urbain"], 1)
        else:
            last["ecart_urbain_rural"] = None
    contribs.sort(key=lambda c: -c["contribution_intra"])

    return {
        "theil_total": round(total, 4),
        "theil_inter_wilaya": round(between, 4),
        "theil_intra_wilaya": round(within, 4),
        "part_inter_pct": round(between / total * 100, 1) if total else None,
        "part_intra_pct": round(within / total * 100, 1) if total else None,
        "par_wilaya": contribs,
        "lecture": (
            f"{round(between / total * 100)} % de l'inégalité d'exclusion se joue entre les wilayas, "
            f"{round(within / total * 100)} % à l'intérieur de chacune (fracture urbain/rural). "
            "Un ciblage purement territorial ne peut donc pas atteindre la totalité du problème."
        ) if total else "",
    }


# ---------------------------------------------------------------------------
# 2. Human Opportunity Index
# ---------------------------------------------------------------------------
def human_opportunity_index(kids: pd.DataFrame) -> dict:
    """HOI = C × (1 − D) sur l'accès à l'école formelle des 6-14 ans.

    Les « circonstances » sont strictement les caractéristiques que l'enfant ne
    choisit pas et qui ne relèvent pas du cycle de vie : wilaya, milieu, pauvreté
    du ménage, sexe. D mesure l'écart moyen entre les probabilités d'accès
    prédites et la couverture moyenne : plus D est grand, plus l'accès dépend
    d'où et de qui l'on naît.

    La tranche d'âge est volontairement **exclue** des circonstances : à 6-7 ans
    une partie des enfants n'est pas encore entrée à l'école, ce qui est un effet
    de calendrier et non une inégalité d'opportunité. L'inclure gonflerait D
    artificiellement (de 0,090 à 0,110 sur ces données). C'est aussi la raison
    pour laquelle la Banque mondiale calcule le HOI sur des bandes d'âge étroites.
    """
    df = kids.copy()
    df["acces"] = df["educ_statut"].isin(FORMEL).astype(int)

    X = pd.get_dummies(
        pd.DataFrame(
            {
                "wilaya": df["wilaya"],
                "milieu": df["milieu"],
                "pauvre": df["pauvre"].astype(int).astype(str),
                "sexe": df["sexe"],
            }
        ),
        drop_first=True,
        dtype=float,
    )
    y = df["acces"].to_numpy()

    model = LogisticRegression(max_iter=1000, C=1e6).fit(X, y)
    p = model.predict_proba(X)[:, 1]

    C = float(y.mean())
    D = float(np.abs(p - C).sum() / (2 * len(p) * C))
    hoi = C * (1 - D)

    # contribution de chaque circonstance : perte de HOI si on la retire du modèle
    contributions = []
    groups = {
        "Wilaya": [c for c in X.columns if c.startswith("wilaya_")],
        "Milieu (urbain/rural)": [c for c in X.columns if c.startswith("milieu_")],
        "Pauvreté du ménage": [c for c in X.columns if c.startswith("pauvre_")],
        "Sexe": [c for c in X.columns if c.startswith("sexe_")],
    }
    for label, cols in groups.items():
        if not cols:
            continue
        Xr = X.drop(columns=cols)
        pr = LogisticRegression(max_iter=1000, C=1e6).fit(Xr, y).predict_proba(Xr)[:, 1]
        Dr = float(np.abs(pr - C).sum() / (2 * len(pr) * C))
        contributions.append(
            {"circonstance": label, "d_index_sans": round(Dr, 4), "part_de_D_pct": round((D - Dr) / D * 100, 1)}
        )
    contributions.sort(key=lambda c: -c["part_de_D_pct"])

    # HOI par wilaya (couverture locale × (1 − D national))
    par_wilaya = []
    for wilaya, grp in df.groupby("wilaya"):
        c_w = float(grp["acces"].mean())
        par_wilaya.append(
            {"wilaya": wilaya, "couverture_pct": round(c_w * 100, 1), "hoi_pct": round(c_w * (1 - D) * 100, 1)}
        )
    par_wilaya.sort(key=lambda p_: -p_["hoi_pct"])

    return {
        "couverture_pct": round(C * 100, 1),
        "d_index": round(D, 4),
        "hoi_pct": round(hoi * 100, 1),
        "penalite_inegalite_pts": round((C - hoi) * 100, 1),
        "contributions": contributions,
        "par_wilaya": par_wilaya,
        "lecture": (
            f"{round(C * 100, 1)} % des enfants de 6-14 ans ont accès à l'école formelle, mais une "
            f"fois corrigée de l'inégalité des circonstances cette couverture ne « vaut » que "
            f"{round(hoi * 100, 1)} % : {round((C - hoi) * 100, 1)} points sont perdus du seul fait "
            "que l'accès dépend d'où et de qui l'on naît."
        ),
    }


# ---------------------------------------------------------------------------
# 3. Adéquation offre / besoin
# ---------------------------------------------------------------------------
def offre_besoin(features: pd.DataFrame) -> dict:
    """L'offre scolaire est-elle répartie comme les enfants ? Comme le besoin ?"""
    df = features.copy()
    df["part_ecoles"] = df["nb_etablissements"] / df["nb_etablissements"].sum()
    df["part_enfants"] = df["pop_6_14_2022"] / df["pop_6_14_2022"].sum()
    df["part_hors_ecole"] = df["enfants_hors_ecole"] / df["enfants_hors_ecole"].sum()

    d_enfants = float(0.5 * (df["part_ecoles"] - df["part_enfants"]).abs().sum())
    d_besoin = float(0.5 * (df["part_ecoles"] - df["part_hors_ecole"]).abs().sum())

    # courbe de concentration : wilayas triées du besoin le plus fort au plus faible
    ordered = df.sort_values("scol_Hors_ecole_formelle", ascending=False).reset_index(drop=True)
    courbe = [{"x": 0.0, "ecoles": 0.0, "enfants": 0.0, "wilaya": None}]
    cum_e = cum_c = 0.0
    for i, r in ordered.iterrows():
        cum_e += r["part_ecoles"] * 100
        cum_c += r["part_hors_ecole"] * 100
        courbe.append(
            {
                "x": round((i + 1) / len(ordered) * 100, 1),
                "ecoles": round(cum_e, 1),
                "enfants": round(cum_c, 1),
                "wilaya": r["wilaya"],
            }
        )

    ecarts = (
        df.assign(ecart=(df["part_ecoles"] - df["part_hors_ecole"]) * 100)
        .sort_values("ecart")[["wilaya", "nb_etablissements", "enfants_hors_ecole", "ecart"]]
    )
    ecarts["ecart"] = ecarts["ecart"].round(2)

    return {
        "dissimilarite_ecoles_enfants": round(d_enfants, 3),
        "dissimilarite_ecoles_besoin": round(d_besoin, 3),
        "courbe_concentration": courbe,
        "ecarts": ecarts.to_dict("records"),
        "lecture": (
            f"Il faudrait redéployer {round(d_besoin * 100)} % des établissements pour que l'offre "
            "épouse la carte du hors-école, contre "
            f"{round(d_enfants * 100)} % pour qu'elle épouse simplement la carte des enfants : "
            "l'offre est mal alignée sur le besoin, pas seulement sur la population."
        ),
    }


def run_equity(features: pd.DataFrame | None = None) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/wilaya_features.csv")
    kids = age_group6_14(load_epcv())
    return {
        "n_children_6_14": int(len(kids)),
        "theil": theil_decomposition(kids),
        "hoi": human_opportunity_index(kids),
        "offre_besoin": offre_besoin(features),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_equity()
    dump_json("data/processed/analytics/equity.json", res, indent=2)

    t = res["theil"]
    print(f"Theil T = {t['theil_total']}  inter-wilaya {t['part_inter_pct']} % | "
          f"intra-wilaya {t['part_intra_pct']} %")
    print("  plus forte fracture urbain/rural :")
    for c in sorted(t["par_wilaya"], key=lambda c: -(c["ecart_urbain_rural"] or 0))[:4]:
        print(f"    {c['wilaya']:<20} urbain {c['taux_urbain']}% / rural {c['taux_rural']}% "
              f"(+{c['ecart_urbain_rural']} pts)")

    h = res["hoi"]
    print(f"\nHOI = {h['hoi_pct']} %  (couverture {h['couverture_pct']} %, D = {h['d_index']}, "
          f"pénalité {h['penalite_inegalite_pts']} pts)")
    for c in h["contributions"]:
        print(f"    {c['circonstance']:<24} {c['part_de_D_pct']:>5.1f} % de l'inégalité")

    o = res["offre_besoin"]
    print(f"\nDissimilarité écoles/enfants = {o['dissimilarite_ecoles_enfants']} | "
          f"écoles/besoin = {o['dissimilarite_ecoles_besoin']}")
    print("  wilayas les plus sous-dotées au regard du besoin :")
    for e in o["ecarts"][:4]:
        print(f"    {e['wilaya']:<20} {e['nb_etablissements']:>4} écoles pour "
              f"{e['enfants_hors_ecole']:>6} enfants hors école ({e['ecart']:+.2f} pt de part)")
