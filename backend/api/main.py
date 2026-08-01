"""API EduFocus🌙 FastAPI serving precomputed analytics as JSON.

Run: uvicorn backend.api.main:app --reload --port 8000
"""
from __future__ import annotations

import json

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

ANALYTICS = "data/processed/analytics"
PROC = "data/processed"

app = FastAPI(
    title="EduFocus🌙 Datathon IndabaX Mauritanie 2026",
    description="Indice de Priorité Éducative, clustering, analyse de graphe et "
                "règles d'association sur la Mauritanie.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(path: str) -> dict:
    with open(path) as fh:
        return json.load(fh)


def load_df(path: str) -> list[dict]:
    return pd.read_csv(path).replace({pd.NA: None}).to_dict("records")


@app.get("/")
def root() -> dict:
    return {"name": "EduFocus🌙 API", "docs": "/docs", "endpoints": [
        "/api/summary", "/api/wilayas", "/api/wilayas/{wilaya}", "/api/geojson",
        "/api/clusters", "/api/graph/similarite", "/api/graph/correlations",
        "/api/rules", "/api/trends",
        "/api/decomposition", "/api/matrice", "/api/concentration",
        "/api/logit", "/api/scenarios", "/api/indicateurs",
        "/api/uncertainty", "/api/robustesse", "/api/equite",
        "/api/parcours", "/api/rendement", "/api/cohortes",
        "/api/ml", "/api/patterns", "/api/deviants", "/api/stabilite", "/api/optimisation",
        "/api/spatial", "/api/projection", "/api/acces", "/api/moughataa-geojson",
        "/api/qualite", "/api/briefs", "/api/cube", "/api/ask",
    ]}


@app.get("/api/summary")
def summary() -> dict:
    national = load_json(f"{PROC}/national_summary.json")
    wilayas = pd.read_csv(f"{PROC}/analytics/indice_priorite_educative.csv")
    wilayas = wilayas.sort_values("rang_ipe").replace({pd.NA: None}).to_dict("records")
    clusters = load_json(f"{ANALYTICS}/clusters.json")
    return {
        "national": national,
        "top3_priorite": wilayas[:3],
        "n_clusters": clusters["k"],
        "profils": [
            {"cluster": p["cluster"], "label": p["label"], "levier": p["levier"], "taille": p["taille"]}
            for p in clusters["profiles"]
        ],
    }


@app.get("/api/wilayas")
def wilayas() -> list[dict]:
    return load_df(f"{PROC}/analytics/indice_priorite_educative.csv")


@app.get("/api/wilayas/{wilaya}")
def wilaya_detail(wilaya: str) -> dict:
    df = pd.read_csv(f"{PROC}/analytics/indice_priorite_educative.csv")
    row = df[df["wilaya"].str.lower() == wilaya.lower()]
    if row.empty:
        raise HTTPException(404, f"Wilaya inconnue: {wilaya}")
    return row.replace({pd.NA: None}).iloc[0].to_dict()


@app.get("/api/geojson")
def geojson() -> FileResponse:
    return FileResponse(f"{PROC}/mauritania_wilayas.geojson",
                        media_type="application/json")


@app.get("/api/clusters")
def clusters() -> dict:
    data = load_json(f"{ANALYTICS}/clusters.json")
    rows = pd.read_csv(f"{PROC}/analytics/clusters.csv")
    data["wilayas"] = rows[["wilaya", "cluster", "ipe", "rang_ipe"]].to_dict("records")
    return data


@app.get("/api/graph/similarite")
def graph_similarite() -> dict:
    return load_json(f"{ANALYTICS}/graph_similarite.json")


@app.get("/api/graph/correlations")
def graph_correlations() -> dict:
    return load_json(f"{ANALYTICS}/graph_correlations.json")


@app.get("/api/rules")
def rules() -> dict:
    return load_json(f"{ANALYTICS}/regles_association.json")


@app.get("/api/trends")
def trends() -> dict:
    wb = pd.read_csv("data/raw/worldbank_indicators.csv")
    focus = ["SE.PRM.UNER.ZS", "SE.PRM.UNER", "SE.PRM.NENR", "SE.PRM.ENRR",
             "SE.SEC.NENR", "SE.PRM.TCAQ.ZS", "SE.ADT.1524.LT.ZS", "SI.POV.DDAY",
             "SP.POP.DPND.YG", "SP.POP.DPND"]
    wb = wb[wb["indicator"].isin(focus) & wb["value"].notna()]
    return {"series": wb.groupby(["indicator", "label"]).apply(
        lambda g: [{"year": int(y), "value": v} for y, v in zip(g["year"], g["value"])]
    ).to_dict()}


@app.get("/api/decomposition")
def decomposition() -> dict:
    return load_json(f"{ANALYTICS}/decomposition.json")


@app.get("/api/matrice")
def matrice() -> dict:
    return load_json(f"{ANALYTICS}/matrice.json")


@app.get("/api/concentration")
def concentration() -> dict:
    return load_json(f"{ANALYTICS}/concentration.json")


@app.get("/api/logit")
def logit() -> dict:
    return load_json(f"{ANALYTICS}/logit.json")


@app.get("/api/scenarios")
def scenarios() -> dict:
    return load_json(f"{ANALYTICS}/scenarios.json")


@app.get("/api/indicateurs")
def indicateurs() -> dict:
    return load_json(f"{ANALYTICS}/indicateurs.json")


@app.get("/api/uncertainty")
def uncertainty() -> dict:
    """Intervalles de confiance bootstrap et rétrécissement empirical Bayes."""
    return load_json(f"{ANALYTICS}/uncertainty.json")


@app.get("/api/robustesse")
def robustesse() -> dict:
    """Sensibilité de l'IPE aux pondérations, classements alternatifs, validation externe."""
    return load_json(f"{ANALYTICS}/robustness.json")


@app.get("/api/equite")
def equite() -> dict:
    """Theil décomposé, Human Opportunity Index, adéquation offre/besoin."""
    return load_json(f"{ANALYTICS}/equity.json")


@app.get("/api/parcours")
def parcours() -> dict:
    """Retard scolaire, pyramide des niveaux, survie éducative."""
    return load_json(f"{ANALYTICS}/parcours.json")


@app.get("/api/rendement")
def rendement() -> dict:
    """Chômage et pauvreté par niveau, décomposition d'Oaxaca-Blinder, logit pauvreté."""
    return load_json(f"{ANALYTICS}/rendement.json")


@app.get("/api/cohortes")
def cohortes() -> dict:
    """Progression intergénérationnelle et rattrapage par wilaya."""
    return load_json(f"{ANALYTICS}/cohortes.json")


@app.get("/api/ml")
def ml() -> dict:
    """Gradient boosting validé (AUC test, calibration) et interprétation SHAP."""
    return load_json(f"{ANALYTICS}/ml.json")


@app.get("/api/patterns")
def patterns() -> dict:
    """FP-Growth testé (Fisher + Benjamini-Hochberg) et découverte de sous-groupes."""
    return load_json(f"{ANALYTICS}/patterns.json")


@app.get("/api/deviants")
def deviants() -> dict:
    """Résidus attendu/observé : déviants positifs et sous-performances."""
    return load_json(f"{ANALYTICS}/deviants.json")


@app.get("/api/stabilite")
def stabilite() -> dict:
    """Stabilité de la typologie : bootstrap ARI, dendrogramme, BIC, co-assignation."""
    return load_json(f"{ANALYTICS}/stability.json")


@app.get("/api/optimisation")
def optimisation() -> dict:
    """Allocation budgétaire optimale, frontière d'efficience, DEA."""
    return load_json(f"{ANALYTICS}/optim.json")


@app.get("/api/spatial")
def spatial() -> dict:
    """I de Moran, LISA et matrice de voisinage."""
    return load_json(f"{ANALYTICS}/spatial.json")


@app.get("/api/projection")
def projection() -> dict:
    """Projection par composantes de cohorte des 6-14 ans à 2030."""
    return load_json(f"{ANALYTICS}/projection.json")


@app.get("/api/acces")
def acces() -> dict:
    """Accessibilité scolaire par moughataa (63 unités)."""
    return load_json(f"{ANALYTICS}/acces.json")


@app.get("/api/moughataa-geojson")
def moughataa_geojson() -> FileResponse:
    return FileResponse(f"{PROC}/moughataa_acces.geojson", media_type="application/json")


@app.get("/api/qualite")
def qualite() -> dict:
    """Rapport des contrôles qualité exécutés en fin de pipeline."""
    return load_json(f"{ANALYTICS}/qualite.json")


@app.get("/api/briefs")
def briefs() -> dict:
    """Notes de politique par wilaya (cache hors ligne ; vide sans génération)."""
    from backend.analytics.briefs import charger_cache

    return charger_cache()


@app.get("/api/cube")
def cube(dims: str = "wilaya,milieu", measure: str = "hors_ecole") -> dict:
    """Cube OLAP sur les 6-14 ans : agrégation à la demande sur l'entrepôt.

    `dims` est une liste séparée par des virgules parmi wilaya, milieu, sexe,
    tranche_age, est_pauvre. Aucune valeur libre n'atteint SQL : chaque dimension
    est validée contre une liste blanche avant construction de la requête.
    """
    import duckdb

    autorisees = ["wilaya", "milieu", "sexe", "tranche_age", "est_pauvre"]
    demandees = [d.strip() for d in dims.split(",") if d.strip()]
    inconnues = [d for d in demandees if d not in autorisees]
    if inconnues:
        raise HTTPException(400, f"dimensions inconnues : {inconnues} (permises : {autorisees})")
    if not demandees:
        raise HTTPException(400, "au moins une dimension est requise")

    mesures = {
        "hors_ecole": "n_hors_ecole",
        "traditionnel": "n_traditionnel",
        "enfants": "n_enfants",
    }
    if measure not in mesures:
        raise HTTPException(400, f"mesure inconnue : {measure} (permises : {list(mesures)})")

    cols = ", ".join(demandees)
    con = duckdb.connect(f"{PROC}/edufocus.duckdb", read_only=True)
    try:
        rel = con.execute(
            f"""SELECT {cols},
                       sum(n_enfants)      AS n_enfants,
                       sum({mesures[measure]}) AS mesure,
                       round(100.0 * sum({mesures[measure]}) / sum(n_enfants), 1) AS pct
                FROM marts.cube_enfants
                WHERE tranche_age IS NOT NULL
                GROUP BY {cols}
                ORDER BY mesure DESC"""
        )
        colonnes = [d[0] for d in rel.description]
        lignes = [dict(zip(colonnes, r)) for r in rel.fetchall()]
    finally:
        con.close()
    return {"dimensions": demandees, "mesure": measure, "colonnes": colonnes, "cellules": lignes}


@app.get("/api/ask")
def ask(q: str) -> dict:
    """Question en langage naturel traduite en SQL sur l'entrepôt (lecture seule)."""
    from backend.warehouse.ask import run_ask

    return run_ask(q)
