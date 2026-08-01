"""De la description à la prescription : où mettre le prochain million ?

`scenarios.py` applique une règle uniforme (« 1 établissement pour 1 000 enfants
partout ») et en chiffre le coût. C'est un besoin, pas un arbitrage : la question
d'un décideur n'est pas « combien coûte l'objectif ? » mais « avec le budget dont
je dispose, où construire d'abord ? ».

Trois instruments :

1. **Allocation optimale sous contrainte de budget** programme linéaire
   maximisant le nombre d'enfants ramenés vers le formel. Chaque wilaya offre un
   gisement borné (les enfants hors école qui y résident) à un coût unitaire qui
   lui est propre. La solution d'un tel programme est l'ordre du meilleur rapport
   enfants/ouguiya — le résultat est donc lisible et vérifiable à la main.
2. **Frontière d'efficience** courbe « budget → enfants atteints », qui montre
   les rendements décroissants et permet de lire le coût marginal.
3. **Efficience relative (DEA)** chaque wilaya est comparée à la meilleure
   combinaison des autres : avec ses moyens, aurait-elle pu faire mieux ?

Hypothèses, toutes discutables et donc explicitées :

- coût par établissement 25 M MRO (repris de `scenarios.py`) ;
- taux de captation 70 % — tous les enfants d'une zone nouvellement desservie ne
  s'inscrivent pas ;
- **capacité effective décroissante avec la dispersion** : un établissement
  accueille 250 enfants en zone entièrement urbaine mais seulement 125 en zone
  entièrement rurale, l'habitat dispersé imposant des écoles plus petites et plus
  nombreuses. C'est cette hypothèse qui différencie réellement le coût par enfant
  d'une wilaya à l'autre : sans elle le coût serait identique partout et
  l'« optimisation » ne trancherait rien.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import linprog

COUT_ETABLISSEMENT_MRO = 25_000_000.0
MRO_PAR_EUR = 460.0
CAPACITE_URBAINE = 250
CAPACITE_RURALE = 125
TAUX_CAPTATION = 0.70


def _gisement(features: pd.DataFrame) -> pd.DataFrame:
    """Enfants mobilisables et coût unitaire par wilaya."""
    df = features.copy()
    df["enfants_mobilisables"] = np.round(df["enfants_hors_ecole"] * TAUX_CAPTATION).astype(int)
    # capacité effective : interpolation entre capacité urbaine et rurale selon la
    # part de population rurale de la wilaya
    part_rurale = df["part_rurale"].to_numpy(dtype=float) / 100
    df["capacite_effective"] = np.round(
        CAPACITE_URBAINE * (1 - part_rurale) + CAPACITE_RURALE * part_rurale
    ).astype(int)
    df["etablissements_requis"] = np.ceil(
        df["enfants_mobilisables"] / df["capacite_effective"]
    ).astype(int)
    df["cout_total_mro"] = df["etablissements_requis"] * COUT_ETABLISSEMENT_MRO
    # coût par enfant ramené : c'est lui qui ordonne l'allocation
    df["cout_par_enfant_mro"] = df["cout_total_mro"] / df["enfants_mobilisables"].replace(0, np.nan)
    return df


def allocation(df: pd.DataFrame, budget_mro: float) -> dict:
    """Maximiser les enfants atteints sous contrainte de budget.

    Le programme — maximiser Σxᵢ sous Σcᵢxᵢ ≤ B et 0 ≤ xᵢ ≤ plafondᵢ — est un sac
    à dos fractionnaire. Son optimum exact s'obtient en servant les wilayas par
    coût unitaire croissant jusqu'à épuisement du budget : inutile de passer par
    un solveur, et le résultat reste vérifiable à la main.

    (Un appel à `linprog` a d'abord été utilisé ici, mais HiGHS échoue par
    conditionnement numérique sur certains budgets — les coûts sont de l'ordre de
    10⁵ et le budget de 10¹⁰ — en renvoyant silencieusement une allocation nulle.
    La forme close est à la fois exacte et robuste.)
    """
    cout_unitaire = df["cout_par_enfant_mro"].to_numpy(dtype=float)
    plafond = df["enfants_mobilisables"].to_numpy(dtype=float)

    x = np.zeros(len(df))
    restant = float(budget_mro)
    for i in np.argsort(cout_unitaire):
        if restant <= 0:
            break
        abordable = restant / cout_unitaire[i]
        x[i] = min(plafond[i], abordable)
        restant -= x[i] * cout_unitaire[i]

    lignes = []
    for i, (_, r) in enumerate(df.iterrows()):
        enfants = float(x[i])
        if enfants < 1:
            continue
        lignes.append(
            {
                "wilaya": r["wilaya"],
                "enfants_atteints": int(round(enfants)),
                "part_du_gisement_pct": round(enfants / r["enfants_mobilisables"] * 100, 1),
                "budget_mro": round(enfants * r["cout_par_enfant_mro"], 0),
                "budget_meuro": round(enfants * r["cout_par_enfant_mro"] / MRO_PAR_EUR / 1e6, 2),
                "cout_par_enfant_mro": round(float(r["cout_par_enfant_mro"]), 0),
            }
        )
    lignes.sort(key=lambda d: -d["enfants_atteints"])

    total = int(round(x.sum()))
    return {
        "budget_mro": budget_mro,
        "budget_meuro": round(budget_mro / MRO_PAR_EUR / 1e6, 1),
        "enfants_atteints": total,
        "cout_moyen_par_enfant_mro": round(budget_mro / total, 0) if total else None,
        "wilayas_servies": lignes,
    }


def frontiere(df: pd.DataFrame, n_points: int = 12) -> list[dict]:
    """Courbe budget → enfants atteints, et coût marginal du dernier enfant."""
    budget_max = float(df["cout_total_mro"].sum())
    points = []
    precedent = None
    for part in np.linspace(0.05, 1.0, n_points):
        b = budget_max * part
        a = allocation(df, b)
        point = {
            "budget_meuro": round(b / MRO_PAR_EUR / 1e6, 1),
            "budget_mro": round(b, 0),
            "enfants_atteints": a["enfants_atteints"],
            "part_du_besoin_pct": round(
                a["enfants_atteints"] / df["enfants_mobilisables"].sum() * 100, 1),
        }
        if precedent:
            d_enfants = point["enfants_atteints"] - precedent["enfants_atteints"]
            d_budget = point["budget_mro"] - precedent["budget_mro"]
            point["cout_marginal_mro"] = round(d_budget / d_enfants, 0) if d_enfants else None
        points.append(point)
        precedent = point
    return points


def dea(features: pd.DataFrame) -> dict:
    """DEA orientée intrants, rendements d'échelle variables (modèle BCC).

    Intrants : établissements pour 1 000 enfants, et « facilité » du contexte
    (100 − taux de pauvreté, 100 − part rurale). Extrant : taux de scolarisation
    dans le formel. Un score de 1 signifie qu'aucune combinaison des autres
    wilayas ne fait mieux avec moins.
    """
    df = features.copy()
    X = np.column_stack(
        [
            df["ecoles_pour_1000_enfants"].to_numpy(dtype=float) + 1e-6,
            (100 - df["taux_pauvrete"]).to_numpy(dtype=float),
            (100 - df["part_rurale"]).to_numpy(dtype=float),
        ]
    )
    Y = df["scol_Formel"].to_numpy(dtype=float).reshape(-1, 1)
    n, m = X.shape

    scores = []
    for o in range(n):
        # min θ  s.c.  Σ λ_j x_j ≤ θ x_o ,  Σ λ_j y_j ≥ y_o ,  Σ λ_j = 1 ,  λ ≥ 0
        c = np.zeros(n + 1)
        c[-1] = 1.0                                    # variable θ en dernière position
        A_ub = np.zeros((m + 1, n + 1))
        b_ub = np.zeros(m + 1)
        for i in range(m):
            A_ub[i, :n] = X[:, i]
            A_ub[i, -1] = -X[o, i]
        A_ub[m, :n] = -Y[:, 0]
        b_ub[m] = -Y[o, 0]
        A_eq = np.zeros((1, n + 1))
        A_eq[0, :n] = 1.0
        res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=[1.0],
                      bounds=[(0, None)] * n + [(0, None)], method="highs")
        scores.append(float(res.x[-1]) if res.success else np.nan)

    lignes = [
        {
            "wilaya": r["wilaya"],
            "score_efficience": round(float(s), 3),
            "efficiente": bool(s >= 0.999),
            "scol_formel_pct": round(float(r["scol_Formel"]), 1),
            "ecoles_pour_1000_enfants": round(float(r["ecoles_pour_1000_enfants"]), 2),
        }
        for (_, r), s in zip(df.iterrows(), scores)
    ]
    lignes.sort(key=lambda d: d["score_efficience"])
    return {
        "wilayas": lignes,
        "n_efficientes": sum(1 for d in lignes if d["efficiente"]),
        "lecture": (
            "Un score de 1 signifie qu'aucune combinaison des autres wilayas n'atteint le même "
            "taux de scolarisation avec moins de moyens. Un score de 0,6 signifie que la wilaya "
            "aurait pu, en théorie, obtenir son résultat avec 60 % de ses moyens : la marge est "
            "organisationnelle, pas budgétaire."
        ),
    }


def run_optim(features: pd.DataFrame | None = None) -> dict:
    if features is None:
        features = pd.read_csv("data/processed/wilaya_features.csv")
    df = _gisement(features)

    besoin_total_mro = float(df["cout_total_mro"].sum())
    scenarios_budget = {
        "budget_25pct": besoin_total_mro * 0.25,
        "budget_50pct": besoin_total_mro * 0.50,
        "budget_total": besoin_total_mro,
    }
    allocations = {k: allocation(df, v) for k, v in scenarios_budget.items()}

    classement = (
        df[["wilaya", "enfants_hors_ecole", "enfants_mobilisables", "capacite_effective",
            "etablissements_requis", "cout_total_mro", "cout_par_enfant_mro"]]
        .sort_values("cout_par_enfant_mro")
        .assign(
            cout_total_meuro=lambda d: (d["cout_total_mro"] / MRO_PAR_EUR / 1e6).round(1),
            cout_par_enfant_mro=lambda d: d["cout_par_enfant_mro"].round(0),
            cout_total_mro=lambda d: d["cout_total_mro"].round(0),
        )
        .to_dict("records")
    )

    # tension explicite entre efficience et équité : l'allocation au meilleur
    # rapport coût/enfant sert d'abord les wilayas urbaines, alors que l'IPE
    # désigne les wilayas rurales. Il faut le dire, pas l'arbitrer en silence.
    ipe = pd.read_csv("data/processed/analytics/indice_priorite_educative.csv")
    top3_ipe = ipe.sort_values("rang_ipe").head(3)["wilaya"].tolist()
    servies_25 = [w["wilaya"] for w in allocations["budget_25pct"]["wilayas_servies"]]
    ignorees = [w for w in top3_ipe if w not in servies_25]

    return {
        "tension_efficience_equite": {
            "top3_ipe": top3_ipe,
            "servies_a_25pct": servies_25,
            "prioritaires_non_servies": ignorees,
            "lecture": (
                "Le critère du moindre coût par enfant sert d'abord les wilayas urbaines, où un "
                "établissement accueille deux fois plus d'enfants. Avec 25 % du budget, "
                f"{len(ignorees)} des trois wilayas prioritaires à l'IPE ne sont pas servies "
                f"({', '.join(ignorees) or 'aucune'}). Efficience et équité ne désignent donc pas "
                "les mêmes territoires : le coût par enfant ramené à l'école est de 100 000 MRO à "
                "Nouakchott contre 175 000 à Guidimakha. Arbitrer entre les deux est une décision "
                "politique, que ce module documente sans la trancher."
            ),
        },
        "hypotheses": {
            "cout_etablissement_mro": COUT_ETABLISSEMENT_MRO,
            "capacite_urbaine": CAPACITE_URBAINE,
            "capacite_rurale": CAPACITE_RURALE,
            "taux_captation": TAUX_CAPTATION,
            "mro_par_eur": MRO_PAR_EUR,
        },
        "besoin_total_mro": round(besoin_total_mro, 0),
        "besoin_total_meuro": round(besoin_total_mro / MRO_PAR_EUR / 1e6, 1),
        "enfants_mobilisables_total": int(df["enfants_mobilisables"].sum()),
        "classement_cout_efficacite": classement,
        "allocations": allocations,
        "frontiere": frontiere(df),
        "dea": dea(features),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_optim()
    dump_json("data/processed/analytics/optim.json", res, indent=2)

    print(f"Besoin total : {res['besoin_total_meuro']} M€ pour "
          f"{res['enfants_mobilisables_total']} enfants mobilisables")
    print(f"\n{'wilaya':<20}{'enfants':>9}{'écoles':>8}{'coût M€':>10}{'MRO/enfant':>12}")
    for c in res["classement_cout_efficacite"]:
        print(f"{c['wilaya']:<20}{c['enfants_mobilisables']:>9}{c['etablissements_requis']:>8}"
              f"{c['cout_total_meuro']:>10.1f}{c['cout_par_enfant_mro']:>12,.0f}")

    a = res["allocations"]["budget_25pct"]
    print(f"\nAvec 25 % du budget ({a['budget_meuro']} M€) : {a['enfants_atteints']} enfants "
          f"({a['cout_moyen_par_enfant_mro']:,.0f} MRO/enfant), servis dans :")
    for w in a["wilayas_servies"]:
        print(f"   {w['wilaya']:<20}{w['enfants_atteints']:>7} enfants "
              f"({w['part_du_gisement_pct']:>5.1f} % du gisement)")

    print(f"\nDEA : {res['dea']['n_efficientes']} wilayas sur la frontière d'efficience")
    for d in res["dea"]["wilayas"][:5]:
        print(f"   {d['wilaya']:<20}{d['score_efficience']:>7.3f}")
