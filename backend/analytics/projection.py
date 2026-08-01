"""Projection démographique des 6-14 ans à l'horizon 2030.

`scenarios.py` fait varier le taux de hors-école mais **gèle la population 6-14
à son niveau de 2022**. Avec une croissance démographique de près de 3 % par an,
c'est la faille la plus coûteuse du modèle : le nombre d'enfants hors école peut
augmenter alors même que le taux baisse, et les besoins de construction sont
sous-estimés d'autant.

Ce module reconstruit la population scolarisable de 2030, puis rejoue les
scénarios sur cette base.

**Méthode.** Les enfants qui auront 6-14 ans en 2030 sont pour l'essentiel déjà
nés en 2022 : ceux qui auront 8 à 14 ans étaient âgés de 0 à 6 ans. Seules les
deux plus jeunes générations (6 et 7 ans en 2030) restent à naître. On procède
donc par composantes de cohorte :

    P(6-14 en 2030) = survivants des 0-6 ans de 2022  +  naissances 2023-2024 survivantes

Les cohortes d'âge simple sont dérivées des tranches quinquennales de la
projection HDX 2022 en supposant l'effectif uniforme à l'intérieur d'une tranche.
Les naissances futures sont estimées à partir de la cohorte 0-4 observée,
prolongée au taux de croissance démographique du WDI. Un facteur de survie
s'applique aux huit années de projection.

**Limite assumée** : sans tables de fécondité et de mortalité par wilaya, ce
n'est pas une projection démographique complète. C'est en revanche nettement
plus juste qu'une population constante, et la part déjà née (7 cohortes sur 10)
rend le résultat peu sensible aux hypothèses sur les naissances.

**Signalement** : la variable `pop_6_14_2022` du pipeline vaut en réalité
`T_05_09 + T_10_14`, c'est-à-dire les **5-14 ans** (10 générations) et non les
6-14 ans (9 générations). Comme le taux de hors-école est, lui, calculé sur les
6-14 ans de l'EPCV, l'effectif `enfants_hors_ecole` qui en découle est
surestimé d'environ un dixième. Ce module projette à périmètre identique pour
rester comparable au reste du tableau de bord, mais le point est documenté ici
et dans `docs/DATA_SOURCES.md` : le corriger ferait bouger le chiffre phare de
375 566 enfants.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from backend.pipeline.build_dataset import canonical

HORIZON = 2030
BASE = 2022
ANNEES = HORIZON - BASE
SURVIE_ANNUELLE = 0.998          # mortalité des 0-14 ans, hypothèse conservatrice
N_SIMULATIONS = 2000
SEED = 42


def croissance_annuelle() -> float:
    wb = pd.read_csv("data/raw/worldbank_indicators.csv")
    g = wb[(wb["indicator"] == "SP.POP.GROW") & wb["value"].notna()]
    recent = g[g["year"] >= 2015]["value"]
    return float(recent.mean() / 100) if len(recent) else 0.029


def population_2030() -> pd.DataFrame:
    """Effectif 6-14 ans projeté par wilaya, par composantes de cohorte."""
    brut = pd.read_csv("data/raw/mrt_admpop_adm1_2022.csv")
    g = croissance_annuelle()
    survie = SURVIE_ANNUELLE ** ANNEES

    lignes = []
    for _, r in brut.iterrows():
        wilaya = canonical(r["ADM1_EN"])
        p0_4 = float(r["T_00_04"])
        p5_9 = float(r["T_05_09"])
        p10_14 = float(r["T_10_14"])

        # ATTENTION la base 2022 du pipeline, `pop_6_14_2022`, vaut T_05_09 + T_10_14,
        # soit les 5-14 ans (10 cohortes d'âge simple) et non les 6-14 (9 cohortes).
        # On projette donc À PÉRIMÈTRE IDENTIQUE, 10 cohortes contre 10, sans quoi la
        # comparaison ferait apparaître une baisse de population purement artificielle.
        pop_2022 = p5_9 + p10_14

        # déjà nés en 2022 : les 0-6 ans (7 cohortes), qui auront 8-14 ans en 2030.
        # 0-4 ans = 5 cohortes complètes ; 5-6 ans = 2 cohortes sur les 5 de la tranche 5-9.
        deja_nes = p0_4 + (2 / 5) * p5_9

        # à naître : 3 cohortes (2023, 2024, 2025), qui auront 5, 6 et 7 ans en 2030,
        # estimées sur la cohorte annuelle actuelle prolongée au taux de croissance
        cohorte_annuelle = p0_4 / 5
        a_naitre = sum(cohorte_annuelle * (1 + g) ** k for k in (1, 2, 3))

        pop_2030 = (deja_nes + a_naitre) * survie

        lignes.append(
            {
                "wilaya": wilaya,
                "pop_6_14_2022": int(round(pop_2022)),
                "pop_6_14_2030": int(round(pop_2030)),
                "part_deja_nee_pct": round(deja_nes / (deja_nes + a_naitre) * 100, 1),
                "croissance_pct": round((pop_2030 / pop_2022 - 1) * 100, 1),
            }
        )
    return pd.DataFrame(lignes).sort_values("wilaya").reset_index(drop=True)


def scenarios_2030(pop: pd.DataFrame, features: pd.DataFrame) -> dict:
    """Rejoue les trajectoires de taux sur la population projetée."""
    national = json.load(open("data/processed/national_summary.json"))
    taux0 = national["taux_hors_ecole_national_pct"]
    he0 = national["enfants_hors_ecole_formelle"]
    mahadra0 = national["enfants_mahadra"]

    pop0 = int(pop["pop_6_14_2022"].sum())
    pop30 = int(pop["pop_6_14_2030"].sum())

    # les deux hypothèses de tendance encadrées par robustness.validation_externe
    wb = pd.read_csv("data/raw/worldbank_indicators.csv")
    uner = wb[(wb["indicator"] == "SE.PRM.UNER.ZS") & wb["value"].notna()]
    d = uner[uner["year"] >= 2008]
    pente_optimiste = float(np.clip(np.polyfit(d["year"], d["value"], 1)[0], -1.0, 0.0))
    d2 = d[d["year"] < 2024]
    pente_prudente = float(np.clip(np.polyfit(d2["year"], d2["value"], 1)[0], -1.0, 0.0))

    def trajectoire(pente: float, conversion: float = 0.0) -> dict:
        taux = max(taux0 + pente * ANNEES - (mahadra0 * conversion / pop0 * 100), 0.0)
        enfants_2030 = int(round(taux / 100 * pop30))
        enfants_pop_gelee = int(round(taux / 100 * pop0))
        return {
            "taux_2030": round(taux, 1),
            "enfants_2030": enfants_2030,
            "enfants_si_population_gelee": enfants_pop_gelee,
            "effet_demographique": enfants_2030 - enfants_pop_gelee,
            "variation_vs_2022": enfants_2030 - he0,
        }

    trajectoires = [
        {
            "id": "prudente",
            "label": "Tendance prudente (hors point 2024)",
            "description": f"Pente {pente_prudente:+.2f} pt/an, quasi-stagnation du taux.",
            **trajectoire(pente_prudente),
        },
        {
            "id": "tendancielle",
            "label": "Tendance observée (WDI 2008-2024)",
            "description": f"Pente {pente_optimiste:+.2f} pt/an, portée par la seule observation 2024.",
            **trajectoire(pente_optimiste),
        },
        {
            "id": "passerelles_50",
            "label": "Tendance observée + passerelles mahadra 50 %",
            "description": "Conversion de la moitié des enfants en éducation traditionnelle.",
            **trajectoire(pente_optimiste, conversion=0.50),
        },
    ]

    # bandes d'incertitude Monte-Carlo sur la pente
    rng = np.random.default_rng(SEED)
    # la pente « optimiste » est la plus négative : on borne dans le bon ordre
    pentes = rng.uniform(min(pente_prudente, pente_optimiste),
                         max(pente_prudente, pente_optimiste), N_SIMULATIONS)
    fan = []
    for annee in range(BASE, HORIZON + 1):
        k = annee - BASE
        pop_a = pop0 + (pop30 - pop0) * k / ANNEES
        taux_a = np.clip(taux0 + pentes * k, 0, None)
        enfants = taux_a / 100 * pop_a
        fan.append(
            {
                "annee": annee,
                "median": int(np.median(enfants)),
                "p10": int(np.percentile(enfants, 10)),
                "p90": int(np.percentile(enfants, 90)),
                "population_6_14": int(round(pop_a)),
            }
        )

    return {
        "horizon": HORIZON,
        "population_6_14_2022": pop0,
        "population_6_14_2030": pop30,
        "croissance_population_pct": round((pop30 / pop0 - 1) * 100, 1),
        "enfants_hors_ecole_2022": he0,
        "pente_prudente": round(pente_prudente, 3),
        "pente_tendancielle": round(pente_optimiste, 3),
        "trajectoires": trajectoires,
        "fan_chart": fan,
    }


def besoins_2030(pop: pd.DataFrame, features: pd.DataFrame) -> list[dict]:
    """Écoles à créer pour atteindre 1 établissement / 1 000 enfants en 2030."""
    f = features.set_index("wilaya")
    lignes = []
    for _, r in pop.iterrows():
        w = r["wilaya"]
        if w not in f.index:
            continue
        etabs = float(f.loc[w, "nb_etablissements"])
        cible_2030 = r["pop_6_14_2030"] / 1000
        cible_2022 = r["pop_6_14_2022"] / 1000
        lignes.append(
            {
                "wilaya": w,
                "pop_6_14_2022": int(r["pop_6_14_2022"]),
                "pop_6_14_2030": int(r["pop_6_14_2030"]),
                "croissance_pct": r["croissance_pct"],
                "etablissements_actuels": int(etabs),
                "ecoles_a_creer_2022": max(int(round(cible_2022 - etabs)), 0),
                "ecoles_a_creer_2030": max(int(round(cible_2030 - etabs)), 0),
            }
        )
        lignes[-1]["surcout_demographique"] = (
            lignes[-1]["ecoles_a_creer_2030"] - lignes[-1]["ecoles_a_creer_2022"]
        )
    lignes.sort(key=lambda d: -d["surcout_demographique"])
    return lignes


def run_projection(features: pd.DataFrame | None = None) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/wilaya_features.csv")
    pop = population_2030()
    scen = scenarios_2030(pop, features)
    besoins = besoins_2030(pop, features)

    tend = next(t for t in scen["trajectoires"] if t["id"] == "tendancielle")
    prud = next(t for t in scen["trajectoires"] if t["id"] == "prudente")

    return {
        "hypotheses": {
            "croissance_annuelle_pct": round(croissance_annuelle() * 100, 2),
            "survie_annuelle": SURVIE_ANNUELLE,
            "annees": ANNEES,
            "n_simulations": N_SIMULATIONS,
        },
        "par_wilaya": pop.to_dict("records"),
        "scenarios": scen,
        "besoins": besoins,
        "surcout_total_ecoles": sum(b["surcout_demographique"] for b in besoins),
        "message_cle": (
            f"La population des 6-14 ans passe de {scen['population_6_14_2022']:,} à "
            f"{scen['population_6_14_2030']:,} enfants d'ici 2030, soit "
            f"{scen['croissance_population_pct']:+.1f} %. Conséquence directe : même sous la "
            f"trajectoire la plus favorable, le nombre d'enfants hors école ne passe que de "
            f"{scen['enfants_hors_ecole_2022']:,} à {tend['enfants_2030']:,} "
            f"({tend['variation_vs_2022']:+,}), et sous la trajectoire prudente il "
            f"{'augmente' if prud['variation_vs_2022'] > 0 else 'diminue'} pour atteindre "
            f"{prud['enfants_2030']:,}. Baisser le taux ne suffit pas à réduire les effectifs : "
            "la démographie absorbe l'essentiel du progrès."
        ).replace(",", " "),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_projection()
    dump_json("data/processed/analytics/projection.json", res, indent=2)

    s = res["scenarios"]
    print(f"Population 6-14 : {s['population_6_14_2022']:,} (2022) → {s['population_6_14_2030']:,} "
          f"(2030), soit {s['croissance_population_pct']:+.1f} %")
    print(f"\n{'trajectoire':<44}{'taux':>7}{'enfants 2030':>14}{'vs 2022':>10}{'effet démo':>12}")
    for t in s["trajectoires"]:
        print(f"{t['label']:<44}{t['taux_2030']:>6.1f}%{t['enfants_2030']:>14,}"
              f"{t['variation_vs_2022']:>+10,}{t['effet_demographique']:>+12,}")

    print(f"\nSurcoût démographique : {res['surcout_total_ecoles']} écoles supplémentaires "
          f"par rapport à un calcul sur la population 2022")
    print(f"{'wilaya':<20}{'2022':>9}{'2030':>9}{'crois.':>9}{'écoles 2022':>13}{'écoles 2030':>13}")
    for b in res["besoins"][:6]:
        print(f"{b['wilaya']:<20}{b['pop_6_14_2022']:>9,}{b['pop_6_14_2030']:>9,}"
              f"{b['croissance_pct']:>+8.1f}%{b['ecoles_a_creer_2022']:>13}{b['ecoles_a_creer_2030']:>13}")

    print(f"\n{res['message_cle']}")
