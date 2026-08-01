"""Analyse de graphe.

1) Réseau de similarité entre wilayas : nœuds = wilayas, arêtes = corrélation
   de Pearson élevée (|r| > 0.7) sur les indicateurs socio-éducatifs.
   Détection de communautés (Louvain) -> "wilayas qui partagent le même profil".
2) Graphe de corrélation des indicateurs : nœuds = indicateurs, arêtes = |r| > 0.75.
"""
from __future__ import annotations

import json

import community as community_louvain
import networkx as nx
import numpy as np
import pandas as pd

GRAPH_FEATURES = [
    "scol_Hors_ecole_formelle",
    "taux_pauvrete",
    "part_rurale",
    "ratio_dependance_jeunes",
    "scol_Mahadra_trad",
    "scol_Aucune instruction",
    "part_adultes_sans_instruction",
    "ecart_genre_hors_ecole",
    "ecoles_pour_1000_enfants",
]

INDICATOR_NAMES = {
    "scol_Hors_ecole_formelle": "Taux hors école formelle",
    "taux_pauvrete": "Taux de pauvreté",
    "part_rurale": "Part rurale",
    "ratio_dependance_jeunes": "Dépendance jeunes",
    "scol_Mahadra_trad": "Enseignement traditionnel",
    "scol_Aucune instruction": "Aucune instruction",
    "part_adultes_sans_instruction": "Adultes sans instruction",
    "ecart_genre_hors_ecole": "Écart de genre hors école",
    "ecoles_pour_1000_enfants": "Écoles / 1000 enfants",
    "population_2022": "Population 2022",
    "part_0_14_pct": "Part 0-14 ans",
    "taux_chomage": "Taux de chômage",
}


def wilaya_similarity_graph(features: pd.DataFrame, threshold: float = 0.70, top_k: int = 2) -> dict:
    """Réseau de similarité : chaque wilaya est reliée à ses top_k voisins
    les plus corrélés (|r| >= threshold). Graphe lisible et interprétable.

    Les indicateurs sont d'unités hétérogènes (%, ratios, effectifs) : corréler
    deux wilayas sur leurs profils bruts mesurerait surtout l'ordre de grandeur
    des colonnes, pas la ressemblance des profils. On centre-réduit donc chaque
    indicateur (z-score) AVANT de transposer, de sorte que la corrélation porte
    sur des positions relatives comparables.
    """
    df = features.set_index("wilaya")
    X = df[GRAPH_FEATURES].astype(float)
    X = (X - X.mean()) / X.std(ddof=0).replace(0, 1)
    corr = X.T.corr()

    selected: set[tuple[str, str]] = set()
    for a in corr.index:
        scores = corr.loc[a].drop(a).dropna()
        scores = scores[scores.abs() >= threshold]
        for b in scores.abs().sort_values(ascending=False).head(top_k).index:
            selected.add(tuple(sorted((a, b))))

    G = nx.Graph()
    for w in df.index:
        G.add_node(w)
    for a, b in selected:
        r = corr.loc[a, b]
        G.add_edge(a, b, weight=round(abs(r), 3), r=round(r, 3))

    communities = None
    if G.number_of_edges() > 0:
        communities = community_louvain.best_partition(G, random_state=42)

    nodes = [
        {
            "id": w,
            "wilaya": w,
            "cluster": int(communities.get(w, 0)) if communities else 0,
            "population_2022": int(df.loc[w, "population_2022"]),
            "hors_ecole_pct": float(df.loc[w, "scol_Hors_ecole_formelle"]),
            "enfants_hors_ecole": int(df.loc[w, "enfants_hors_ecole"]),
        }
        for w in df.index
    ]
    edges = [
        {"source": a, "target": b, "weight": G.edges[a, b]["weight"], "r": G.edges[a, b]["r"]}
        for a, b in G.edges()
    ]
    return {"nodes": nodes, "edges": edges, "n_communities": max((c for c in communities.values()), default=0) + 1}


def indicator_correlation_graph(features: pd.DataFrame, threshold: float = 0.75) -> dict:
    X = features[list(INDICATOR_NAMES)].astype(float)
    corr = X.corr()
    G = nx.Graph()
    for name in INDICATOR_NAMES:
        G.add_node(name)
    for i, a in enumerate(corr.index):
        for b in corr.index[i + 1:]:
            r = corr.loc[a, b]
            if abs(r) >= threshold and not np.isnan(r):
                G.add_edge(a, b, weight=round(abs(r), 3), r=round(r, 3), negative=bool(r < 0))

    nodes = [
        {"id": k, "label": INDICATOR_NAMES[k], "degre": int(d)}
        for k, d in G.degree()
    ]
    edges = [
        {"source": a, "target": b, "weight": G.edges[a, b]["weight"],
         "r": G.edges[a, b]["r"], "negative": G.edges[a, b]["negative"]}
        for a, b in G.edges()
    ]
    # degré maximal (taille des nœuds)
    max_deg = max((d for _, d in G.degree()), default=1)
    for n in nodes:
        n["taille"] = 5 + 25 * n["degre"] / max_deg
    return {"nodes": nodes, "edges": edges}


if __name__ == "__main__":
    features = pd.read_csv("data/processed/wilaya_features.csv")
    sim = wilaya_similarity_graph(features)
    corr_graph = indicator_correlation_graph(features)
    with open("data/processed/analytics/graph_similarite.json", "w") as fh:
        json.dump(sim, fh, ensure_ascii=False, indent=2)
    with open("data/processed/analytics/graph_correlations.json", "w") as fh:
        json.dump(corr_graph, fh, ensure_ascii=False, indent=2)
    print(f"similité: {len(sim['nodes'])} nœuds, {len(sim['edges'])} arêtes, "
          f"{sim['n_communities']} communautés")
    print(f"corrélations: {len(corr_graph['nodes'])} nœuds, {len(corr_graph['edges'])} arêtes")
    for e in sim["edges"]:
        print(f"  {e['source']} <-> {e['target']} (r={e['r']})")
