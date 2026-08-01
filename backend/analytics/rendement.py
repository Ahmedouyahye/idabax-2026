"""Rendement de l'éducation : emploi, pauvreté, et ce que le diplôme change vraiment.

Le projet plaide pour investir dans l'école formelle sans jamais montrer ce
qu'elle rapporte. Les variables `chom` (chômage BIT) et `pauv` (pauvreté) sont
disponibles pour tous les individus et croisables avec le niveau d'instruction.

Le résultat est contre-intuitif et doit être présenté comme tel :

- l'école formelle **n'améliore pas** le taux de chômage — les diplômés du
  supérieur sont plus souvent au chômage que les non-scolarisés ;
- mais elle **divise la pauvreté par quatre**.

L'explication tient au sens de l'indicateur BIT : est au chômage celui qui
*cherche* un emploi. En milieu rural non scolarisé, on est occupé (agriculture,
élevage, informel) donc pas « chômeur », et pauvre. Le diplôme fait entrer dans
un marché du travail où l'on peut être en recherche — et où l'on est moins pauvre.

La décomposition d'Oaxaca-Blinder sépare ensuite l'écart de pauvreté en :
- effet de **composition** (les scolarisés sont urbains, plus jeunes, etc.) ;
- effet de **structure**, c'est-à-dire le rendement propre de l'instruction.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm

from backend.pipeline.build_dataset import load_epcv

FORMEL_NIVEAUX = {
    "Primaire", "Collège", "Lycée", "Lycée technique", "Etablissement professionnel",
    "Universitaire", "Supérieur technique", "Supérieur professionnel",
}
NON_FORMEL = {"Coranique", "Mahadra", "Programme d’alphabétisatio"}

ORDRE_NIVEAUX = [
    "Jamais scolarisé", "Coranique", "Mahadra", "Primaire", "Collège",
    "Lycée", "Universitaire",
]


def _actifs(epcv: pd.DataFrame) -> pd.DataFrame:
    d = epcv[(epcv["age"] >= 15) & (epcv["age"] <= 64)].copy()
    d["niveau_lisible"] = d["niveau"].fillna("Jamais scolarisé")
    d["formel"] = d["niveau"].isin(FORMEL_NIVEAUX).astype(int)
    d["pauvre_i"] = d["pauvre"].astype(bool).astype(int)
    d["chomage_i"] = d["chomage"].astype(bool).astype(int)
    return d


def par_niveau(actifs: pd.DataFrame) -> dict:
    lignes = []
    for niveau in ORDRE_NIVEAUX:
        grp = actifs[actifs["niveau_lisible"] == niveau]
        if len(grp) < 30:  # effectifs trop faibles pour être publiés
            continue
        lignes.append(
            {
                "niveau": niveau,
                "n": int(len(grp)),
                "chomage_pct": round(float(grp["chomage_i"].mean() * 100), 1),
                "pauvrete_pct": round(float(grp["pauvre_i"].mean() * 100), 1),
                "part_rurale_pct": round(float((grp["milieu"] == "Rural").mean() * 100), 1),
                "age_median": float(grp["age"].median()),
                "formel": bool(niveau in FORMEL_NIVEAUX),
            }
        )
    return {"niveaux": lignes}


def ecart_formel(actifs: pd.DataFrame) -> dict:
    a = actifs[actifs["formel"] == 1]
    b = actifs[actifs["formel"] == 0]
    return {
        "n_formel": int(len(a)),
        "n_non_formel": int(len(b)),
        "pauvrete_formel_pct": round(float(a["pauvre_i"].mean() * 100), 1),
        "pauvrete_non_formel_pct": round(float(b["pauvre_i"].mean() * 100), 1),
        "chomage_formel_pct": round(float(a["chomage_i"].mean() * 100), 1),
        "chomage_non_formel_pct": round(float(b["chomage_i"].mean() * 100), 1),
        "ecart_pauvrete_pts": round(float((b["pauvre_i"].mean() - a["pauvre_i"].mean()) * 100), 1),
    }


def _design(d: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame(
        {
            "age": d["age"].astype(float),
            "age2": (d["age"].astype(float) ** 2) / 100,
            "rural": (d["milieu"] == "Rural").astype(float),
            "feminin": (d["sexe"] == "Féminin").astype(float),
        },
        index=d.index,
    )
    wil = pd.get_dummies(d["wilaya"], prefix="w", drop_first=True, dtype=float)
    return sm.add_constant(pd.concat([X, wil], axis=1), has_constant="add")


def oaxaca_blinder(actifs: pd.DataFrame) -> dict:
    """Décomposition en deux termes de l'écart de pauvreté non-formel / formel.

    Modèle de probabilité linéaire estimé séparément sur chaque groupe :
      écart = (X̄_B − X̄_A)'β_A        → composition (qui sont-ils)
            + X̄_B'(β_B − β_A)         → structure (rendement propre du diplôme)
    A = instruits dans le formel, B = non instruits dans le formel.
    """
    a = actifs[actifs["formel"] == 1]
    b = actifs[actifs["formel"] == 0]

    Xa, Xb = _design(a), _design(b)
    Xb = Xb.reindex(columns=Xa.columns, fill_value=0.0)

    ma = sm.OLS(a["pauvre_i"].astype(float), Xa).fit()
    mb = sm.OLS(b["pauvre_i"].astype(float), Xb).fit()

    xa, xb = Xa.mean(), Xb.mean()
    ba, bb = ma.params, mb.params.reindex(ma.params.index).fillna(0.0)

    composition = float(((xb - xa) * ba).sum())
    structure = float((xb * (bb - ba)).sum())
    ecart = float(b["pauvre_i"].mean() - a["pauvre_i"].mean())

    detail = []
    for var in ["rural", "feminin", "age", "age2"]:
        if var in ba.index:
            detail.append(
                {
                    "variable": var,
                    "contribution_pts": round(float((xb[var] - xa[var]) * ba[var] * 100), 2),
                }
            )
    wil_contrib = sum(
        float((xb[c] - xa[c]) * ba[c]) for c in ba.index if c.startswith("w_")
    )
    detail.append({"variable": "wilaya", "contribution_pts": round(wil_contrib * 100, 2)})
    detail.sort(key=lambda d: -abs(d["contribution_pts"]))

    return {
        "ecart_total_pts": round(ecart * 100, 1),
        "composition_pts": round(composition * 100, 1),
        "structure_pts": round(structure * 100, 1),
        "composition_pct": round(composition / ecart * 100, 1) if ecart else None,
        "structure_pct": round(structure / ecart * 100, 1) if ecart else None,
        "detail_composition": detail,
        "lecture_cle": (
            "La part « structure » est celle qu'un programme de scolarisation peut espérer "
            "capter : elle mesure le rendement propre de l'instruction, à caractéristiques "
            "identiques. La part « composition » rappelle qu'une partie de l'écart tient à "
            "qui sont les personnes instruites (plus urbaines, plus jeunes), et non à "
            "l'instruction elle-même."
        ),
    }


def logit_pauvrete(actifs: pd.DataFrame) -> dict:
    """Odds-ratios ajustés de la pauvreté selon le niveau atteint (réf. jamais scolarisé)."""
    d = actifs.copy()
    X = _design(d)
    niveaux = [n for n in ORDRE_NIVEAUX[1:] if (d["niveau_lisible"] == n).sum() >= 30]
    for n in niveaux:
        X[f"niv_{n}"] = (d["niveau_lisible"] == n).astype(float)

    model = sm.Logit(d["pauvre_i"].astype(float), X).fit(disp=0, maxiter=200)
    ci = model.conf_int()

    features = []
    for n in niveaux:
        name = f"niv_{n}"
        features.append(
            {
                "niveau": n,
                "odds_ratio": round(float(np.exp(model.params[name])), 2),
                "ci_lo": round(float(np.exp(ci.loc[name, 0])), 2),
                "ci_hi": round(float(np.exp(ci.loc[name, 1])), 2),
                "pvalue": float(model.pvalues[name]),
            }
        )
    return {
        "n": int(len(d)),
        "reference": "Jamais scolarisé",
        "pseudo_r2": round(float(model.prsquared), 3),
        "niveaux": features,
        "controles": "âge, âge², milieu, sexe, wilaya",
    }


def run_rendement() -> dict:
    actifs = _actifs(load_epcv())
    return {
        "n_15_64": int(len(actifs)),
        **par_niveau(actifs),
        "ecart_formel": ecart_formel(actifs),
        "oaxaca": oaxaca_blinder(actifs),
        "logit_pauvrete": logit_pauvrete(actifs),
        "avertissement": (
            "Données transversales et observationnelles : ces écarts sont des associations, "
            "pas des effets causaux. Les personnes instruites diffèrent des autres sur des "
            "dimensions non observées (origine sociale, capital familial) que l'EPCV fourni "
            "ne permet pas de contrôler."
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_rendement()
    dump_json("data/processed/analytics/rendement.json", res, indent=2)

    print(f"Population 15-64 : {res['n_15_64']}")
    print(f"{'niveau':<18}{'n':>7}{'chômage':>10}{'pauvreté':>10}{'rural':>8}")
    for r in res["niveaux"]:
        print(f"{r['niveau']:<18}{r['n']:>7}{r['chomage_pct']:>9.1f}%{r['pauvrete_pct']:>9.1f}%"
              f"{r['part_rurale_pct']:>7.1f}%")

    e = res["ecart_formel"]
    print(f"\nFormel vs non formel : pauvreté {e['pauvrete_formel_pct']} % vs "
          f"{e['pauvrete_non_formel_pct']} % (écart {e['ecart_pauvrete_pts']} pts) | "
          f"chômage {e['chomage_formel_pct']} % vs {e['chomage_non_formel_pct']} %")

    o = res["oaxaca"]
    print(f"\nOaxaca-Blinder sur l'écart de pauvreté de {o['ecart_total_pts']} pts :")
    print(f"  composition (qui sont-ils)     {o['composition_pts']:>6} pts  ({o['composition_pct']} %)")
    print(f"  structure (rendement propre)   {o['structure_pts']:>6} pts  ({o['structure_pct']} %)")
    for d in o["detail_composition"][:4]:
        print(f"    dont {d['variable']:<10} {d['contribution_pts']:>6} pts")

    lp = res["logit_pauvrete"]
    print(f"\nOdds-ratios de pauvreté (réf. {lp['reference']}, contrôles : {lp['controles']}) :")
    for f in lp["niveaux"]:
        print(f"    {f['niveau']:<16} OR={f['odds_ratio']:>5.2f} [{f['ci_lo']}, {f['ci_hi']}]")
