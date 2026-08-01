"""Entrepôt analytique DuckDB : schéma en étoile sur les microdonnées EPCV.

Le projet lit aujourd'hui le fichier SPSS à trois endroits différents et
recalcule les mêmes agrégats à chaque exécution. Un entrepôt règle trois
problèmes d'un coup :

- **une seule définition** de « hors école », de « formel », des tranches d'âge,
  matérialisée dans des dimensions plutôt que réécrite dans chaque module ;
- **l'interrogation ad hoc** : n'importe quelle question croisée (wilaya × milieu
  × sexe × âge) devient une requête, sans nouveau code Python ;
- **le contrôle qualité** : les invariants sont testés sur la table de faits,
  pas sur les sorties.

Organisation en couches :

    staging   → copie fidèle des sources (aucune transformation)
    marts     → schéma en étoile : fait_individu + dimensions conformes

Le fichier produit (`data/processed/edufocus.duckdb`) est autonome et lisible
par DuckDB, pandas, DBeaver ou n'importe quel client SQL. Les tables sont aussi
exportées en Parquet pour être consommées sans DuckDB.

Exécution : `python -m backend.warehouse.build_duckdb`
"""
from __future__ import annotations

import os
from pathlib import Path

import duckdb
import pandas as pd

from backend.pipeline.build_dataset import WILAYA_CODES, load_epcv

DB = "data/processed/edufocus.duckdb"
PARQUET = Path("data/processed/parquet")

FORMEL = ("Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique")
TRADITIONNEL = ("Oui Mahadra uniquement", "Oui enseignement coranique uniquement")


def _dim_education() -> pd.DataFrame:
    lignes = [
        ("Oui Ecole formelle uniquement", "Formel", True, False, "École formelle uniquement"),
        ("Oui Ecole formelle et enseignement coranique", "Formel", True, True,
         "École formelle et enseignement coranique"),
        ("Oui Mahadra uniquement", "Traditionnel", False, True, "Mahadra uniquement"),
        ("Oui enseignement coranique uniquement", "Traditionnel", False, True,
         "Enseignement coranique uniquement"),
        ("Non", "Aucune", False, False, "Aucune instruction"),
    ]
    return pd.DataFrame(
        lignes, columns=["educ_statut", "categorie", "est_formel", "est_traditionnel", "libelle"]
    )


def _dim_age() -> pd.DataFrame:
    lignes = []
    for age in range(0, 100):
        if age <= 5:
            groupe, scolarisable = "0-5", False
        elif age <= 14:
            groupe, scolarisable = "6-14", True
        elif age <= 24:
            groupe, scolarisable = "15-24", False
        elif age <= 59:
            groupe, scolarisable = "25-59", False
        else:
            groupe, scolarisable = "60+", False
        lignes.append(
            {
                "age": age,
                "groupe_age": groupe,
                "age_scolarisable": scolarisable,
                "tranche_6_14": "6-9" if 6 <= age <= 9 else ("10-14" if 10 <= age <= 14 else None),
                "niveau_normatif": (
                    "Primaire" if 6 <= age <= 11 else ("Collège" if 12 <= age <= 15 else None)
                ),
            }
        )
    return pd.DataFrame(lignes)


def build() -> dict:
    os.makedirs("data/processed", exist_ok=True)
    PARQUET.mkdir(parents=True, exist_ok=True)
    if os.path.exists(DB):
        os.remove(DB)

    epcv = load_epcv()
    features = pd.read_csv("data/processed/wilaya_features.csv")
    ipe = pd.read_csv("data/processed/analytics/indice_priorite_educative.csv")
    clusters = pd.read_csv("data/processed/analytics/clusters.csv")[["wilaya", "cluster"]]

    con = duckdb.connect(DB)
    con.execute("CREATE SCHEMA IF NOT EXISTS staging")
    con.execute("CREATE SCHEMA IF NOT EXISTS marts")

    # ---- staging : copie fidèle, aucune transformation ----------------------
    con.register("_epcv", epcv)
    con.execute("CREATE TABLE staging.epcv_individus AS SELECT * FROM _epcv")
    con.register("_feat", features)
    con.execute("CREATE TABLE staging.wilaya_features AS SELECT * FROM _feat")

    # ---- dimensions ---------------------------------------------------------
    dim_wilaya = (
        features[["wilaya", "population_2022", "pop_6_14_2022", "taux_pauvrete",
                  "part_rurale", "ratio_dependance_jeunes", "nb_etablissements",
                  "ecoles_pour_1000_enfants"]]
        .merge(ipe[["wilaya", "ipe", "rang_ipe", "levier_action"]], on="wilaya", how="left")
        .merge(clusters, on="wilaya", how="left")
        .assign(code_wilaya=lambda d: d["wilaya"].map(WILAYA_CODES))
    )
    con.register("_dw", dim_wilaya)
    con.execute("CREATE TABLE marts.dim_wilaya AS SELECT * FROM _dw")

    con.register("_de", _dim_education())
    con.execute("CREATE TABLE marts.dim_education AS SELECT * FROM _de")
    con.register("_da", _dim_age())
    con.execute("CREATE TABLE marts.dim_age AS SELECT * FROM _da")

    con.execute("""
        CREATE TABLE marts.dim_milieu AS
        SELECT * FROM (VALUES ('Urbain', false), ('Rural', true)) AS t(milieu, est_rural)
    """)

    # ---- table de faits -----------------------------------------------------
    con.execute(f"""
        CREATE TABLE marts.fait_individu AS
        SELECT
            row_number() OVER () AS id_individu,
            e.wilaya,
            e.milieu,
            e.sexe,
            CAST(e.age AS INTEGER)      AS age,
            e.age_groupe,
            e.educ_statut,
            e.niveau,
            CAST(e.chomage AS BOOLEAN)  AS au_chomage,
            CAST(e.pauvre AS BOOLEAN)   AS est_pauvre,
            e.educ_statut IN {FORMEL}        AS en_formel,
            e.educ_statut IN {TRADITIONNEL}  AS en_traditionnel,
            e.educ_statut NOT IN {FORMEL}    AS hors_ecole_formelle
        FROM staging.epcv_individus e
        WHERE e.wilaya IS NOT NULL
    """)

    # ---- vue d'usage : le cube préagrégé sur les 6-14 ans -------------------
    con.execute("""
        CREATE VIEW marts.cube_enfants AS
        SELECT
            f.wilaya, f.milieu, f.sexe,
            a.tranche_6_14                        AS tranche_age,
            f.est_pauvre,
            count(*)                              AS n_enfants,
            sum(CASE WHEN f.hors_ecole_formelle THEN 1 ELSE 0 END) AS n_hors_ecole,
            sum(CASE WHEN f.en_traditionnel     THEN 1 ELSE 0 END) AS n_traditionnel,
            round(100.0 * avg(CASE WHEN f.hors_ecole_formelle THEN 1 ELSE 0 END), 2)
                                                  AS taux_hors_ecole_pct
        FROM marts.fait_individu f
        JOIN marts.dim_age a USING (age)
        WHERE a.age_scolarisable
        GROUP BY ALL
    """)

    # ---- export Parquet -----------------------------------------------------
    tables = ["marts.fait_individu", "marts.dim_wilaya", "marts.dim_education",
              "marts.dim_age", "marts.dim_milieu"]
    for t in tables:
        nom = t.split(".")[1]
        con.execute(f"COPY {t} TO '{PARQUET / (nom + '.parquet')}' (FORMAT PARQUET)")

    resume = {
        "chemin": DB,
        "parquet": str(PARQUET),
        "tables": {},
    }
    for t in tables + ["staging.epcv_individus", "staging.wilaya_features"]:
        resume["tables"][t] = int(con.execute(f"SELECT count(*) FROM {t}").fetchone()[0])
    resume["vues"] = {"marts.cube_enfants": int(
        con.execute("SELECT count(*) FROM marts.cube_enfants").fetchone()[0])}
    con.close()
    return resume


if __name__ == "__main__":
    r = build()
    print(f"Entrepôt écrit : {r['chemin']}  (Parquet : {r['parquet']})")
    for t, n in r["tables"].items():
        print(f"  {t:<32}{n:>8,} lignes")
    for v, n in r["vues"].items():
        print(f"  {v:<32}{n:>8,} cellules")
