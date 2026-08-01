"""Run all analytics and export precomputed JSON cache for the API.

Run: python -m backend.analytics.run_all
"""
from __future__ import annotations

import json

import pandas as pd

from backend.analytics import (clustering, concentration, decomposition, graph,
 indicateurs, index, logit, matrice, rules, scenarios)
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


if __name__ == "__main__":
 main()
