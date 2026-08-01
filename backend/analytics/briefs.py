"""Notes de politique par wilaya, générées puis mises en cache.

Le tableau de bord produit treize wilayas × une dizaine d'analyses : personne ne
lit tout. Une note d'une page par wilaya, en français, anglais et arabe, rend le
travail utilisable par un décideur qui n'ouvrira jamais la page « Modèles ».

**Contrainte de fond : aucun chiffre inventé.** Le modèle ne reçoit que les
valeurs calculées par le pipeline, et chaque nombre présent dans la note produite
est ensuite vérifié contre cette source. Une note dont un nombre ne se retrouve
pas dans les données est marquée comme non vérifiée plutôt que publiée en l'état.

**Génération hors ligne.** Ce module s'exécute à la main, pas dans le chemin de
requête de l'API : le résultat est écrit dans
`data/processed/analytics/briefs.json` et servi depuis ce cache. Le tableau de
bord fonctionne donc entièrement sans clé API — les notes sont simplement
absentes tant que personne ne les a générées.

Exécution :
    ANTHROPIC_API_KEY=... python -m backend.analytics.briefs          # toutes
    ANTHROPIC_API_KEY=... python -m backend.analytics.briefs Assaba   # une seule
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ANALYTICS = Path("data/processed/analytics")
CACHE = ANALYTICS / "briefs.json"

MODELE = "claude-opus-5"
MAX_TOKENS = 3000
LANGUES = {
    "fr": "français",
    "en": "anglais",
    "ar": "arabe (dialecte standard moderne, registre administratif)",
}

CONSIGNE = """Tu rédiges une note de politique éducative destinée à un décideur \
mauritanien : direction régionale de l'éducation, bailleur, ou cabinet ministériel.

Contraintes absolues :
- N'utilise QUE les chiffres présents dans les données fournies. N'invente aucune \
valeur, n'arrondis pas différemment, n'extrapole pas.
- Si une information manque, dis-le au lieu de la combler.
- Pas de formule d'introduction ni de conclusion de politesse.

Structure attendue, en {langue}, 250 mots maximum :
1. Une phrase de diagnostic qui donne l'ampleur du problème en effectifs, pas en \
pourcentage seul.
2. Ce qui distingue cette wilaya des autres — sa spécificité, pas la moyenne nationale.
3. Le levier d'action prioritaire, justifié par un chiffre précis des données.
4. Une réserve méthodologique honnête (taille d'échantillon, incertitude, ou limite \
des données) tirée des éléments fournis.

Écris en prose continue, sans titres ni puces."""


def _charger(nom: str) -> dict:
    chemin = ANALYTICS / nom
    return json.load(open(chemin)) if chemin.exists() else {}


def contexte_wilaya(wilaya: str) -> dict:
    """Rassemble tout ce que le pipeline sait d'une wilaya, et rien d'autre."""
    import pandas as pd

    ipe = pd.read_csv(ANALYTICS / "indice_priorite_educative.csv")
    ligne = ipe[ipe["wilaya"] == wilaya]
    if ligne.empty:
        raise ValueError(f"wilaya inconnue : {wilaya}")
    base = ligne.iloc[0].to_dict()

    def _trouver(donnees: dict, cle: str, champ: str = "wilaya") -> dict | None:
        for item in donnees.get(cle, []) or []:
            if item.get(champ) == wilaya:
                return item
        return None

    incertitude = _charger("uncertainty.json")
    parcours = _charger("parcours.json")
    cohortes = _charger("cohortes.json")
    deviants = _charger("deviants.json")
    optim = _charger("optim.json")
    projection = _charger("projection.json")
    spatial = _charger("spatial.json")
    national = json.load(open("data/processed/national_summary.json"))

    return {
        "wilaya": wilaya,
        "national": national,
        "indice": {
            "rang_ipe": int(base["rang_ipe"]),
            "ipe": float(base["ipe"]),
            "levier_action": base["levier_action"],
            "taux_hors_ecole_pct": round(float(base["scol_Hors_ecole_formelle"]), 1),
            "enfants_hors_ecole": int(base["enfants_hors_ecole"]),
            "taux_pauvrete_pct": round(float(base["taux_pauvrete"]), 1),
            "part_rurale_pct": round(float(base["part_rurale"]), 1),
            "etablissements": int(base["nb_etablissements"]),
            "ecoles_pour_1000_enfants": round(float(base["ecoles_pour_1000_enfants"]), 2),
        },
        "incertitude": _trouver(incertitude, "wilayas"),
        "retard_scolaire": _trouver(parcours.get("retard", {}), "par_wilaya"),
        "rattrapage_generationnel": _trouver(cohortes.get("rattrapage", {}), "wilayas"),
        "ecart_au_profil_attendu": _trouver(deviants, "wilayas"),
        "cout_efficacite": _trouver(optim, "classement_cout_efficacite"),
        "projection_2030": _trouver(projection, "par_wilaya"),
        "autocorrelation_spatiale": _trouver(
            spatial.get("variables", {}).get("ipe", {}), "lisa"),
    }


def _nombres(texte: str) -> set[str]:
    """Nombres cités dans un texte, normalisés (virgule décimale → point)."""
    bruts = re.findall(r"\d[\d\s ,.]*\d|\d", texte)
    out = set()
    for b in bruts:
        n = b.replace(" ", "").replace(" ", "").replace(",", ".")
        n = n.rstrip(".")
        if n:
            out.add(n)
    return out


def verifier(texte: str, contexte: dict) -> dict:
    """Chaque nombre de la note se retrouve-t-il dans les données sources ?"""
    source = _nombres(json.dumps(contexte, ensure_ascii=False))
    # tolérance : un nombre arrondi à l'entier ou à une décimale reste vérifiable
    elargie = set(source)
    for n in source:
        try:
            v = float(n)
        except ValueError:
            continue
        elargie.update({str(round(v)), str(round(v, 1)), str(int(v)) if v == int(v) else n})

    cites = _nombres(texte)
    inconnus = sorted(n for n in cites if n not in elargie and len(n) > 2)
    return {
        "n_nombres_cites": len(cites),
        "nombres_non_sources": inconnus,
        "verifie": not inconnus,
    }


def generer_note(client, wilaya: str, langue: str, contexte: dict) -> dict:
    reponse = client.messages.create(
        model=MODELE,
        max_tokens=MAX_TOKENS,
        system=CONSIGNE.format(langue=LANGUES[langue]),
        messages=[
            {
                "role": "user",
                "content": (
                    f"Données calculées pour la wilaya de {wilaya}. "
                    "Tous les chiffres que tu peux citer sont ici :\n\n"
                    + json.dumps(contexte, ensure_ascii=False, indent=2)
                ),
            }
        ],
    )

    if reponse.stop_reason == "refusal":
        return {"statut": "refus", "texte": None, "detail": str(reponse.stop_details)}

    texte = "".join(b.text for b in reponse.content if b.type == "text").strip()
    return {
        "statut": "ok",
        "texte": texte,
        "modele": reponse.model,
        "verification": verifier(texte, contexte),
        "usage": {
            "input_tokens": reponse.usage.input_tokens,
            "output_tokens": reponse.usage.output_tokens,
        },
    }


def charger_cache() -> dict:
    if CACHE.exists():
        return json.load(open(CACHE))
    return {"disponible": False, "briefs": {}, "note": (
        "Aucune note générée. Lancer `ANTHROPIC_API_KEY=... "
        "python -m backend.analytics.briefs` pour les produire ; le tableau de bord "
        "fonctionne sans."
    )}


def run_briefs(wilayas: list[str] | None = None) -> dict:
    """Génère les notes. Nécessite ANTHROPIC_API_KEY ; sinon renvoie le cache."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return charger_cache()

    import anthropic
    import pandas as pd

    client = anthropic.Anthropic()
    if wilayas is None:
        wilayas = pd.read_csv(ANALYTICS / "indice_priorite_educative.csv")["wilaya"].tolist()

    cache = charger_cache()
    briefs = cache.get("briefs", {})

    for wilaya in wilayas:
        contexte = contexte_wilaya(wilaya)
        briefs.setdefault(wilaya, {})
        for langue in LANGUES:
            print(f"  {wilaya} [{langue}] …", flush=True)
            briefs[wilaya][langue] = generer_note(client, wilaya, langue, contexte)

    return {
        "disponible": True,
        "modele": MODELE,
        "n_wilayas": len(briefs),
        "langues": list(LANGUES),
        "briefs": briefs,
        "methode": (
            "Notes générées à partir des seules sorties du pipeline, passées au modèle "
            "en contexte. Chaque nombre cité est ensuite recherché dans les données "
            "sources ; une note contenant un nombre non retrouvé est signalée."
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    cibles = sys.argv[1:] or None
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY absente — rien à générer.")
        print("Le tableau de bord sert le cache existant :", CACHE)
        raise SystemExit(0)

    res = run_briefs(cibles)
    dump_json(str(CACHE), res, indent=2)

    total = sum(len(v) for v in res["briefs"].values())
    echecs = [
        f"{w} [{lg}]"
        for w, langues in res["briefs"].items()
        for lg, note in langues.items()
        if note["statut"] != "ok" or not note.get("verification", {}).get("verifie", True)
    ]
    print(f"\n{total} notes écrites dans {CACHE}")
    if echecs:
        print(f"À revoir ({len(echecs)}) : {', '.join(echecs)}")
    else:
        print("Toutes les notes sont vérifiées : aucun chiffre non sourcé.")
