"""Parcours scolaire : retard, pyramide des niveaux, survie éducative.

La variable `niveau` (C4N, 13 modalités) est chargée par `load_epcv()` depuis le
début du projet mais n'a jamais été exploitée. Elle porte pourtant la seule
information disponible sur ce qui se passe **après** l'entrée à l'école.

Trois lectures :

1. **Retard scolaire** en Mauritanie le primaire couvre normalement 6-11 ans et
   le collège 12-15 ans. Un enfant de 12 ans ou plus encore au primaire est en
   retard. Ce retard est massif et invisible dans les indicateurs actuels, qui
   ne comptent que la présence à l'école.
2. **Pyramide des niveaux** répartition par niveau atteint à chaque âge de 6 à
   24 ans : on voit où le flux se rétrécit.
3. **Survie éducative** part d'une cohorte (15-24 ans) atteignant chaque palier.
   C'est le complément indispensable de l'indicateur d'accès : entrer à l'école
   ne dit rien de la distance parcourue.
"""
from __future__ import annotations

import pandas as pd

from backend.pipeline.build_dataset import age_group6_14, load_epcv

FORMEL = {"Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"}

# Structure du système mauritanien
AGE_ENTREE = 6
DUREE_PRIMAIRE = 6           # 6-11 ans
AGE_COLLEGE = AGE_ENTREE + DUREE_PRIMAIRE  # 12 ans

PALIERS = ["Primaire", "Collège", "Lycée", "Supérieur"]
SUPERIEUR = {"Universitaire", "Supérieur technique", "Supérieur professionnel"}
SECONDAIRE_2 = {"Lycée", "Lycée technique", "Etablissement professionnel"}


def _en_retard(row) -> bool:
    """Élève d'au moins 12 ans encore inscrit au primaire."""
    return bool(row["age"] >= AGE_COLLEGE and row["niveau"] == "Primaire")


def retard_scolaire(kids: pd.DataFrame) -> dict:
    """Ampleur du retard parmi les enfants effectivement scolarisés dans le formel."""
    inscrits = kids[kids["educ_statut"].isin(FORMEL)].copy()
    inscrits["en_retard"] = inscrits.apply(_en_retard, axis=1)

    # concerne uniquement les âges où le retard est définissable (12-14 ans)
    concernes = inscrits[inscrits["age"] >= AGE_COLLEGE]

    par_age = []
    for age, grp in inscrits.groupby("age"):
        prim = int((grp["niveau"] == "Primaire").sum())
        coll = int((grp["niveau"] == "Collège").sum())
        par_age.append(
            {
                "age": int(age),
                "n": int(len(grp)),
                "primaire": prim,
                "college": coll,
                "part_primaire_pct": round(prim / len(grp) * 100, 1),
                "en_retard_pct": round(float(grp.apply(_en_retard, axis=1).mean() * 100), 1)
                if age >= AGE_COLLEGE else None,
            }
        )

    def _taux(grp: pd.DataFrame) -> float | None:
        if len(grp) == 0:
            return None
        return round(float(grp["en_retard"].mean() * 100), 1)

    par_wilaya = []
    for wilaya, grp in concernes.groupby("wilaya"):
        par_wilaya.append(
            {
                "wilaya": wilaya,
                "n": int(len(grp)),
                "retard_pct": _taux(grp),
                "retard_urbain_pct": _taux(grp[grp["milieu"] == "Urbain"]),
                "retard_rural_pct": _taux(grp[grp["milieu"] == "Rural"]),
                "retard_filles_pct": _taux(grp[grp["sexe"] == "Féminin"]),
                "retard_garcons_pct": _taux(grp[grp["sexe"] == "Masculin"]),
            }
        )
    par_wilaya.sort(key=lambda w: -(w["retard_pct"] or 0))

    return {
        "n_scolarises_6_14": int(len(inscrits)),
        "n_ages_concernes": int(len(concernes)),
        "retard_national_pct": _taux(concernes),
        "retard_urbain_pct": _taux(concernes[concernes["milieu"] == "Urbain"]),
        "retard_rural_pct": _taux(concernes[concernes["milieu"] == "Rural"]),
        "retard_filles_pct": _taux(concernes[concernes["sexe"] == "Féminin"]),
        "retard_garcons_pct": _taux(concernes[concernes["sexe"] == "Masculin"]),
        "par_age": par_age,
        "par_wilaya": par_wilaya,
        "definition": (
            f"Est compté en retard tout élève d'au moins {AGE_COLLEGE} ans encore inscrit au "
            f"primaire, celui-ci couvrant normalement {AGE_ENTREE}-{AGE_COLLEGE - 1} ans "
            f"({DUREE_PRIMAIRE} années d'études)."
        ),
    }


def pyramide_niveaux(epcv: pd.DataFrame, age_min: int = 6, age_max: int = 24) -> dict:
    """Répartition par niveau atteint, âge par âge : où le flux se rétrécit."""
    sub = epcv[(epcv["age"] >= age_min) & (epcv["age"] <= age_max)].copy()

    def regroupe(n) -> str:
        if pd.isna(n):
            return "Jamais scolarisé"
        if n in SUPERIEUR:
            return "Supérieur"
        if n in SECONDAIRE_2:
            return "Lycée"
        if n in ("Coranique", "Mahadra", "Programme d’alphabétisatio"):
            return "Traditionnel"
        if n in ("Garderie/ Jardin des enfants", "Ne sait pas"):
            return "Préscolaire / NSP"
        return str(n)

    sub["palier"] = sub["niveau"].map(regroupe)
    ordre = ["Jamais scolarisé", "Traditionnel", "Préscolaire / NSP", "Primaire",
             "Collège", "Lycée", "Supérieur"]

    lignes = []
    for age, grp in sub.groupby("age"):
        rec = {"age": int(age), "n": int(len(grp))}
        for p in ordre:
            rec[p] = round(float((grp["palier"] == p).mean() * 100), 1)
        lignes.append(rec)

    return {"ordre": ordre, "par_age": lignes}


def survie_educative(epcv: pd.DataFrame) -> dict:
    """Part d'une cohorte 15-24 ans atteignant chaque palier (pseudo-cohorte).

    Lecture en entonnoir : sur 100 jeunes de 15-24 ans, combien ont atteint le
    primaire, le collège, le lycée, le supérieur ? Chaque palier inclut les
    paliers supérieurs (un lycéen a nécessairement fait le collège).
    """
    coh = epcv[(epcv["age"] >= 15) & (epcv["age"] <= 24)]
    n = len(coh)

    atteint = {
        "Primaire": coh["niveau"].isin(
            {"Primaire", "Collège", *SECONDAIRE_2, *SUPERIEUR}).mean(),
        "Collège": coh["niveau"].isin({"Collège", *SECONDAIRE_2, *SUPERIEUR}).mean(),
        "Lycée": coh["niveau"].isin({*SECONDAIRE_2, *SUPERIEUR}).mean(),
        "Supérieur": coh["niveau"].isin(SUPERIEUR).mean(),
    }

    etapes = []
    precedent = None
    for palier in PALIERS:
        part = float(atteint[palier] * 100)
        etape = {
            "palier": palier,
            "part_cohorte_pct": round(part, 1),
            "effectif_echantillon": int(round(part / 100 * n)),
        }
        if precedent is not None and precedent > 0:
            etape["transition_depuis_precedent_pct"] = round(part / precedent * 100, 1)
            etape["perte_pts"] = round(precedent - part, 1)
        etapes.append(etape)
        precedent = part

    # déclinaison par sexe et milieu sur le palier collège (le verrou principal)
    def part_college(grp: pd.DataFrame) -> float:
        if len(grp) == 0:
            return 0.0
        return round(float(grp["niveau"].isin({"Collège", *SECONDAIRE_2, *SUPERIEUR}).mean() * 100), 1)

    ecarts = {
        "filles": part_college(coh[coh["sexe"] == "Féminin"]),
        "garcons": part_college(coh[coh["sexe"] == "Masculin"]),
        "urbain": part_college(coh[coh["milieu"] == "Urbain"]),
        "rural": part_college(coh[coh["milieu"] == "Rural"]),
        "pauvre": part_college(coh[coh["pauvre"].astype(bool)]),
        "non_pauvre": part_college(coh[~coh["pauvre"].astype(bool)]),
    }

    par_wilaya = [
        {"wilaya": w, "college_pct": part_college(g), "n": int(len(g))}
        for w, g in coh.groupby("wilaya")
    ]
    par_wilaya.sort(key=lambda x: -x["college_pct"])

    return {
        "n_cohorte_15_24": int(n),
        "etapes": etapes,
        "ecarts_college": ecarts,
        "par_wilaya": par_wilaya,
        "note": (
            "Pseudo-cohorte : les 15-24 ans observés en 2019 ne sont pas une vraie cohorte "
            "suivie dans le temps, et une partie d'entre eux est encore en cours d'études. "
            "Les parts atteignant le lycée et le supérieur sont donc sous-estimées pour les "
            "plus jeunes de la tranche."
        ),
    }


def run_parcours() -> dict:
    epcv = load_epcv()
    kids = age_group6_14(epcv)
    return {
        "retard": retard_scolaire(kids),
        "pyramide": pyramide_niveaux(epcv),
        "survie": survie_educative(epcv),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_parcours()
    dump_json("data/processed/analytics/parcours.json", res, indent=2)

    r = res["retard"]
    print(f"Retard scolaire : {r['retard_national_pct']} % des élèves de 12-14 ans "
          f"sont encore au primaire ({r['n_ages_concernes']} élèves concernés)")
    print(f"  rural {r['retard_rural_pct']} % / urbain {r['retard_urbain_pct']} %  |  "
          f"filles {r['retard_filles_pct']} % / garçons {r['retard_garcons_pct']} %")
    print("  âge par âge :")
    for a in r["par_age"]:
        if a["en_retard_pct"] is not None:
            print(f"    {a['age']} ans : {a['primaire']:>5} au primaire / {a['college']:>5} au collège "
                  f"→ {a['en_retard_pct']} % en retard")
    print("  wilayas les plus touchées :")
    for w in r["par_wilaya"][:4]:
        print(f"    {w['wilaya']:<20} {w['retard_pct']:>5} %  (n={w['n']})")

    s = res["survie"]
    print(f"\nSurvie éducative (cohorte 15-24, n={s['n_cohorte_15_24']}) :")
    for e in s["etapes"]:
        trans = e.get("transition_depuis_precedent_pct")
        suffix = f"  (transition {trans} %, −{e['perte_pts']} pts)" if trans else ""
        print(f"    {e['palier']:<14} {e['part_cohorte_pct']:>5} % de la cohorte{suffix}")
    ec = s["ecarts_college"]
    print(f"  accès au collège : rural {ec['rural']} % vs urbain {ec['urbain']} % | "
          f"pauvre {ec['pauvre']} % vs non pauvre {ec['non_pauvre']} % | "
          f"filles {ec['filles']} % vs garçons {ec['garcons']} %")
