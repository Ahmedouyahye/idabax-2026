# Sources de données

Toutes les sources sont ouvertes et citées pour la reproductibilité.

## 1. EPCV 2019 Enquête Permanente sur les Conditions de Vie des ménages

- **Producteur** : ONS Mauritanie (Office National de la Statistique) aujourd'hui ANSADE.
- **Fichier** : `src/Projet 1 SPSS ( Base de données) 255012.sav`, copié vers `data/raw/EPCV2019_60600_individuals.sav`.
- **Contenu utilisé** : microdonnées de 60 600 individus, 11 variables (sexe B2, âge B4, situation scolaire C2, niveau atteint C4N, regroupement de niveau `nivcm`, milieu, wilaya, `dejall`, chômage, pauvreté, groupe d'âge).
- **Catalogue** : plateforme ANADRIM (RGPH5) `anadrim.rgph5.mr/index.php/catalog/21`.

### Limites du fichier EPCV fourni

Ces limites sont structurelles : elles conditionnent ce que l'analyse peut légitimement affirmer.

1. **`nivcm` n'est pas l'éducation du chef de ménage.** La variable est étiquetée « Niveau
   d'éducation du CM » dans le fichier SPSS, mais le croisement `C4N × nivcm` sur les 60 600
   individus est **exactement bloc-diagonal** (aucune cellule hors diagonale) : `nivcm` est un
   simple regroupement du niveau atteint **par l'individu lui-même** (Primaire → primaire ;
   Collège/Lycée → secondaire général ; Coranique/Mahadra → traditionnel ; jamais scolarisé →
   Aucun). L'utiliser comme proxy de l'éducation parentale produit une tautologie — « un enfant
   sans niveau d'instruction est hors école » — avec 100 % de confiance. Elle est donc **exclue**
   du logit et des règles d'association. **Le fichier ne contient aucune variable d'éducation
   parentale**, et l'effet de transmission intergénérationnelle n'est pas estimable ici.
2. **`dejall` est redondante avec `C2`** : elle recode « déjà allé à l'école ». Conséquence
   importante pour la définition de l'indicateur : chez les 6-14 ans, **tout enfant hors école
   formelle n'y est jamais entré** (0 cas de décrochage après entrée). L'indicateur mesure donc
   la **non-entrée**, pas le décrochage — ce qui n'est pas la définition UIS/UNESCO du
   « out-of-school », d'où l'écart avec les séries internationales.
3. **Ni identifiant de ménage, ni pondération de sondage, ni strate.** Aucune analyse
   intra-ménage (fratrie, composition) n'est possible ; les estimations sont **non pondérées** et
   la variance ne peut pas être calculée selon le plan de sondage. Les intervalles de confiance
   sont donc obtenus par **bootstrap non paramétrique simple** et constituent une borne
   optimiste (l'effet de grappe réel les élargirait).
4. **Effectifs très inégaux par wilaya** chez les 6-14 ans : de 267 enfants (Inchiri) et 479
   (Tiris Zemmour) à 2 619 (Nouakchott). Les taux des petites wilayas sont fragiles et doivent
   toujours être lus avec leur intervalle de confiance.
5. **Granularité géographique limitée à la wilaya (adm1).** L'EPCV ne descend pas à la moughataa,
   et les projections de population HDX non plus : toute analyse infra-wilaya repose sur les
   seules données d'équipements (OSM) et sur des hypothèses de répartition explicitées.

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

- `data/raw/unesco_uis_outofschool.csv` : **ne contient aucune donnée**. Le fichier est la trace
  d'un échec de connexion à l'API UIS de l'UNESCO (résolution DNS impossible) : ses trois colonnes
  sont `source,status,error`. La validation externe de l'estimation EPCV repose donc uniquement
  sur le WDI (`backend/analytics/robustness.py`).
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

## 7. Entrepôt analytique et reproductibilité

`backend/warehouse/build_duckdb.py` matérialise les microdonnées dans un entrepôt DuckDB
en schéma étoile (`data/processed/edufocus.duckdb`, également exporté en Parquet) :

- **couche `staging`** : copie fidèle des sources, sans transformation ;
- **couche `marts`** : `fait_individu` (60 600 lignes) plus les dimensions conformes
  `dim_wilaya`, `dim_education`, `dim_age`, `dim_milieu`, et la vue préagrégée
  `cube_enfants` qui alimente l'endpoint `/api/cube`.

L'intérêt principal est de fixer **une seule définition** de « hors école », de « formel »
et des tranches d'âge, matérialisée dans les dimensions plutôt que réécrite dans chaque
module d'analyse.

`backend/warehouse/tests_quality.py` exécute neuf contrôles bloquants à la fin de
`run_all.py` : présence des 13 wilayas, parts sommant à 100 %, taux dans [0, 100],
cohérence entre les effectifs wilaya et le total national, effectifs égaux au produit
taux × population, absence de valeurs manquantes sur les indicateurs clés, résolution de
toutes les graphies de wilaya, lisibilité des 24 sorties analytiques, et cohérence de
l'entrepôt avec le CSV. Un échec interrompt la génération.

## 8. Note sur le périmètre d'âge

La variable `pop_6_14_2022` du pipeline vaut `T_05_09 + T_10_14`, c'est-à-dire les
**5-14 ans** (dix générations) et non les 6-14 ans (neuf). Comme le taux de hors-école est
calculé sur les 6-14 ans de l'EPCV, l'effectif `enfants_hors_ecole` qui en découle est
surestimé d'environ un dixième. Le point est documenté ici plutôt que corrigé en silence :
le rectifier ferait bouger le chiffre phare de 375 566 enfants, ce qui est une décision
éditoriale et non un correctif technique. Le module `projection.py` projette à périmètre
identique (dix générations contre dix) pour rester comparable au reste du tableau de bord.
