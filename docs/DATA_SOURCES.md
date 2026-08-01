# Sources de données

Toutes les sources sont ouvertes et citées pour la reproductibilité.

## 1. EPCV 2019 Enquête Permanente sur les Conditions de Vie des ménages

- **Producteur** : ONS Mauritanie (Office National de la Statistique) aujourd'hui ANSADE.
- **Fichier** : `src/Projet 1 SPSS ( Base de données) 255012.sav`, copié vers `data/raw/EPCV2019_60600_individuals.sav`.
- **Contenu utilisé** : microdonnées de 60 600 individus, 11 variables (sexe B2, âge B4, situation scolaire C2, type d'instruction C4N, milieu, wilaya, niveau, chômage, pauvreté, groupe d'âge).
- **Catalogue** : plateforme ANADRIM (RGPH5) `anadrim.rgph5.mr/index.php/catalog/21`.

## 2. Projections démographiques 2022 par wilaya (ONS / UNFPA)

- **Producteur** : ONS Mauritanie / UNFPA, diffusé via Humanitarian Data Exchange.
- **Fichier** : `data/raw/mrt_admpop_adm1_2022.csv` (COD-PS Mauritanie).
- **Dataset HDX** : `b228e130-8703-4126-8dfd-547124dca6fc` (COD-PS Mauritanie).
- **Usage** : application des parts EPCV 2019 sur les pyramides 2022 (passage pourcentage → effectifs).

## 3. Découpage administratif

- **Fichiers** : `data/raw/mrt_admin1.geojson` (15 wilayas), capitales et lignes administratives.
- **Dataset HDX** : COD-AB Mauritanie (`mrt_admin_boundaries_adm0-2.geojson.zip`).
- **Note** : les 9 moughataa de Nouakchott sont agrégées en une seule entité pour la cohérence avec l'EPCV.

## 4. Établissements scolaires (OpenStreetMap / HOTOSM)

- **Fichier** : `data/raw/education_facilities.geojson` (extrait de `hotosm_mrt_education_facilities.geojson.zip`).
- **Contenu** : 646 points d'éducation géolocalisés en Mauritanie.
- **Usage** : densité d'établissements pour 1 000 enfants 6-14 ans par wilaya.

## 5. Indicateurs nationaux Banque mondiale (WDI)

- **Fichier** : `data/raw/worldbank_indicators.csv` (598 observations, 23 indicateurs, 1990-2023).
- **Indicateurs phares** : SE.PRM.UNER.ZS (enfants hors école primaire, %), SE.PRM.NENR (taux net de scolarisation), SP.POP.TOTL, SE.ADT.1524.LT.ZS (adolescents analphabètes), SI.POV.DDAY.
- **Usage** : contexte national et tendances (`/api/trends`), et **pente de tendance** (OLS 2008-2024, −0,64 pt/an) pour les scénarios 2030 (`backend/analytics/scenarios.py`).

## 6. Données complémentaires

- `data/raw/unesco_uis_outofschool.csv` : statistiques UIS UNESCO sur les enfants non scolarisés.
- `data/raw/metadata.json`, `config.yaml`, `README.txt` : métadonnées et licence du paquet HDX.

## Reproductibilité

Le pipeline complet est dans `backend/pipeline/` :
`build_dataset.py` (construction des indicateurs wilaya) → `backend/analytics/`
(IPE, clustering, graphes, règles d'association, décomposition, matrice, concentration,
logit, scénarios 2030) → `backend/api/` (API FastAPI).

Régénérer toutes les sorties :

```bash
backend/.venv/bin/python -m backend.analytics.run_all
```
