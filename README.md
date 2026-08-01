# EduFocus🌙 Où investir dans l'éducation en Mauritanie

**Datathon IndabaX Mauritanie 2026 · Thème « Population & Démographie »**

**Réalisé par l'équipe DataSphere** · dépôt `idabax-2026`

EduFocus🌙 transforme des **pourcentages en enfants, et des enfants en décisions d'investissement**.
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
- **Règle la plus forte** : rural × 6-9 ans × Sud-Est → 69 % d'enfants hors école (lift 2,10).

> **Note de lecture.** La variable `nivcm` du fichier SPSS est étiquetée « Niveau d'éducation du
> CM » mais n'est **pas** l'éducation parentale : c'est un regroupement du niveau d'instruction de
> l'individu lui-même (croisement `C4N × nivcm` strictement bloc-diagonal sur les 60 600 lignes).
> Elle est donc exclue du modèle et des règles d'association, où elle produisait une tautologie.
> Le fichier fourni ne contient aucune variable d'éducation parentale — voir
> [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md#limites-du-fichier-epcv-fourni).

## Stack

| Couche | Technologie |
| --- | --- |
| Données | EPCV 2019 (SPSS/pyreadstat), ONS/UNFPA (HDX), OSM/HOTOSM, Banque mondiale |
| Analytique | Python · pandas, scikit-learn, networkx, python-louvain, mlxtend, statsmodels |
| API | FastAPI (`backend/api/main.py`) — optionnelle, remplacée par des JSON statiques en production |
| Frontend | React 18 + TypeScript + Tailwind v4 + ECharts + Leaflet (Vite) |

## Démarrage

Le tableau de bord est **100 % statique** : toutes les sorties de l'API sont figées
dans `frontend/public/data/*.json` (voir `backend/export_static.py`) et servies sans
serveur. Aucune API FastAPI n'est requise en production.

```bash
# 1. (Optionnel) Régénérer les données statiques après avoir relancé le pipeline
backend/.venv/bin/python -m backend.export_static

# 2. Frontend (port 5173)
cd frontend && npm run dev
```

Pour rejouer une API locale (interrogation en langage naturel, cube OLAP, notes de
politique générées par LLM) :

```bash
backend/.venv/bin/uvicorn backend.api.main:app --port 8000 --host 127.0.0.1
```

Build de production (fichiers statiques optimisés + chargement différé des pages) :

```bash
cd frontend && npm run build && npm run preview # port 4173
```

Déploiement sur **Vercel** : importer le dépôt (root = `frontend/`, framework
Vite détecté automatiquement), le `vercel.json` fourni gère le routage SPA.

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
 analytics/ 24 modules, orchestrés par run_all.py :
 · socle IPE, clustering, graphes, règles, décomposition,
 matrice, concentration, logit, scénarios, indicateurs
 · rigueur uncertainty (bootstrap + Bayes empirique),
 robustness (Monte-Carlo, ACP/entropie, TOPSIS/Borda),
 equity (Theil, Human Opportunity Index)
 · parcours parcours (retard, survie), rendement (Oaxaca),
 cohortes (cohorte synthétique)
 · apprentissage ml (GBM validé + SHAP), patterns (FP-Growth,
 sous-groupes WRAcc), deviants, stability, optim
 · territoire spatial (Moran, LISA), acces (63 moughataas),
 projection (composantes de cohorte 2030)
 · restitution briefs (notes multilingues, hors ligne)
 warehouse/ entrepôt DuckDB en étoile + Parquet, contrôles qualité
 bloquants, traduction texte → SQL en lecture seule
 api/ FastAPI 30 endpoints, dont /cube (OLAP) et /ask
frontend/ dashboard React (19 pages en 5 sections), rapport A4 imprimable
data/raw/ sources brutes (EPCV .sav, HDX, OSM, WDI)
data/processed/ jeux enrichis, sorties d'analytique, edufocus.duckdb, Parquet
docs/ référentiel EduFocus, sources de données, rapport LaTeX
```

Sources détaillées : [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Méthodologie (résumé)

- **IPE** = 0,40 × volume (log enfants hors école) + 0,35 × intensité (taux hors école) + 0,25 ×
 vulnérabilité (0,75 pauvreté + 0,25 dépendance jeunes), normalisé 0-100.
- **Clustering** : k-moyennes normalisées, k=3 (silhouette 0,331).
- **Graphes** : similarité entre wilayas (profils centrés-réduits, top-2 voisins, r ≥ 0,70) ;
 corrélations entre indicateurs (|r| ≥ 0,75).
- **Règles d'association** : Apriori sur les 16 451 enfants 6-14 ans, conséquence
 `hors_ecole`, support ≥ 2 %, confiance ≥ 55 %, lift > 1,05.
- **Matrice volume × intensité** : quadrants sur les médianes nationales (effort massif,
 ciblage des effectifs, traitement local, consolidation).
- **Concentration** : part du top 5 / top 3, nombre de wilayas pour 50 % du hors-école,
 courbe de Lorenz + indice de Gini (formule par paires).
- **Logit** : régression logistique (statsmodels) sur les individus 6-14 ans âge, milieu,
 pauvreté, sexe + effets wilaya (réf. Nouakchott) ; rapport de cotes, IC 95 %, AIC.
- **Scénarios 2030** : tendance WDI (SE.PRM.UNER.ZS 2008-2024, −0,64 pt/an) ; passerelles
 mahadra → formel (25 % / 50 %) ; besoins d'écoles de proximité (coût 25 M MRO / école).
- **Rapport PDF** : page `/rapport` document A4 (6 sections), export via `window.print()`.

### Ce que l'analyse approfondie ajoute

- **Incertitude** : IC 95 % par bootstrap (2 000 tirages) sur chaque taux wilaya — marge
 médiane ±2,5 pts, mais ±4,3 pts pour Inchiri (267 enfants enquêtés). Le classement IPE
 résiste : 13/13 rangs inchangés après rétrécissement empirical Bayes.
- **Robustesse** : sur 10 000 jeux de pondérations tirés au hasard, les cinq premières
 wilayas ne changent jamais de rang ; ACP, entropie, TOPSIS et Borda s'accordent à ρ ≥ 0,96.
- **Équité** : 63 % de l'inégalité se joue entre wilayas, 37 % à l'intérieur (Assaba : 16,9 %
 urbain contre 50,5 % rural). Human Opportunity Index 60,9 % pour une couverture de 66,9 %.
- **Parcours** : **66,1 % des élèves de 12-14 ans sont encore au primaire**. Survie éducative
 70,9 % → 43,2 % (collège) → 15,0 % (lycée) → 1,7 % (supérieur).
- **Rendement** : la pauvreté passe de 44,9 % (jamais scolarisé) à 6,0 % (universitaire) ;
 la décomposition d'Oaxaca-Blinder attribue **74,7 % de l'écart au rendement propre** de
 l'instruction. Le chômage, lui, augmente avec le diplôme (effet de définition BIT).
- **Générations** : accès au formel 10 % (60+) → 70,9 % (15-24), écart de genre résorbé de
 11,4 à 0,5 point. Guidimakha est la seule wilaya dont le retard se creuse en relatif.
- **Modèles** : gradient boosting validé hors échantillon (AUC test 0,758 contre 0,725 pour
 le logit), interprété par SHAP — l'effet de l'âge est fortement non linéaire, ce que la
 binarisation 6-9 / 10-14 écrasait.
- **Déviants** : à profil socio-économique égal, **Nouakchott sous-performe de 14,8 points** ;
 Adrar sur-performe de 18,6. La DEA converge : Nouakchott est aussi la moins efficiente.
- **Décision** : allocation optimale sous budget, et tension explicite entre efficience
 (100 000 MRO par enfant à Nouakchott) et équité (175 000 à Guidimakha).
- **Territoire** : I de Moran 0,60 sur l'IPE (p = 0,002) — le corridor sud-est est une
 structure spatiale réelle, pas un artefact visuel. Descente à 63 moughataas.
- **Projection** : la population 6-14 croît de 6,6 % d'ici 2030. Sous la trajectoire
 prudente, **le nombre d'enfants hors école augmente** (393 000) alors que le taux baisse.
- **Entrepôt** : DuckDB en étoile, cube OLAP interrogeable, 9 contrôles qualité bloquants.

## Reconstruire les analyses

```bash
# régénère toutes les sorties analytiques + le geojson enrichi
backend/.venv/bin/python -m backend.analytics.run_all
```
