"""Fouille de motifs : au-delà d'Apriori.

`rules.py` énumère des règles d'association et les trie par lift. Trois limites
qu'on lève ici :

1. **Apriori n'optimise pas la question posée.** On veut « quel sous-groupe
   concentre le plus d'exclusion, en tenant compte de sa taille ». C'est
   exactement ce que maximise la *découverte de sous-groupes* par WRAcc
   (Weighted Relative Accuracy), qu'on explore ici par recherche en faisceau.
2. **Aucune règle n'est testée.** Un lift de 2 sur 300 enfants n'a pas le même
   statut qu'un lift de 2 sur 3 000. Chaque motif reçoit ici un test exact de
   Fisher et une correction de Benjamini-Hochberg pour tests multiples.
3. **Les règles sont redondantes.** Si {rural, pauvre} → hors école et
   {rural, pauvre, fille} → hors école ont la même confiance, la seconde
   n'apprend rien. On ne garde que les motifs non dominés.

FP-Growth remplace Apriori pour l'énumération (même résultat, sans génération
de candidats).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from mlxtend.frequent_patterns import association_rules, fpgrowth
from scipy.stats import fisher_exact

from backend.analytics.rules import REGION_GROUPS
from backend.pipeline.build_dataset import age_group6_14, load_epcv

FORMEL = {"Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"}

CIBLE = "hors_ecole"
LARGEUR_FAISCEAU = 12
PROFONDEUR_MAX = 4
TAILLE_MIN = 200          # un sous-groupe plus petit n'est pas actionnable


def build_items() -> pd.DataFrame:
    """Table booléenne enrichie des variables de parcours (retard, niveau)."""
    kids = age_group6_14(load_epcv())
    inv = {v: k for k, v in zip(REGION_GROUPS.keys(), REGION_GROUPS.values())}  # noqa: F841

    out = pd.DataFrame(
        {
            CIBLE: ~kids["educ_statut"].isin(FORMEL),
            "fille": kids["sexe"].eq("Féminin"),
            "garcon": kids["sexe"].eq("Masculin"),
            "rural": kids["milieu"].eq("Rural"),
            "urbain": kids["milieu"].eq("Urbain"),
            "pauvre": kids["pauvre"].astype(bool),
            "non_pauvre": ~kids["pauvre"].astype(bool),
            "age_6_8": kids["age"].between(6, 8),
            "age_9_11": kids["age"].between(9, 11),
            "age_12_14": kids["age"].between(12, 14),
        },
        index=kids.index,
    )
    # wilaya regroupée en région (mêmes groupes que rules.py, pour la cohérence)
    codes = {v: k for k, v in enumerate(sorted(kids["wilaya"].unique()), start=1)}  # noqa: F841
    region = kids["wilaya"].map(_region_par_wilaya())
    out = pd.concat([out, pd.get_dummies(region, prefix="region", dtype=bool)], axis=1)
    return out


def _region_par_wilaya() -> dict[str, str]:
    from backend.pipeline.build_dataset import CANONICAL

    return {CANONICAL[code]: groupe for code, groupe in REGION_GROUPS.items()}


# ---------------------------------------------------------------------------
# 1. FP-Growth + test de significativité + élagage
# ---------------------------------------------------------------------------
def _bh(pvalues: list[float], alpha: float = 0.05) -> list[bool]:
    """Benjamini-Hochberg : contrôle du taux de fausses découvertes."""
    n = len(pvalues)
    ordre = np.argsort(pvalues)
    seuils = (np.arange(1, n + 1) / n) * alpha
    tries = np.array(pvalues)[ordre]
    passe = tries <= seuils
    k = np.max(np.where(passe)[0]) + 1 if passe.any() else 0
    retenus = np.zeros(n, dtype=bool)
    retenus[ordre[:k]] = True
    return retenus.tolist()


def regles_testees(items: pd.DataFrame, min_support: float = 0.02) -> dict:
    freq = fpgrowth(items, min_support=min_support, use_colnames=True)
    regles = association_rules(freq, metric="confidence", min_threshold=0.40)
    masque = regles["consequents"].apply(lambda s: s == frozenset({CIBLE}))
    regles = regles[masque & (regles["lift"] > 1.0)].copy()
    if regles.empty:
        return {"n": 0, "regles": []}

    n_total = len(items)
    cible = items[CIBLE].to_numpy()

    lignes = []
    for _, r in regles.iterrows():
        ante = sorted(str(a) for a in r["antecedents"])
        masque_a = items[ante].all(axis=1).to_numpy()
        table = [
            [int((masque_a & cible).sum()), int((masque_a & ~cible).sum())],
            [int((~masque_a & cible).sum()), int((~masque_a & ~cible).sum())],
        ]
        _, p = fisher_exact(table, alternative="greater")
        lignes.append(
            {
                "antecedents": " & ".join(ante),
                "n_couvert": int(masque_a.sum()),
                "support": round(float(r["support"]), 4),
                "confidence": round(float(r["confidence"]), 3),
                "lift": round(float(r["lift"]), 2),
                "pvalue": float(p),
                "_ante": set(ante),
            }
        )

    retenus = _bh([l["pvalue"] for l in lignes])
    for l, ok in zip(lignes, retenus):
        l["significatif"] = bool(ok)

    # élagage : on retire tout motif dont un sous-ensemble strict fait aussi bien
    lignes.sort(key=lambda l: (len(l["_ante"]), -l["confidence"]))
    non_domines = []
    for l in lignes:
        domine = any(
            autre["_ante"] < l["_ante"] and autre["confidence"] >= l["confidence"] - 0.01
            for autre in non_domines
        )
        if not domine:
            non_domines.append(l)

    for l in lignes:
        l.pop("_ante", None)
    for l in non_domines:
        l.pop("_ante", None)

    non_domines.sort(key=lambda l: -l["lift"])
    return {
        "n_total": len(lignes),
        "n_significatifs": int(sum(retenus)),
        "n_non_domines": len(non_domines),
        "n_enfants": int(n_total),
        "regles": non_domines[:15],
        "methode": (
            "FP-Growth (support ≥ 2 %), test exact de Fisher unilatéral sur chaque motif, "
            "correction de Benjamini-Hochberg à 5 %, puis élagage des motifs dominés par "
            "un de leurs sous-ensembles à confiance équivalente."
        ),
    }


# ---------------------------------------------------------------------------
# 2. Découverte de sous-groupes (WRAcc, recherche en faisceau)
# ---------------------------------------------------------------------------
def _wracc(masque: np.ndarray, cible: np.ndarray, p0: float, n: int) -> float:
    taille = masque.sum()
    if taille == 0:
        return -1.0
    p = cible[masque].mean()
    return float(taille / n * (p - p0))


def sous_groupes(items: pd.DataFrame) -> dict:
    """Recherche en faisceau des conjonctions maximisant la WRAcc."""
    cible = items[CIBLE].to_numpy()
    attributs = [c for c in items.columns if c != CIBLE]
    n = len(items)
    p0 = float(cible.mean())

    faisceau: list[tuple[tuple[str, ...], np.ndarray, float]] = [((), np.ones(n, bool), 0.0)]
    meilleurs: dict[tuple[str, ...], float] = {}

    for _ in range(PROFONDEUR_MAX):
        candidats = []
        for conds, masque, _score in faisceau:
            for attr in attributs:
                if attr in conds:
                    continue
                nouveau = tuple(sorted(conds + (attr,)))
                if nouveau in meilleurs:
                    continue
                m = masque & items[attr].to_numpy()
                if m.sum() < TAILLE_MIN:
                    continue
                s = _wracc(m, cible, p0, n)
                meilleurs[nouveau] = s
                candidats.append((nouveau, m, s))
        if not candidats:
            break
        candidats.sort(key=lambda c: -c[2])
        faisceau = candidats[:LARGEUR_FAISCEAU]

    classement = []
    for conds, score in sorted(meilleurs.items(), key=lambda kv: -kv[1])[:40]:
        m = np.ones(n, bool)
        for c in conds:
            m &= items[c].to_numpy()
        taille = int(m.sum())
        taux = float(cible[m].mean() * 100)
        classement.append(
            {
                "conditions": list(conds),
                "description": " & ".join(conds),
                "n": taille,
                "part_population_pct": round(taille / n * 100, 1),
                "taux_hors_ecole_pct": round(taux, 1),
                "ecart_vs_national_pts": round(taux - p0 * 100, 1),
                "wracc": round(score, 4),
                "enfants_concernes_pct_du_total": round(
                    float(cible[m].sum() / cible.sum() * 100), 1),
            }
        )

    # on ne garde que les sous-groupes non redondants (aucun n'est un sur-ensemble
    # d'un meilleur déjà retenu avec un taux voisin)
    retenus = []
    for sg in classement:
        ens = set(sg["conditions"])
        if any(set(r["conditions"]) < ens and abs(r["taux_hors_ecole_pct"] - sg["taux_hors_ecole_pct"]) < 2
               for r in retenus):
            continue
        retenus.append(sg)
        if len(retenus) >= 10:
            break

    return {
        "taux_national_pct": round(p0 * 100, 1),
        "taille_min": TAILLE_MIN,
        "largeur_faisceau": LARGEUR_FAISCEAU,
        "profondeur_max": PROFONDEUR_MAX,
        "sous_groupes": retenus,
        "methode": (
            "Recherche en faisceau maximisant la WRAcc = (n_S/N) × (p_S − p₀). "
            "Ce critère arbitre explicitement entre l'intensité de l'exclusion dans le "
            "sous-groupe et le nombre d'enfants qu'il représente — un sous-groupe minuscule "
            "à 100 % d'exclusion n'est pas une priorité d'action."
        ),
    }


def run_patterns() -> dict:
    items = build_items()
    return {
        "regles": regles_testees(items),
        "sous_groupes": sous_groupes(items),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_patterns()
    dump_json("data/processed/analytics/patterns.json", res, indent=2)

    r = res["regles"]
    print(f"FP-Growth : {r['n_total']} règles, {r['n_significatifs']} significatives (BH 5 %), "
          f"{r['n_non_domines']} non dominées")
    for x in r["regles"][:8]:
        etoile = "***" if x["significatif"] else "   "
        print(f"  {etoile} {x['antecedents']:<46} conf={x['confidence']:.3f} "
              f"lift={x['lift']:.2f} n={x['n_couvert']}")

    s = res["sous_groupes"]
    print(f"\nDécouverte de sous-groupes (national {s['taux_national_pct']} %) :")
    print(f"  {'sous-groupe':<44}{'n':>6}{'taux':>8}{'écart':>8}{'% du hors-école':>17}")
    for sg in s["sous_groupes"]:
        print(f"  {sg['description']:<44}{sg['n']:>6}{sg['taux_hors_ecole_pct']:>7.1f}%"
              f"{sg['ecart_vs_national_pts']:>+8.1f}{sg['enfants_concernes_pct_du_total']:>16.1f}%")
