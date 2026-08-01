"""API EduFocus+ FastAPI serving precomputed analytics as JSON.

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
    title="EduFocus+ Datathon IndabaX Mauritanie 2026",
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
    return {"name": "EduFocus+ API", "docs": "/docs", "endpoints": [
        "/api/summary", "/api/wilayas", "/api/wilayas/{wilaya}", "/api/geojson",
        "/api/clusters", "/api/graph/similarite", "/api/graph/correlations",
        "/api/rules", "/api/trends",
        "/api/decomposition", "/api/matrice", "/api/concentration",
        "/api/logit", "/api/scenarios", "/api/indicateurs",
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
