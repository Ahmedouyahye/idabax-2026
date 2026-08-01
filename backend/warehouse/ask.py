"""Interrogation de l'entrepôt en langage naturel (texte → SQL).

L'entrepôt DuckDB contient les 60 600 individus et toutes les dimensions ; le
tableau de bord n'en montre qu'une sélection figée. Ce module laisse poser une
question en français, en anglais ou en arabe et la traduit en SQL exécuté sur
l'entrepôt.

**Le SQL généré est toujours renvoyé avec la réponse.** Une réponse chiffrée dont
on ne peut pas relire la requête n'est pas vérifiable, donc pas utilisable pour
décider. L'interface doit l'afficher.

Garde-fous, tous appliqués avant exécution :

- connexion DuckDB ouverte en **lecture seule** ;
- une seule instruction, obligatoirement un `SELECT` (ou un `WITH … SELECT`) ;
- liste blanche de tables : rien en dehors des schémas `marts` et `staging` ;
- mots-clés de modification et fonctions d'accès au système de fichiers rejetés ;
- `LIMIT` imposé, et délai d'exécution borné.

Sans clé API, `run_ask` renvoie un message explicite plutôt qu'une erreur : la
page reste utilisable et affiche l'exemple de requête.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

import duckdb

DB = Path("data/processed/edufocus.duckdb")
MODELE = "claude-opus-5"
MAX_TOKENS = 1500
LIMITE_LIGNES = 200
DELAI_S = 15

TABLES_AUTORISEES = {
    "marts.fait_individu",
    "marts.dim_wilaya",
    "marts.dim_education",
    "marts.dim_age",
    "marts.dim_milieu",
    "marts.cube_enfants",
    "staging.wilaya_features",
}

INTERDITS = re.compile(
    r"\b(insert|update|delete|drop|create|alter|attach|detach|copy|export|import|"
    r"install|load|pragma|set|call|vacuum|checkpoint|read_csv|read_parquet|"
    r"read_json|glob)\b",
    re.IGNORECASE,
)


def schema_pour_prompt() -> str:
    """Description du schéma envoyée au modèle : uniquement les tables autorisées."""
    if not DB.exists():
        return ""
    con = duckdb.connect(str(DB), read_only=True)
    try:
        lignes = []
        for table in sorted(TABLES_AUTORISEES):
            schema, nom = table.split(".")
            cols = con.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position",
                [schema, nom],
            ).fetchall()
            if cols:
                champs = ", ".join(f"{c} {t}" for c, t in cols)
                lignes.append(f"{table}({champs})")
        return "\n".join(lignes)
    finally:
        con.close()


CONSIGNE = """Tu traduis une question en une seule requête SQL DuckDB.

Schéma disponible (aucune autre table n'existe) :
{schema}

Règles :
- Réponds UNIQUEMENT par la requête SQL, sans commentaire ni bloc de code.
- Une seule instruction, commençant par SELECT ou WITH.
- N'utilise que les tables listées ci-dessus.
- Ajoute toujours un LIMIT (maximum {limite}).
- `marts.fait_individu` contient un individu par ligne : `hors_ecole_formelle`, \
`en_formel`, `en_traditionnel` sont des booléens ; `age` est en années.
- Pour les taux, calcule une moyenne de booléen multipliée par 100, et arrondis.
- Les enfants scolarisables sont ceux dont l'âge est entre 6 et 14 ans."""


def valider(sql: str) -> tuple[bool, str]:
    """Refuse tout ce qui n'est pas une lecture sur les tables autorisées."""
    nettoye = re.sub(r"--[^\n]*", " ", sql)
    nettoye = re.sub(r"/\*.*?\*/", " ", nettoye, flags=re.S).strip().rstrip(";")

    if ";" in nettoye:
        return False, "une seule instruction est autorisée"
    if not re.match(r"^\s*(select|with)\b", nettoye, re.IGNORECASE):
        return False, "seules les requêtes SELECT sont autorisées"
    if INTERDITS.search(nettoye):
        return False, "mot-clé de modification ou d'accès fichier détecté"

    # toute référence schema.table doit figurer dans la liste blanche
    referencees = {
        f"{s}.{t}".lower()
        for s, t in re.findall(r"\b(marts|staging|main|information_schema)\.(\w+)", nettoye, re.I)
    }
    hors_liste = referencees - {t.lower() for t in TABLES_AUTORISEES}
    if hors_liste:
        return False, f"table non autorisée : {', '.join(sorted(hors_liste))}"
    if not referencees:
        return False, "aucune table reconnue dans la requête"
    return True, ""


def executer(sql: str) -> dict:
    con = duckdb.connect(str(DB), read_only=True)
    try:
        con.execute(f"SET statement_timeout = '{DELAI_S}s'")
        rel = con.execute(sql)
        colonnes = [d[0] for d in rel.description]
        lignes = rel.fetchmany(LIMITE_LIGNES)
        return {
            "colonnes": colonnes,
            "lignes": [list(r) for r in lignes],
            "n_lignes": len(lignes),
            "tronque": len(lignes) == LIMITE_LIGNES,
        }
    finally:
        con.close()


def run_ask(question: str) -> dict:
    if not DB.exists():
        return {
            "statut": "indisponible",
            "message": "Entrepôt absent : lancer `python -m backend.warehouse.build_duckdb`.",
        }
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return {
            "statut": "sans_cle",
            "message": (
                "Interrogation en langage naturel désactivée : ANTHROPIC_API_KEY n'est "
                "pas définie. L'entrepôt reste interrogeable directement en SQL "
                "(data/processed/edufocus.duckdb)."
            ),
            "schema": schema_pour_prompt(),
        }

    import anthropic

    client = anthropic.Anthropic()
    reponse = client.messages.create(
        model=MODELE,
        max_tokens=MAX_TOKENS,
        system=CONSIGNE.format(schema=schema_pour_prompt(), limite=LIMITE_LIGNES),
        messages=[{"role": "user", "content": question}],
    )

    if reponse.stop_reason == "refusal":
        return {"statut": "refus", "question": question, "detail": str(reponse.stop_details)}

    sql = "".join(b.text for b in reponse.content if b.type == "text").strip()
    sql = re.sub(r"^```(?:sql)?\s*|\s*```$", "", sql, flags=re.I | re.M).strip()

    ok, motif = valider(sql)
    if not ok:
        return {"statut": "rejete", "question": question, "sql": sql, "motif": motif}

    try:
        resultat = executer(sql)
    except Exception as exc:                                  # noqa: BLE001
        return {"statut": "erreur_sql", "question": question, "sql": sql, "detail": str(exc)}

    return {"statut": "ok", "question": question, "sql": sql, "resultat": resultat}


if __name__ == "__main__":
    import json
    import sys

    q = " ".join(sys.argv[1:]) or "Quel est le taux de hors-école des filles rurales par wilaya ?"
    res = run_ask(q)
    print(json.dumps(res, ensure_ascii=False, indent=2, default=str))
