"""Incertitude d'échantillonnage des taux wilaya.

Les taux affichés par le tableau de bord sont des estimations tirées d'un
échantillon très inégal : 267 enfants 6-14 ans en Inchiri contre 2 619 à
Nouakchott. Les publier à la décimale sans marge d'erreur laisse croire à une
précision qui n'existe pas. Ce module produit :

1. un intervalle de confiance à 95 % par bootstrap non paramétrique pour chaque
   taux wilaya (hors école, mahadra/coranique, aucune instruction) et sa
   traduction en effectifs d'enfants ;
2. un estimateur rétréci (empirical Bayes, James-Stein binomial) qui rapproche
   les wilayas à faible effectif de la moyenne nationale, proportionnellement à
   leur imprécision ;
3. l'effet de ce rétrécissement sur le classement IPE : les rangs des petites
   wilayas sont-ils robustes ?

Limite assumée le fichier EPCV fourni ne contient ni identifiant de ménage,
ni pondération, ni strate. Le bootstrap est donc un tirage simple avec remise
sur les individus : il ignore l'effet de grappe et constitue une **borne
optimiste** de l'incertitude réelle (cf. docs/DATA_SOURCES.md).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from backend.analytics.index import build_index
from backend.pipeline.build_dataset import age_group6_14, load_epcv

FORMEL = {"Oui Ecole formelle uniquement", "Oui Ecole formelle et enseignement coranique"}
TRAD = {"Oui Mahadra uniquement", "Oui enseignement coranique uniquement"}

N_BOOT = 2000
SEED = 42


def _indicators(statut: pd.Series) -> dict[str, np.ndarray]:
    """Vecteurs booléens 0/1 des trois indicateurs, alignés sur les individus."""
    return {
        "hors_ecole": (~statut.isin(FORMEL)).to_numpy(dtype=float),
        "mahadra": statut.isin(TRAD).to_numpy(dtype=float),
        "aucune": (statut == "Non").to_numpy(dtype=float),
    }


def _bootstrap_ci(x: np.ndarray, rng: np.random.Generator, n_boot: int = N_BOOT) -> dict:
    """IC 95 % percentile sur la moyenne d'un vecteur 0/1, exprimée en %."""
    n = len(x)
    if n == 0:
        return {"pct": None, "ci_lo": None, "ci_hi": None, "marge": None}
    idx = rng.integers(0, n, size=(n_boot, n))
    means = x[idx].mean(axis=1) * 100
    lo, hi = np.percentile(means, [2.5, 97.5])
    point = float(x.mean() * 100)
    return {
        "pct": round(point, 2),
        "ci_lo": round(float(lo), 2),
        "ci_hi": round(float(hi), 2),
        "marge": round(float(hi - lo) / 2, 2),
    }


def _empirical_bayes(p: np.ndarray, n: np.ndarray) -> tuple[np.ndarray, np.ndarray, float, float]:
    """Rétrécissement James-Stein binomial vers la moyenne nationale pondérée.

    p_rétréci_i = w_i * p_i + (1 - w_i) * mu, avec w_i = tau² / (tau² + s_i²),
    s_i² = p_i(1-p_i)/n_i (variance d'échantillonnage) et tau² la variance
    inter-wilaya estimée par méthode des moments. Une wilaya à gros effectif
    (s_i² petit) garde son estimation ; une petite wilaya est tirée vers mu.
    """
    mu = float(np.average(p, weights=n))
    s2 = p * (1 - p) / n
    tau2 = max(float(np.var(p, ddof=1) - s2.mean()), 0.0)
    w = tau2 / (tau2 + s2) if tau2 > 0 else np.zeros_like(p)
    return w * p + (1 - w) * mu, w, mu, tau2


def run_uncertainty(features: pd.DataFrame | None = None) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/wilaya_features.csv")
    rng = np.random.default_rng(SEED)

    kids = age_group6_14(load_epcv())
    pop = features.set_index("wilaya")["pop_6_14_2022"]

    rows = []
    for wilaya, grp in kids.groupby("wilaya"):
        ind = _indicators(grp["educ_statut"])
        rec = {"wilaya": wilaya, "n_echantillon": int(len(grp))}
        for key, vec in ind.items():
            ci = _bootstrap_ci(vec, rng)
            rec[key] = ci
        # traduction en effectifs d'enfants (population 2022 de la wilaya)
        p6_14 = int(pop.get(wilaya, 0))
        he = rec["hors_ecole"]
        rec["enfants_hors_ecole"] = int(round(he["pct"] / 100 * p6_14))
        rec["enfants_ci_lo"] = int(round(he["ci_lo"] / 100 * p6_14))
        rec["enfants_ci_hi"] = int(round(he["ci_hi"] / 100 * p6_14))
        rows.append(rec)

    rows.sort(key=lambda r: -r["hors_ecole"]["pct"])

    # ---- rétrécissement empirical Bayes sur le taux hors école --------------
    order = [r["wilaya"] for r in rows]
    p = np.array([r["hors_ecole"]["pct"] / 100 for r in rows])
    n = np.array([r["n_echantillon"] for r in rows], dtype=float)
    p_eb, w, mu, tau2 = _empirical_bayes(p, n)
    for r, pe, wi in zip(rows, p_eb, w):
        r["hors_ecole_retreci_pct"] = round(float(pe * 100), 2)
        r["poids_donnees"] = round(float(wi), 3)
        r["deplacement_pts"] = round(float(pe * 100 - r["hors_ecole"]["pct"]), 2)

    # ---- effet sur le classement IPE ---------------------------------------
    shrunk = features.copy().set_index("wilaya")
    shrunk.loc[order, "scol_Hors_ecole_formelle"] = p_eb * 100
    shrunk["enfants_hors_ecole"] = np.round(
        shrunk["scol_Hors_ecole_formelle"] / 100 * shrunk["pop_6_14_2022"]
    ).astype(int)
    ipe_base = build_index(features).set_index("wilaya")
    ipe_eb = build_index(shrunk.reset_index()).set_index("wilaya")

    classement = []
    for wilaya in ipe_base.index:
        classement.append(
            {
                "wilaya": wilaya,
                "rang_brut": int(ipe_base.loc[wilaya, "rang_ipe"]),
                "rang_retreci": int(ipe_eb.loc[wilaya, "rang_ipe"]),
                "ipe_brut": float(ipe_base.loc[wilaya, "ipe"]),
                "ipe_retreci": float(ipe_eb.loc[wilaya, "ipe"]),
            }
        )
        classement[-1]["variation_rang"] = classement[-1]["rang_brut"] - classement[-1]["rang_retreci"]
    classement.sort(key=lambda c: c["rang_brut"])

    n_stables = sum(1 for c in classement if c["variation_rang"] == 0)
    plus_incertaine = min(rows, key=lambda r: r["n_echantillon"])
    plus_large = max(rows, key=lambda r: r["hors_ecole"]["marge"])

    return {
        "n_boot": N_BOOT,
        "niveau_confiance": 95,
        "wilayas": rows,
        "classement": classement,
        "rangs_inchanges": n_stables,
        "moyenne_nationale_pct": round(mu * 100, 2),
        "variance_inter_wilaya": round(tau2, 6),
        "marge_mediane_pts": round(float(np.median([r["hors_ecole"]["marge"] for r in rows])), 2),
        "plus_petit_echantillon": {
            "wilaya": plus_incertaine["wilaya"],
            "n": plus_incertaine["n_echantillon"],
            "marge": plus_incertaine["hors_ecole"]["marge"],
        },
        "marge_la_plus_large": {
            "wilaya": plus_large["wilaya"],
            "n": plus_large["n_echantillon"],
            "marge": plus_large["hors_ecole"]["marge"],
        },
        "note": (
            "Bootstrap non paramétrique (tirage simple avec remise sur les individus). "
            "Le fichier EPCV fourni ne contient ni identifiant de ménage, ni pondération, "
            "ni strate : l'effet de grappe n'est pas modélisé et ces intervalles sont donc "
            "une borne optimiste de l'incertitude réelle."
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_uncertainty()
    dump_json("data/processed/analytics/uncertainty.json", res, indent=2)
    print(f"Bootstrap {res['n_boot']} tirages marge médiane ±{res['marge_mediane_pts']} pts")
    print(f"{'wilaya':<20}{'n':>6}{'taux':>8}{'IC 95 %':>18}{'±':>7}{'rétréci':>10}")
    for r in res["wilayas"]:
        he = r["hors_ecole"]
        ic = f"[{he['ci_lo']:.1f} – {he['ci_hi']:.1f}]"
        print(f"{r['wilaya']:<20}{r['n_echantillon']:>6}{he['pct']:>7.1f}%"
              f"{ic:>18}{he['marge']:>7.1f}{r['hors_ecole_retreci_pct']:>9.1f}%")
    print(f"\nRangs IPE inchangés après rétrécissement : {res['rangs_inchanges']}/13")
    for c in res["classement"]:
        if c["variation_rang"]:
            print(f"  {c['wilaya']:<20} rang {c['rang_brut']} -> {c['rang_retreci']}")
