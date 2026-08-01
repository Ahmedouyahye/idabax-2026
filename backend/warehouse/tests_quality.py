"""Contrôles qualité bloquants sur les données et les sorties.

Ces tests s'exécutent à la fin de `run_all.py`. Un échec doit interrompre la
génération : mieux vaut pas de tableau de bord qu'un tableau de bord faux.

Chaque contrôle vérifie un invariant qui, s'il était violé, produirait un
chiffre publié erroné — pas une convention de style.

Exécution isolée : `python -m backend.warehouse.tests_quality`
"""
from __future__ import annotations

import json
from pathlib import Path

import duckdb
import pandas as pd

from backend.pipeline.build_dataset import CANONICAL

DB = "data/processed/edufocus.duckdb"
PROC = Path("data/processed")
ANALYTICS = PROC / "analytics"
TOLERANCE_PCT = 0.5


class EchecQualite(AssertionError):
    """Levée lorsqu'un invariant de données est violé."""


def _controles() -> list[tuple[str, callable]]:
    return [
        ("wilayas_completes", _wilayas_completes),
        ("parts_scolarisation_somment_a_100", _parts_somment),
        ("taux_dans_intervalle_valide", _taux_valides),
        ("effectifs_coherents_avec_national", _effectifs_coherents),
        ("effectifs_wilaya_coherents_avec_taux", _effectifs_wilaya),
        ("aucun_nan_dans_les_indicateurs_cles", _pas_de_nan),
        ("noms_de_wilaya_tous_resolus", _noms_resolus),
        ("sorties_analytiques_presentes_et_lisibles", _sorties_presentes),
        ("colonnes_attendues_par_l_api", _colonnes_api),
        ("entrepot_coherent_avec_le_csv", _entrepot_coherent),
    ]


def _features() -> pd.DataFrame:
    return pd.read_csv(PROC / "wilaya_features.csv")


def _wilayas_completes() -> str:
    df = _features()
    attendues = set(CANONICAL.values())
    obtenues = set(df["wilaya"])
    manquantes = attendues - obtenues
    if manquantes:
        raise EchecQualite(f"wilayas absentes du jeu de données : {sorted(manquantes)}")
    if len(df) != 13:
        raise EchecQualite(f"13 wilayas attendues, {len(df)} trouvées")
    return "13/13 wilayas présentes"


def _parts_somment() -> str:
    df = _features()
    total = df["scol_Formel"] + df["scol_Mahadra_trad"] + df["scol_Aucune instruction"]
    ecart = (total - 100).abs()
    if (ecart > TOLERANCE_PCT).any():
        pires = df.loc[ecart > TOLERANCE_PCT, "wilaya"].tolist()
        raise EchecQualite(f"parts de scolarisation ne sommant pas à 100 % : {pires}")
    return f"écart maximal à 100 % : {ecart.max():.3f} pt"


def _taux_valides() -> str:
    df = _features()
    colonnes = [c for c in df.columns if c.startswith(("scol_", "taux_", "part_"))]
    for c in colonnes:
        serie = df[c].dropna()
        if ((serie < 0) | (serie > 100)).any():
            raise EchecQualite(f"colonne « {c} » hors de l'intervalle [0, 100]")
    return f"{len(colonnes)} colonnes de taux dans [0, 100]"


def _effectifs_coherents() -> str:
    df = _features()
    national = json.load(open(PROC / "national_summary.json"))
    somme = int(df["enfants_hors_ecole"].sum())
    if somme != national["enfants_hors_ecole_formelle"]:
        raise EchecQualite(
            f"somme des wilayas ({somme}) ≠ total national "
            f"({national['enfants_hors_ecole_formelle']})"
        )
    if int(df["population_2022"].sum()) != national["population_totale_2022"]:
        raise EchecQualite("population totale incohérente entre wilayas et national")
    return f"{somme:,} enfants hors école, cohérent wilayas ↔ national".replace(",", " ")


def _effectifs_wilaya() -> str:
    """`enfants_hors_ecole` doit être le produit du taux et de la population."""
    df = _features()
    attendu = (df["scol_Hors_ecole_formelle"] / 100 * df["pop_6_14_2022"]).round()
    ecart = (attendu - df["enfants_hors_ecole"]).abs()
    if (ecart > 1).any():
        pires = df.loc[ecart > 1, "wilaya"].tolist()
        raise EchecQualite(f"effectifs incohérents avec le taux pour : {pires}")
    return "effectifs = taux × population, vérifié pour les 13 wilayas"


def _pas_de_nan() -> str:
    df = _features()
    cles = ["scol_Hors_ecole_formelle", "taux_pauvrete", "part_rurale",
            "ratio_dependance_jeunes", "pop_6_14_2022", "enfants_hors_ecole",
            "ecoles_pour_1000_enfants"]
    manquants = {c: int(df[c].isna().sum()) for c in cles if df[c].isna().any()}
    if manquants:
        raise EchecQualite(f"valeurs manquantes dans des indicateurs clés : {manquants}")
    return f"{len(cles)} indicateurs clés sans valeur manquante"


def _noms_resolus() -> str:
    """Aucun nom de wilaya ne doit rester sous une graphie source non canonique."""
    df = _features()
    canoniques = set(CANONICAL.values())
    inconnus = sorted(set(df["wilaya"]) - canoniques)
    if inconnus:
        raise EchecQualite(
            f"noms non canoniques (jointure manquée dans CANONICAL_BY_NAME) : {inconnus}"
        )
    return "toutes les graphies de wilaya résolues"


def _sorties_presentes() -> str:
    attendues = [
        "indice_priorite_educative.csv", "clusters.json", "graph_similarite.json",
        "regles_association.json", "decomposition.json", "matrice.json",
        "concentration.json", "logit.json", "scenarios.json", "indicateurs.json",
        "uncertainty.json", "robustness.json", "equity.json", "parcours.json",
        "rendement.json", "cohortes.json", "ml.json", "patterns.json",
        "deviants.json", "stability.json", "optim.json", "spatial.json",
        "projection.json", "acces.json",
    ]
    manquantes, illisibles = [], []
    for nom in attendues:
        chemin = ANALYTICS / nom
        if not chemin.exists():
            manquantes.append(nom)
            continue
        if nom.endswith(".json"):
            try:
                json.load(open(chemin))
            except Exception as exc:                      # noqa: BLE001
                illisibles.append(f"{nom} ({exc})")
    if manquantes or illisibles:
        raise EchecQualite(f"sorties manquantes : {manquantes} ; illisibles : {illisibles}")
    return f"{len(attendues)} sorties analytiques présentes et lisibles"


def _colonnes_api() -> str:
    """Les CSV servis par l'API contiennent-ils les colonnes qu'elle sélectionne ?

    Exécuter un module d'analytique seul peut réécrire un fichier partagé avec moins
    de colonnes que n'en attend l'endpoint — l'API renvoie alors un 500 sans que rien
    d'autre ne le signale. Ce contrôle rend la régression visible côté génération.
    """
    attendu = {
        "clusters.csv": ["wilaya", "cluster", "ipe", "rang_ipe"],
        "indice_priorite_educative.csv": [
            "wilaya", "rang_ipe", "ipe", "levier_action",
            "scol_Hors_ecole_formelle", "enfants_hors_ecole",
        ],
    }
    manquantes = {}
    for nom, colonnes in attendu.items():
        df = pd.read_csv(ANALYTICS / nom, nrows=1)
        absentes = [c for c in colonnes if c not in df.columns]
        if absentes:
            manquantes[nom] = absentes
    if manquantes:
        raise EchecQualite(f"colonnes attendues par l'API absentes : {manquantes}")
    return f"{sum(len(v) for v in attendu.values())} colonnes vérifiées sur {len(attendu)} fichiers"


def _entrepot_coherent() -> str:
    if not Path(DB).exists():
        return "entrepôt absent (non bloquant : lancer backend.warehouse.build_duckdb)"
    con = duckdb.connect(DB, read_only=True)
    try:
        n = con.execute("SELECT count(*) FROM marts.fait_individu").fetchone()[0]
        if n != 60600:
            raise EchecQualite(f"60 600 individus attendus dans l'entrepôt, {n} trouvés")
        taux_db = con.execute("""
            SELECT round(100.0 * avg(CASE WHEN hors_ecole_formelle THEN 1 ELSE 0 END), 2)
            FROM marts.fait_individu WHERE age BETWEEN 6 AND 14
        """).fetchone()[0]
    finally:
        con.close()

    epcv_kids_rate = float(taux_db)
    logit = json.load(open(ANALYTICS / "logit.json"))
    ecart = abs(epcv_kids_rate - logit["prevalence_hors_ecole_pct"])
    if ecart > TOLERANCE_PCT:
        raise EchecQualite(
            f"taux hors-école 6-14 divergent : entrepôt {epcv_kids_rate} % vs "
            f"logit {logit['prevalence_hors_ecole_pct']} %"
        )
    return f"entrepôt cohérent (taux 6-14 : {epcv_kids_rate} %)"


def run_tests(strict: bool = True) -> dict:
    resultats = []
    for nom, fonction in _controles():
        try:
            detail = fonction()
            resultats.append({"controle": nom, "statut": "ok", "detail": detail})
        except EchecQualite as exc:
            resultats.append({"controle": nom, "statut": "echec", "detail": str(exc)})
        except Exception as exc:                          # noqa: BLE001
            resultats.append({"controle": nom, "statut": "erreur", "detail": repr(exc)})

    echecs = [r for r in resultats if r["statut"] != "ok"]
    rapport = {
        "n_controles": len(resultats),
        "n_ok": len(resultats) - len(echecs),
        "n_echecs": len(echecs),
        "resultats": resultats,
    }
    if echecs and strict:
        lignes = "\n".join(f"  - {r['controle']} : {r['detail']}" for r in echecs)
        raise EchecQualite(f"{len(echecs)} contrôle(s) qualité en échec :\n{lignes}")
    return rapport


if __name__ == "__main__":
    from backend.sanitize import dump_json

    rapport = run_tests(strict=False)
    dump_json(str(ANALYTICS / "qualite.json"), rapport, indent=2)
    for r in rapport["resultats"]:
        marque = {"ok": "✓", "echec": "✗", "erreur": "!"}[r["statut"]]
        print(f" {marque} {r['controle']:<44}{r['detail']}")
    print(f"\n{rapport['n_ok']}/{rapport['n_controles']} contrôles passés")
    if rapport["n_echecs"]:
        raise SystemExit(1)
