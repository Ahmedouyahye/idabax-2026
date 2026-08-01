"""Fige toutes les sorties de l'API en fichiers statiques pour un hébergement sans serveur.

Le tableau de bord n'a besoin d'aucun calcul à la volée : tout est déjà précalculé
par `run_all.py`. Ce script écrit chaque réponse d'API dans
`frontend/public/data/*.json`, ce qui permet de déployer le front seul sur Vercel,
Netlify, GitHub Pages ou n'importe quel hébergeur de fichiers.

Deux endpoints étaient dynamiques et sont traités à part :

- **`/api/cube`** — l'agrégation OLAP est reportée côté navigateur. On exporte les
  cellules de base (`cube_cells.json`, une ligne par croisement wilaya × milieu ×
  sexe × tranche d'âge × pauvreté) et le front recompose n'importe quel sous-total.
  Le cube reste donc entièrement interactif sans serveur.
- **`/api/ask`** — la traduction texte → SQL demande un modèle et une clé API.
  En statique, on exporte le schéma de l'entrepôt et des exemples de requêtes
  vérifiables : la page explique ce qui est désactivé au lieu de tomber en erreur.

Exécution : `python -m backend.export_static`
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import duckdb
import pandas as pd

from backend.sanitize import dump_json

PROC = Path("data/processed")
ANALYTICS = PROC / "analytics"
SORTIE = Path("frontend/public/data")

# nom du fichier statique → fichier d'analytique source
COPIES_DIRECTES = {
    "clusters": None,            # composé (json + csv), voir plus bas
    "graph_similarite": "graph_similarite.json",
    "graph_correlations": "graph_correlations.json",
    "rules": "regles_association.json",
    "decomposition": "decomposition.json",
    "matrice": "matrice.json",
    "concentration": "concentration.json",
    "logit": "logit.json",
    "scenarios": "scenarios.json",
    "indicateurs": "indicateurs.json",
    "uncertainty": "uncertainty.json",
    "robustesse": "robustness.json",
    "equite": "equity.json",
    "parcours": "parcours.json",
    "rendement": "rendement.json",
    "cohortes": "cohortes.json",
    "ml": "ml.json",
    "patterns": "patterns.json",
    "deviants": "deviants.json",
    "stabilite": "stability.json",
    "optimisation": "optim.json",
    "spatial": "spatial.json",
    "projection": "projection.json",
    "acces": "acces.json",
    "qualite": "qualite.json",
}

TRENDS_FOCUS = [
    "SE.PRM.UNER.ZS", "SE.PRM.UNER", "SE.PRM.NENR", "SE.PRM.ENRR",
    "SE.SEC.NENR", "SE.PRM.TCAQ.ZS", "SE.ADT.1524.LT.ZS", "SI.POV.DDAY",
    "SP.POP.DPND.YG", "SP.POP.DPND",
]

EXEMPLES_SQL = [
    {
        "question": "Taux de hors-école des filles rurales, par wilaya",
        "sql": (
            "SELECT wilaya,\n"
            "       count(*) AS n_enfants,\n"
            "       round(100.0 * avg(CASE WHEN hors_ecole_formelle THEN 1 ELSE 0 END), 1) AS taux_pct\n"
            "FROM marts.fait_individu\n"
            "WHERE age BETWEEN 6 AND 14 AND sexe = 'Féminin' AND milieu = 'Rural'\n"
            "GROUP BY wilaya\n"
            "ORDER BY taux_pct DESC\n"
            "LIMIT 20"
        ),
    },
    {
        "question": "Niveau atteint par les 15-24 ans, du plus fréquent au plus rare",
        "sql": (
            "SELECT coalesce(niveau, 'Jamais scolarisé') AS niveau, count(*) AS n\n"
            "FROM marts.fait_individu\n"
            "WHERE age BETWEEN 15 AND 24\n"
            "GROUP BY 1\n"
            "ORDER BY n DESC\n"
            "LIMIT 20"
        ),
    },
    {
        "question": "Pauvreté et chômage par niveau d'instruction chez les 15-64 ans",
        "sql": (
            "SELECT coalesce(niveau, 'Jamais scolarisé') AS niveau,\n"
            "       count(*) AS n,\n"
            "       round(100.0 * avg(CASE WHEN est_pauvre THEN 1 ELSE 0 END), 1) AS pauvrete_pct,\n"
            "       round(100.0 * avg(CASE WHEN au_chomage THEN 1 ELSE 0 END), 1) AS chomage_pct\n"
            "FROM marts.fait_individu\n"
            "WHERE age BETWEEN 15 AND 64\n"
            "GROUP BY 1\n"
            "HAVING count(*) >= 30\n"
            "ORDER BY pauvrete_pct DESC\n"
            "LIMIT 20"
        ),
    },
]


def _lire(nom: str) -> dict:
    return json.load(open(ANALYTICS / nom))


def _summary() -> dict:
    national = json.load(open(PROC / "national_summary.json"))
    wilayas = pd.read_csv(ANALYTICS / "indice_priorite_educative.csv")
    wilayas = wilayas.sort_values("rang_ipe").replace({pd.NA: None}).to_dict("records")
    clusters = _lire("clusters.json")
    return {
        "national": national,
        "top3_priorite": wilayas[:3],
        "n_clusters": clusters["k"],
        "profils": [
            {"cluster": p["cluster"], "label": p["label"], "levier": p["levier"], "taille": p["taille"]}
            for p in clusters["profiles"]
        ],
    }


def _clusters() -> dict:
    data = _lire("clusters.json")
    rows = pd.read_csv(ANALYTICS / "clusters.csv")
    data["wilayas"] = rows[["wilaya", "cluster", "ipe", "rang_ipe"]].to_dict("records")
    return data


def _trends() -> dict:
    wb = pd.read_csv("data/raw/worldbank_indicators.csv")
    wb = wb[wb["indicator"].isin(TRENDS_FOCUS) & wb["value"].notna()]
    series = {}
    for (indicateur, label), g in wb.groupby(["indicator", "label"]):
        series[f"{indicateur},{label}"] = [
            {"year": int(y), "value": float(v)} for y, v in zip(g["year"], g["value"])
        ]
    return {"series": series}


def _cube_cells() -> dict:
    """Cellules de base du cube : l'agrégation se fera dans le navigateur."""
    con = duckdb.connect(str(PROC / "edufocus.duckdb"), read_only=True)
    try:
        rel = con.execute(
            """SELECT wilaya, milieu, sexe, tranche_age, est_pauvre,
                      n_enfants, n_hors_ecole, n_traditionnel
               FROM marts.cube_enfants
               WHERE tranche_age IS NOT NULL"""
        )
        colonnes = [d[0] for d in rel.description]
        cellules = [dict(zip(colonnes, r)) for r in rel.fetchall()]
    finally:
        con.close()
    return {
        "dimensions_possibles": ["wilaya", "milieu", "sexe", "tranche_age", "est_pauvre"],
        "mesures_possibles": {
            "hors_ecole": "n_hors_ecole",
            "traditionnel": "n_traditionnel",
            "enfants": "n_enfants",
        },
        "cellules": cellules,
        "note": (
            "Cellules de base exportées depuis l'entrepôt DuckDB. Tout sous-total affiché "
            "est recomposé dans le navigateur à partir de ces lignes : le cube reste "
            "interactif sans serveur."
        ),
    }


def _ask_statique() -> dict:
    from backend.warehouse.ask import schema_pour_prompt

    return {
        "statut": "statique",
        "message": (
            "L'interrogation en langage naturel demande un modèle et une clé API, donc un "
            "serveur. Cette version est déployée en statique : le schéma de l'entrepôt et "
            "des requêtes prêtes à l'emploi sont fournis ci-dessous. Pour poser des questions "
            "libres, lancer l'API en local (backend/api/main.py) avec ANTHROPIC_API_KEY."
        ),
        "schema": schema_pour_prompt(),
        "exemples": EXEMPLES_SQL,
    }


def _briefs() -> dict:
    from backend.analytics.briefs import charger_cache

    return charger_cache()


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)

    ecrits: list[tuple[str, int]] = []

    def ecrire(nom: str, contenu: dict | list) -> None:
        chemin = SORTIE / f"{nom}.json"
        dump_json(str(chemin), contenu)
        ecrits.append((nom, chemin.stat().st_size))

    # ---- payloads composés ---------------------------------------------------
    ecrire("summary", _summary())
    ecrire("wilayas", pd.read_csv(ANALYTICS / "indice_priorite_educative.csv")
           .replace({pd.NA: None}).to_dict("records"))
    ecrire("clusters", _clusters())
    ecrire("trends", _trends())
    ecrire("cube_cells", _cube_cells())
    ecrire("ask", _ask_statique())
    ecrire("briefs", _briefs())

    # ---- copies directes -----------------------------------------------------
    for nom, source in COPIES_DIRECTES.items():
        if source is None:
            continue
        ecrire(nom, _lire(source))

    # ---- géographies ---------------------------------------------------------
    for nom, source in (("geojson", PROC / "mauritania_wilayas.geojson"),
                        ("moughataa-geojson", PROC / "moughataa_acces.geojson")):
        cible = SORTIE / f"{nom}.json"
        shutil.copyfile(source, cible)
        ecrits.append((nom, cible.stat().st_size))

    total = sum(t for _, t in ecrits)
    print(f"{len(ecrits)} fichiers écrits dans {SORTIE} ({total / 1_048_576:.1f} Mo)")
    for nom, taille in sorted(ecrits, key=lambda x: -x[1]):
        print(f"  {nom:<22}{taille / 1024:>9.1f} Ko")


if __name__ == "__main__":
    main()
