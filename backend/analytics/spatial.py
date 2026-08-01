"""Autocorrélation spatiale : l'exclusion scolaire est-elle contagieuse ?

La carte choroplèthe suggère visuellement un corridor d'exclusion dans le sud-est.
« Suggérer » n'est pas « montrer » : un regroupement de couleurs peut parfaitement
résulter du hasard. Ce module le teste.

- **I de Moran global** mesure si les wilayas voisines se ressemblent plus que
  des wilayas tirées au hasard. Significativité par test de permutation (999
  redistributions aléatoires des valeurs sur la carte), seul test valide ici :
  avec 13 unités, l'approximation normale n'est pas fiable.
- **LISA** (Local Indicators of Spatial Association) décompose le I global en
  contributions locales et classe chaque wilaya en *high-high* (foyer
  d'exclusion), *low-low*, ou atypique par rapport à son voisinage.

La matrice de voisinage est construite par contiguïté « reine » (deux wilayas
sont voisines si leurs frontières se touchent), lue directement dans le GeoJSON.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
from shapely.geometry import shape
from shapely.ops import unary_union

GEOJSON = "data/processed/mauritania_wilayas.geojson"
N_PERMUTATIONS = 999
SEED = 42

VARIABLES = {
    "ipe": "Indice de Priorité Éducative",
    "scol_Hors_ecole_formelle": "Taux hors école formelle",
    "taux_pauvrete": "Taux de pauvreté",
}


def matrice_voisinage(noms: list[str]) -> tuple[np.ndarray, dict]:
    """Contiguïté reine, normalisée en ligne, depuis les frontières du GeoJSON."""
    geo = json.load(open(GEOJSON))
    formes: dict[str, list] = {}
    for f in geo["features"]:
        nom = f["properties"].get("wilaya") or f["properties"].get("adm1_name")
        if nom in noms:
            formes.setdefault(nom, []).append(shape(f["geometry"]))
    geometries = {n: unary_union(v).buffer(0) for n, v in formes.items()}

    n = len(noms)
    W = np.zeros((n, n))
    voisins: dict[str, list[str]] = {}
    for i, a in enumerate(noms):
        liste = []
        for j, b in enumerate(noms):
            if i == j or a not in geometries or b not in geometries:
                continue
            # `intersects` plutôt que `touches` : les frontières du COD-AB ne sont
            # pas parfaitement raccordées et `touches` en manquerait plusieurs.
            if geometries[a].intersects(geometries[b]):
                W[i, j] = 1.0
                liste.append(b)
        voisins[a] = liste

    # normalisation en ligne : chaque wilaya pèse autant, quel que soit son nombre de voisins
    sommes = W.sum(axis=1, keepdims=True)
    W_norm = np.divide(W, sommes, out=np.zeros_like(W), where=sommes > 0)
    return W_norm, voisins


def moran_global(y: np.ndarray, W: np.ndarray, rng: np.random.Generator) -> dict:
    z = y - y.mean()
    denom = (z**2).sum()
    if denom == 0:
        return {"I": None}
    n = len(y)
    S0 = W.sum()

    def _I(zz: np.ndarray) -> float:
        return float(n / S0 * (zz @ W @ zz) / (zz**2).sum())

    I = _I(z)
    simules = np.array([_I(rng.permutation(z)) for _ in range(N_PERMUTATIONS)])
    # p pseudo-unilatéral : proportion de tirages au moins aussi extrêmes
    p = float((np.abs(simules) >= abs(I)).sum() + 1) / (N_PERMUTATIONS + 1)
    return {
        "I": round(I, 3),
        "I_attendu_sous_H0": round(-1 / (n - 1), 3),
        "pvalue_permutation": round(p, 4),
        "significatif": bool(p < 0.05),
        "n_permutations": N_PERMUTATIONS,
        "distribution_simulee": {
            "moyenne": round(float(simules.mean()), 3),
            "ecart_type": round(float(simules.std()), 3),
            "p05": round(float(np.percentile(simules, 5)), 3),
            "p95": round(float(np.percentile(simules, 95)), 3),
        },
    }


def lisa(noms: list[str], y: np.ndarray, W: np.ndarray, rng: np.random.Generator) -> list[dict]:
    z = (y - y.mean()) / y.std(ddof=0)
    lag = W @ z
    Ii = z * lag

    # significativité locale par permutation conditionnelle
    n = len(y)
    pvals = np.empty(n)
    for i in range(n):
        autres = np.delete(z, i)
        k = int((W[i] > 0).sum())
        if k == 0:
            pvals[i] = 1.0
            continue
        simules = np.array([
            z[i] * rng.choice(autres, size=k, replace=False).mean()
            for _ in range(N_PERMUTATIONS)
        ])
        pvals[i] = (np.abs(simules) >= abs(Ii[i])).sum() + 1
        pvals[i] /= N_PERMUTATIONS + 1

    lignes = []
    for i, nom in enumerate(noms):
        if z[i] >= 0 and lag[i] >= 0:
            quadrant = "haut-haut"
        elif z[i] < 0 and lag[i] < 0:
            quadrant = "bas-bas"
        elif z[i] >= 0 > lag[i]:
            quadrant = "haut-bas"
        else:
            quadrant = "bas-haut"
        lignes.append(
            {
                "wilaya": nom,
                "z": round(float(z[i]), 2),
                "lag_voisinage": round(float(lag[i]), 2),
                "lisa": round(float(Ii[i]), 3),
                "pvalue": round(float(pvals[i]), 4),
                "significatif": bool(pvals[i] < 0.05),
                "quadrant": quadrant,
            }
        )
    lignes.sort(key=lambda d: -d["lisa"])
    return lignes


def run_spatial(features: pd.DataFrame | None = None) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/analytics/indice_priorite_educative.csv")
    noms = features["wilaya"].tolist()
    W, voisins = matrice_voisinage(noms)
    rng = np.random.default_rng(SEED)

    resultats = {}
    for cle, libelle in VARIABLES.items():
        y = features[cle].to_numpy(dtype=float)
        glob = moran_global(y, W, rng)
        resultats[cle] = {
            "label": libelle,
            "moran": glob,
            "lisa": lisa(noms, y, W, rng),
        }

    principal = resultats["ipe"]["moran"]
    foyers = [d["wilaya"] for d in resultats["ipe"]["lisa"]
              if d["quadrant"] == "haut-haut" and d["significatif"]]
    foyers_non_sig = [d["wilaya"] for d in resultats["ipe"]["lisa"]
                      if d["quadrant"] == "haut-haut"]

    return {
        "voisinage": {
            "wilayas": noms,
            "voisins": voisins,
            "n_liens": int((W > 0).sum()),
            "methode": "contiguïté reine, normalisée en ligne",
        },
        "variables": resultats,
        "conclusion": (
            f"I de Moran sur l'IPE = {principal['I']} (attendu sous l'hypothèse nulle : "
            f"{principal['I_attendu_sous_H0']}), p = {principal['pvalue_permutation']} sur "
            f"{principal['n_permutations']} permutations. "
            + (
                "L'exclusion scolaire est donc spatialement structurée : les wilayas en difficulté "
                "sont voisines les unes des autres, ce qui plaide pour des programmes de corridor "
                "plutôt que wilaya par wilaya."
                if principal["significatif"] else
                "L'autocorrélation n'est pas statistiquement significative au seuil de 5 %. "
                "Le regroupement visible sur la carte reste compatible avec le hasard : avec "
                "13 unités seulement, la puissance du test est faible et ce résultat ne permet "
                "ni d'affirmer ni d'exclure une structure spatiale."
            )
            + (
                f" Les foyers d'exclusion (haut-haut) sont : {', '.join(foyers_non_sig)}"
                f"{' — dont ' + ', '.join(foyers) + ' de manière significative' if foyers else ', aucun significatif individuellement'}."
                if foyers_non_sig else ""
            )
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_spatial()
    dump_json("data/processed/analytics/spatial.json", res, indent=2)

    v = res["voisinage"]
    print(f"Voisinage : {v['n_liens']} liens ({v['methode']})")
    for w, vs in v["voisins"].items():
        print(f"  {w:<20} {len(vs)} voisins : {', '.join(vs)}")

    print()
    for cle, r in res["variables"].items():
        m = r["moran"]
        etoile = "***" if m["significatif"] else ""
        print(f"{r['label']:<28} I = {m['I']:+.3f}  p = {m['pvalue_permutation']:.4f} {etoile}")

    print("\n--- LISA sur l'IPE ---")
    for d in res["variables"]["ipe"]["lisa"]:
        etoile = "*" if d["significatif"] else " "
        print(f"  {d['wilaya']:<20}{d['quadrant']:<12}z={d['z']:+.2f} "
              f"voisinage={d['lag_voisinage']:+.2f}  p={d['pvalue']:.3f} {etoile}")

    print(f"\n{res['conclusion']}")
