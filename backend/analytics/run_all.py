"""Run all analytics and export precomputed JSON cache for the API.

Run: python -m backend.analytics.run_all
"""
from __future__ import annotations

import json

import pandas as pd

from backend.analytics import (acces, clustering, cohortes, concentration, decomposition,
                               deviants, equity, graph, indicateurs, index, logit, matrice, ml,
                               optim, parcours, patterns, projection, rendement, robustness,
                               rules, scenarios, spatial, stability, uncertainty)
from backend.sanitize import dump_json

ANALYTICS = "data/processed/analytics"


def main() -> None:
    features = pd.read_csv("data/processed/wilaya_features.csv")

    indexed = index.build_index(features)
    indexed.to_csv(f"{ANALYTICS}/indice_priorite_educative.csv", index=False)

    # k=3 retenu (typologie lisible : modérée / traditionnelle / aucune instruction),
    # le k=2 est légèrement supérieur en silhouette mais moins riche pour la décision.
    clustered = clustering.run_clustering(indexed, k=3)
    clustered.to_csv(f"{ANALYTICS}/clusters.csv", index=False)
    clusters_meta = json.load(open(f"{ANALYTICS}/clusters.json"))

    sim = graph.wilaya_similarity_graph(indexed)
    corr_g = graph.indicator_correlation_graph(indexed)
    dump_json(f"{ANALYTICS}/graph_similarite.json", sim, indent=2)
    dump_json(f"{ANALYTICS}/graph_correlations.json", corr_g, indent=2)

    rules_res = rules.run_rules()
    dump_json(f"{ANALYTICS}/regles_association.json", rules_res, indent=2)

    # ---- analyse avancée ---------------------------------------------------
    decomposition_res = decomposition.run_decomposition()
    dump_json(f"{ANALYTICS}/decomposition.json", decomposition_res, indent=2)

    matrice_res = matrice.run_matrice(indexed)
    dump_json(f"{ANALYTICS}/matrice.json", matrice_res, indent=2)

    concentration_res = concentration.run_concentration(indexed)
    dump_json(f"{ANALYTICS}/concentration.json", concentration_res, indent=2)

    logit_res = logit.run_logit()
    dump_json(f"{ANALYTICS}/logit.json", logit_res, indent=2)

    scenarios_res = scenarios.run_scenarios(indexed)
    dump_json(f"{ANALYTICS}/scenarios.json", scenarios_res, indent=2)

    indicateurs_res = indicateurs.run_indicateurs(features)
    dump_json(f"{ANALYTICS}/indicateurs.json", indicateurs_res, indent=2)

    # ---- rigueur statistique : incertitude, robustesse, équité --------------
    uncertainty_res = uncertainty.run_uncertainty(features)
    dump_json(f"{ANALYTICS}/uncertainty.json", uncertainty_res, indent=2)

    robustness_res = robustness.run_robustness(features)
    dump_json(f"{ANALYTICS}/robustness.json", robustness_res, indent=2)

    equity_res = equity.run_equity(features)
    dump_json(f"{ANALYTICS}/equity.json", equity_res, indent=2)

    # ---- connaissance implicite de l'EPCV : niveau atteint et générations -----
    parcours_res = parcours.run_parcours()
    dump_json(f"{ANALYTICS}/parcours.json", parcours_res, indent=2)

    rendement_res = rendement.run_rendement()
    dump_json(f"{ANALYTICS}/rendement.json", rendement_res, indent=2)

    cohortes_res = cohortes.run_cohortes()
    dump_json(f"{ANALYTICS}/cohortes.json", cohortes_res, indent=2)

    # ---- apprentissage, fouille de motifs, prescription ---------------------
    ml_res = ml.run_ml()
    dump_json(f"{ANALYTICS}/ml.json", ml_res, indent=2)

    patterns_res = patterns.run_patterns()
    dump_json(f"{ANALYTICS}/patterns.json", patterns_res, indent=2)

    deviants_res = deviants.run_deviants(features)
    dump_json(f"{ANALYTICS}/deviants.json", deviants_res, indent=2)

    stability_res = stability.run_stability(features, k_retenu=clusters_meta["k"])
    dump_json(f"{ANALYTICS}/stability.json", stability_res, indent=2)

    optim_res = optim.run_optim(features)
    dump_json(f"{ANALYTICS}/optim.json", optim_res, indent=2)

    # ---- géographie et démographie -----------------------------------------
    spatial_res = spatial.run_spatial(indexed)
    dump_json(f"{ANALYTICS}/spatial.json", spatial_res, indent=2)

    projection_res = projection.run_projection(features)
    dump_json(f"{ANALYTICS}/projection.json", projection_res, indent=2)

    acces_res = acces.run_acces()
    dump_json(f"{ANALYTICS}/acces.json", acces_res, indent=2)

    # geojson enrichi (IPE + cluster) valeurs strictement JSON-safe
    geo = json.load(open("data/processed/mauritania_wilayas.geojson"))
    lookup = clustered.set_index("wilaya")
    for f in geo["features"]:
        name = f["properties"]["wilaya"]
        if name in lookup.index:
            row = lookup.loc[name]
            f["properties"]["ipe"] = float(row["ipe"])
            f["properties"]["rang_ipe"] = int(row["rang_ipe"])
            f["properties"]["cluster"] = int(row["cluster"])
            f["properties"]["levier_action"] = str(row["levier_action"])
    dump_json("data/processed/mauritania_wilayas.geojson", geo)

    print("Analytics OK:")
    print(f" index: 13 wilayas classées")
    print(f" clusters: k={clusters_meta['k']}")
    for p in clusters_meta["profiles"]:
        print(f" C{p['cluster']} ({p['label']}): {p['wilayas']}")
    print(f" graphe similarité: {len(sim['edges'])} arêtes, {sim['n_communities']} communautés")
    print(f" graphe corrélations: {len(corr_g['edges'])} arêtes")
    print(f" règles association: {rules_res['n_rules']} règles")
    print(f" décomposition: {decomposition_res['n_children_6_14']} enfants 6-14")
    print(f" matrice: {len(matrice_res['quadrants'])} quadrants")
    print(f" concentration: top5 = {concentration_res['top5_share']:.1f}% du hors-école, "
          f"Gini = {concentration_res['gini']}")
    print(f" logit: n={logit_res['n_children_6_14']}, pseudo-R²={logit_res['pseudo_r2']}")
    print(f" scénarios: {len(scenarios_res['scenarios'])} trajectoires à {scenarios_res['horizon']}")
    print(f" indicateurs: {len(indicateurs_res['indicators'])} indicateurs corrélés")
    print(f" incertitude: marge médiane ±{uncertainty_res['marge_mediane_pts']} pts, "
          f"{uncertainty_res['rangs_inchanges']}/13 rangs inchangés après rétrécissement")
    print(f" robustesse: {robustness_res['monte_carlo']['n_rangs_stables_p90']}/13 rangs stables sur "
          f"{robustness_res['monte_carlo']['n_draws']} tirages, accord Spearman ≥ "
          f"{robustness_res['spearman_min']}")
    print(f" équité: Theil {equity_res['theil']['part_inter_pct']} % inter-wilaya, "
          f"HOI {equity_res['hoi']['hoi_pct']} %, dissimilarité offre/besoin "
          f"{equity_res['offre_besoin']['dissimilarite_ecoles_besoin']}")
    print(f" parcours: {parcours_res['retard']['retard_national_pct']} % des élèves de 12-14 ans "
          f"encore au primaire ; survie collège "
          f"{parcours_res['survie']['etapes'][1]['part_cohorte_pct']} %")
    print(f" rendement: pauvreté {rendement_res['ecart_formel']['pauvrete_non_formel_pct']} % → "
          f"{rendement_res['ecart_formel']['pauvrete_formel_pct']} %, dont "
          f"{rendement_res['oaxaca']['structure_pct']} % de rendement propre")
    print(f" cohortes: accès au formel {cohortes_res['nationale']['generations'][0]['formel_pct']} % "
          f"(60+) → {cohortes_res['nationale']['generations'][-1]['formel_pct']} % (15-24) ; "
          f"rattrapage insuffisant : "
          f"{', '.join(cohortes_res['rattrapage']['rattrapage_insuffisant']) or '—'}")
    print(f" ml: AUC test GBM {ml_res['modeles']['Gradient boosting']['auc']} vs logit "
          f"{ml_res['modeles']['Régression logistique']['auc']} ({ml_res['gain_auc_gbm_vs_logit']:+.3f})")
    print(f" patterns: {patterns_res['regles']['n_non_domines']} règles non dominées, "
          f"meilleur sous-groupe "
          f"{patterns_res['sous_groupes']['sous_groupes'][0]['taux_hors_ecole_pct']} %")
    print(f" déviants: modèles = {', '.join(deviants_res['deviants_positifs']) or '—'} ; "
          f"alertes = {', '.join(deviants_res['sous_performances']) or '—'}")
    print(f" stabilité: ARI(k={stability_res['k_retenu']}) = "
          f"{[d['ari_moyen'] for d in stability_res['bootstrap']['par_k'] if d['k'] == stability_res['k_retenu']][0]}")
    print(f" optimisation: {optim_res['besoin_total_meuro']} M€ pour "
          f"{optim_res['enfants_mobilisables_total']} enfants ; à 25 % du budget "
          f"{optim_res['allocations']['budget_25pct']['enfants_atteints']} enfants atteints")
    moran = spatial_res['variables']['ipe']['moran']
    print(f" spatial: I de Moran {moran['I']} (p = {moran['pvalue_permutation']})")
    print(f" projection: population 6-14 {projection_res['scenarios']['croissance_population_pct']:+.1f} % "
          f"d'ici 2030, {projection_res['surcout_total_ecoles']} écoles de surcoût démographique")
    print(f" accès: {acces_res['n_moughataas']} moughataas, "
          f"{len(acces_res['moughataas_sans_ecole'])} sans établissement recensé")

    # ---- entrepôt et contrôles qualité bloquants ----------------------------
    from backend.warehouse import build_duckdb, tests_quality

    entrepot = build_duckdb.build()
    print(f" entrepôt: {entrepot['tables']['marts.fait_individu']:,} individus, "
          f"{len(entrepot['tables'])} tables".replace(",", " "))

    rapport = tests_quality.run_tests(strict=False)
    dump_json(f"{ANALYTICS}/qualite.json", rapport, indent=2)
    print(f" qualité: {rapport['n_ok']}/{rapport['n_controles']} contrôles passés")
    if rapport["n_echecs"]:
        for r in rapport["resultats"]:
            if r["statut"] != "ok":
                print(f"   ✗ {r['controle']} : {r['detail']}")
        raise SystemExit("génération interrompue : contrôles qualité en échec")


if __name__ == "__main__":
    main()
