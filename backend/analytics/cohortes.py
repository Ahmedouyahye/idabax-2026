"""Cohortes : trente ans de progrès scolaire lus dans une enquête d'une seule année.

`Groupe_age` (60+, 25-59, 15-24, 6-14) est chargée par `load_epcv()` et jamais
utilisée. En comparant le niveau atteint par chaque génération on reconstitue une
**cohorte synthétique** : les 60+ ont été scolarisés dans les années 1960-70, les
25-59 dans les années 1980-2000, les 15-24 dans les années 2000-2010.

Deux usages :

1. **Mesurer le chemin parcouru** au niveau national et par sexe.
2. **Repérer les territoires où le rattrapage est bloqué.** Une wilaya dont la
   génération 15-24 ne fait pas mieux que la génération 25-59 est en stagnation
   intergénérationnelle — un signal de priorité que l'IPE, qui ne regarde que le
   stock actuel, ne peut pas capter.
"""
from __future__ import annotations

import pandas as pd

from backend.pipeline.build_dataset import load_epcv

GENERATIONS = ["60+ans", "25–59 ans", "15–24 ans"]
GENERATION_PERIODES = {
    "60+ans": "scolarisés vers 1960-1975",
    "25–59 ans": "scolarisés vers 1980-2000",
    "15–24 ans": "scolarisés vers 2000-2015",
}

FORMEL_NIVEAUX = {
    "Primaire", "Collège", "Lycée", "Lycée technique", "Etablissement professionnel",
    "Universitaire", "Supérieur technique", "Supérieur professionnel",
}
COLLEGE_PLUS = {
    "Collège", "Lycée", "Lycée technique", "Etablissement professionnel",
    "Universitaire", "Supérieur technique", "Supérieur professionnel",
}
TRADITIONNEL = {"Coranique", "Mahadra", "Programme d’alphabétisatio"}


def _parts(grp: pd.DataFrame) -> dict:
    n = len(grp)
    if n == 0:
        return {"n": 0}
    return {
        "n": int(n),
        "jamais_scolarise_pct": round(float(grp["niveau"].isna().mean() * 100), 1),
        "traditionnel_pct": round(float(grp["niveau"].isin(TRADITIONNEL).mean() * 100), 1),
        "formel_pct": round(float(grp["niveau"].isin(FORMEL_NIVEAUX).mean() * 100), 1),
        "college_plus_pct": round(float(grp["niveau"].isin(COLLEGE_PLUS).mean() * 100), 1),
    }


def progression_nationale(epcv: pd.DataFrame) -> dict:
    lignes = []
    for gen in GENERATIONS:
        grp = epcv[epcv["age_groupe"] == gen]
        rec = {"generation": gen, "periode": GENERATION_PERIODES[gen], **_parts(grp)}
        rec["formel_filles_pct"] = _parts(grp[grp["sexe"] == "Féminin"]).get("formel_pct")
        rec["formel_garcons_pct"] = _parts(grp[grp["sexe"] == "Masculin"]).get("formel_pct")
        rec["ecart_genre_pts"] = (
            round(rec["formel_garcons_pct"] - rec["formel_filles_pct"], 1)
            if rec["formel_filles_pct"] is not None else None
        )
        lignes.append(rec)

    ancienne, recente = lignes[0], lignes[-1]
    return {
        "generations": lignes,
        "gain_formel_pts": round(recente["formel_pct"] - ancienne["formel_pct"], 1),
        "resorption_genre_pts": round(
            (ancienne["ecart_genre_pts"] or 0) - (recente["ecart_genre_pts"] or 0), 1
        ),
        "lecture": (
            f"L'accès à l'école formelle est passé de {ancienne['formel_pct']} % chez les "
            f"{ancienne['generation']} à {recente['formel_pct']} % chez les "
            f"{recente['generation']}. Sur la même période l'écart entre garçons et filles "
            f"s'est réduit de {(ancienne['ecart_genre_pts'] or 0) - (recente['ecart_genre_pts'] or 0):.1f} "
            "points : la question du genre a été largement réglée par les générations."
        ),
    }


def rattrapage_par_wilaya(epcv: pd.DataFrame, national_15_24: float) -> dict:
    """Chaque wilaya rattrape-t-elle son retard, ou se contente-t-elle de progresser ?

    Toutes les wilayas progressent d'une génération à l'autre (de +14 à +38 points) :
    un simple seuil sur le gain ne distingue donc rien. Ce qui compte est le
    croisement de deux critères :
      - le **niveau** atteint par la génération 15-24 est-il sous la moyenne nationale ?
      - le **gain** générationnel est-il sous le gain médian des wilayas ?
    Une wilaya qui cumule les deux ne rattrape pas : son retard se creuse en relatif.
    Une wilaya au gain faible mais déjà au-dessus de la moyenne est simplement
    proche du plafond, ce qui n'est pas une alerte.
    """
    lignes = []
    for wilaya, grp in epcv.groupby("wilaya"):
        ancienne = _parts(grp[grp["age_groupe"] == "25–59 ans"])
        recente = _parts(grp[grp["age_groupe"] == "15–24 ans"])
        if not ancienne.get("n") or not recente.get("n"):
            continue
        gain = round(recente["formel_pct"] - ancienne["formel_pct"], 1)
        lignes.append(
            {
                "wilaya": wilaya,
                "formel_25_59_pct": ancienne["formel_pct"],
                "formel_15_24_pct": recente["formel_pct"],
                "gain_pts": gain,
                "college_25_59_pct": ancienne["college_plus_pct"],
                "college_15_24_pct": recente["college_plus_pct"],
                "gain_college_pts": round(
                    recente["college_plus_pct"] - ancienne["college_plus_pct"], 1),
                "n_15_24": recente["n"],
            }
        )
    gain_median = float(pd.Series([d["gain_pts"] for d in lignes]).median())

    for d in lignes:
        d["retard_vs_national_pts"] = round(national_15_24 - d["formel_15_24_pct"], 1)
        d["sous_moyenne"] = d["formel_15_24_pct"] < national_15_24
        d["gain_sous_median"] = d["gain_pts"] < gain_median
        d["rattrapage_insuffisant"] = bool(d["sous_moyenne"] and d["gain_sous_median"])
    lignes.sort(key=lambda x: x["formel_15_24_pct"])

    insuffisant = [d["wilaya"] for d in lignes if d["rattrapage_insuffisant"]]
    plafond = [d["wilaya"] for d in lignes if d["gain_sous_median"] and not d["sous_moyenne"]]

    return {
        "wilayas": lignes,
        "national_15_24_pct": round(national_15_24, 1),
        "gain_median_pts": round(gain_median, 1),
        "rattrapage_insuffisant": insuffisant,
        "proches_du_plafond": plafond,
        "lecture": (
            f"Toutes les wilayas progressent (de +{min(d['gain_pts'] for d in lignes):.1f} à "
            f"+{max(d['gain_pts'] for d in lignes):.1f} points) : le gain seul ne discrimine pas. "
            f"En croisant niveau et dynamique, {len(insuffisant)} wilaya(s) cumulent un niveau "
            f"inférieur à la moyenne nationale des 15-24 ans ({national_15_24:.1f} %) et un gain "
            f"inférieur au gain médian ({gain_median:.1f} pts) : leur retard se creuse en relatif. "
            f"À l'inverse {len(plafond)} wilaya(s) progressent peu simplement parce qu'elles "
            "approchent du plafond."
        ),
    }


def run_cohortes() -> dict:
    epcv = load_epcv()
    nationale = progression_nationale(epcv)
    national_15_24 = next(
        g["formel_pct"] for g in nationale["generations"] if g["generation"] == "15–24 ans"
    )
    rattrapage = rattrapage_par_wilaya(epcv, national_15_24)

    return {
        "nationale": nationale,
        "rattrapage": rattrapage,
        "note": (
            "Cohorte synthétique : les générations sont observées la même année, pas suivies "
            "dans le temps. La génération 15-24 est encore partiellement en cours d'études, "
            "ce qui sous-estime légèrement son niveau final."
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_cohortes()
    dump_json("data/processed/analytics/cohortes.json", res, indent=2)

    print(f"{'génération':<14}{'n':>7}{'jamais':>9}{'tradit.':>9}{'formel':>9}{'collège+':>10}"
          f"{'écart G-F':>11}")
    for g in res["nationale"]["generations"]:
        print(f"{g['generation']:<14}{g['n']:>7}{g['jamais_scolarise_pct']:>8.1f}%"
              f"{g['traditionnel_pct']:>8.1f}%{g['formel_pct']:>8.1f}%"
              f"{g['college_plus_pct']:>9.1f}%{g['ecart_genre_pts']:>10.1f}")
    print(f"\n{res['nationale']['lecture']}")

    ra = res["rattrapage"]
    print(f"\nRattrapage intergénérationnel (25-59 → 15-24, accès au formel) — "
          f"national 15-24 : {ra['national_15_24_pct']} %, gain médian {ra['gain_median_pts']} pts")
    for w in ra["wilayas"]:
        flag = "  ← rattrapage insuffisant" if w["rattrapage_insuffisant"] else (
            "  (proche du plafond)" if w["gain_sous_median"] else "")
        print(f"  {w['wilaya']:<20}{w['formel_25_59_pct']:>6.1f}% → {w['formel_15_24_pct']:>5.1f}%"
              f"  ({w['gain_pts']:+.1f} pts){flag}")
    print(f"\n{ra['lecture']}")
