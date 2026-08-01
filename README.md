# EduFocus+ Où investir dans l'éducation en Mauritanie

**Datathon IndabaX Mauritanie 2026 · Thème « Population & Démographie »**

**Réalisé par l'équipe DataSphere** · dépôt `idabax-2026`

EduFocus+ transforme des **pourcentages en enfants, et des enfants en décisions d'investissement**.
À partir des microdonnées de l'**EPCV 2019** (60 600 individus), projetées sur la population 2022,
le projet classe les 13 wilayas de Mauritanie selon un **Indice de Priorité Éducative (IPE)**,
identifie **3 profils territoriaux d'exclusion scolaire** et fournit un levier d'action pour chacun.

## Constats clés

- **375 566 enfants de 6-14 ans** sont hors de l'école formelle (**33,1 %**), dont 199 493 en
 mahadra/coranique et 176 074 sans aucune instruction.
- **Priorité absolue** : Guidimakha (IPE 92,2), Hodh El Gharbi (86,7), Assaba (81,6).
- **3 profils** : universalisation proche (5 wilayas), exclusion « mahadra » (4), exclusion
 « aucune instruction » (4) chacun avec son levier : consolider, passerelles, construire.
- **Concentration** : 5 wilayas portent **72 %** du hors-école (Gini 0,46) ; 4 suffisent pour 50 %.
- **Déterminants (logit, n = 16 451)** : 6-9 ans OR 2,8 ; rural OR 2,4 ; ménage pauvre OR 1,9.
- **Le genre n'est pas le facteur** : l'exclusion est territoriale et rurale, pas sexuée.

## Stack

| Couche | Technologie |
| --- | --- |
| Données | EPCV 2019 (SPSS/pyreadstat), ONS/UNFPA (HDX), OSM/HOTOSM, Banque mondiale |
| Analytique | Python · pandas, scikit-learn, networkx, python-louvain, mlxtend, statsmodels |
| API | FastAPI (`backend/api/main.py`) |
| Frontend | React 18 + TypeScript + Tailwind v4 + ECharts + Leaflet (Vite) |

## Démarrage

```bash
# 1. API (port 8000)
backend/.venv/bin/uvicorn backend.api.main:app --port 8000 --host 127.0.0.1

# 2. Frontend (port 5173, proxy /api → 8000)
cd frontend && npm run dev
```

Builte de production (fichiers statiques optimisés + chargement différé des pages) :

```bash
cd frontend && npm run build && npm run preview # port 4173
```

## Pipeline

```
EPCV 2019 (60 600 indiv.) ─┐
Population 2022 par wilaya ─┼─► backend/pipeline/build_dataset.py
OSM écoles, HDX géo ───────┘ │
 ▼
 wilaya_features.csv (13 × ~45)
 │
 ┌───────────────┼───────────────────┐
 ▼ ▼ ▼
 Indice de Typologie Graphes + règles
 Priorité (k-moyennes, (similarité,
 Éducative k=3) corrélations, Apriori)
 │ │ │
 ▼ ▼ ▼
 Décomposition Matrice volume× Concentration,
 (âge/milieu/ intensité, logit (OR),
 genre) scénarios 2030 indicateurs
 └───────────────┼───────────────────┘
 ▼
 FastAPI → React (dashboard + rapport A4)
```

## Structure

```
backend/
 pipeline/ construction des indicateurs wilaya
 analytics/ IPE, clustering, graphes, règles (run_all.py)
 + décomposition, matrice, concentration, logit,
 scénarios 2030, matrice de corrélation
 api/ FastAPI /api/summary, /wilayas, /clusters, /graph/*,
 /rules, /trends, /decomposition, /matrice, /concentration,
 /logit, /scenarios, /indicateurs, /geojson
frontend/ dashboard React (11 pages), logo SVG, rapport A4 imprimable
data/raw/ sources brutes (EPCV .sav, HDX, OSM, WDI)
data/processed/ jeux enrichis + sorties d'analytique
docs/ référentiel EduFocus, sources de données
```

Sources détaillées : [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Méthodologie (résumé)

- **IPE** = 0,40 × volume (log enfants hors école) + 0,35 × intensité (taux hors école) + 0,25 ×
 vulnérabilité (0,75 pauvreté + 0,25 dépendance jeunes), normalisé 0-100.
- **Clustering** : k-moyennes normalisées, k=3 (silhouette 0,331).
- **Graphes** : similarité entre wilayas (top-2 voisins, r ≥ 0,85) ; corrélations entre
 indicateurs (|r| ≥ 0,75).
- **Règles d'association** : Apriori sur les 16 451 enfants 6-14 ans, conséquence
 `hors_ecole`, lift > 1,05.
- **Matrice volume × intensité** : quadrants sur les médianes nationales (effort massif,
 ciblage des effectifs, traitement local, consolidation).
- **Concentration** : part du top 5 / top 3, nombre de wilayas pour 50 % du hors-école,
 courbe de Lorenz + indice de Gini (formule par paires).
- **Logit** : régression logistique (statsmodels) sur les individus 6-14 ans âge, milieu,
 pauvreté, sexe + effets wilaya (réf. Nouakchott) ; rapport de cotes, IC 95 %, AIC.
- **Scénarios 2030** : tendance WDI (SE.PRM.UNER.ZS 2008-2024, −0,64 pt/an) ; passerelles
 mahadra → formel (25 % / 50 %) ; besoins d'écoles de proximité (coût 25 M MRO / école).
- **Rapport PDF** : page `/rapport` document A4 (6 sections), export via `window.print()`.

## Reconstruire les analyses

```bash
# régénère toutes les sorties analytiques + le geojson enrichi
backend/.venv/bin/python -m backend.analytics.run_all
```
