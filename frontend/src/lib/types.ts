export interface Wilaya {
  wilaya: string;
  population_2022: number;
  pop_6_14_2022: number;
  taux_pauvrete: number;
  part_rurale: number;
  ratio_dependance_jeunes: number;
  scol_Formel: number;
  scol_Mahadra: number;
  scol_Coranique: number;
  scol_Mahadra_trad: number;
  "scol_Aucune instruction": number;
  scol_Hors_ecole_formelle: number;
  scol_urbain_Formel: number;
  scol_rural_Formel: number;
  scol_urbain_Hors_ecole_formelle: number;
  scol_rural_Hors_ecole_formelle: number;
  enfants_hors_ecole: number;
  enfants_mahadra: number;
  enfants_aucune_instruction: number;
  nb_etablissements: number;
  ecoles_pour_1000_enfants: number;
  ecart_genre_hors_ecole: number;
  ipe: number;
  rang_ipe: number;
  volume_norm: number;
  intensite_norm: number;
  vulnerabilite_norm: number;
  levier_action: string;
  cluster: number;
}

export interface National {
  wilayas: number;
  population_totale_2022: number;
  population_6_14_2022: number;
  enfants_hors_ecole_formelle: number;
  taux_hors_ecole_national_pct: number;
  taux_pauvrete_national_pct: number;
  enfants_mahadra: number;
  enfants_aucune_instruction: number;
  nb_etablissements: number;
}

export interface Summary {
  national: National;
  top3_priorite: Wilaya[];
  n_clusters: number;
  profils: { cluster: number; label: string; levier: string; taille: number }[];
}

export interface ClusterProfile {
  cluster: number;
  label: string;
  levier: string;
  wilayas: string[];
  taille: number;
  hors_ecole_moyen_pct: number;
  pauvrete_moyen_pct: number;
  ruralite_moyen_pct: number;
  dependance_jeunes_moyen: number;
  mahadra_moyen_pct: number;
  aucune_instruction_moyen_pct: number;
}

export interface Clusters {
  k: number;
  silhouette: number;
  profiles: ClusterProfile[];
  wilayas: { wilaya: string; cluster: number; ipe: number; rang_ipe: number }[];
}

export interface SimNode {
  id: string;
  wilaya: string;
  cluster: number;
  population_2022: number;
  hors_ecole_pct: number;
  enfants_hors_ecole: number;
}

export interface SimEdge {
  source: string;
  target: string;
  weight: number;
  r: number;
}

export interface CorrNode {
  id: string;
  label: string;
  degre: number;
  taille: number;
}

export interface CorrEdge {
  source: string;
  target: string;
  weight: number;
  r: number;
  negative: boolean;
}

export interface Rule {
  antecedents_str: string;
  consequents_str: string;
  support: number;
  confidence: number;
  lift: number;
}

export interface RulesData {
  n_rules: number;
  rules: Rule[];
  top_confiance: Rule[];
  par_region: Rule[];
  n_children_6_14: number;
}

export interface DecompositionRow {
  wilaya: string;
  n: number;
  age_6_9_hors_ecole: number;
  age_10_14_hors_ecole: number;
  urbain_hors_ecole: number;
  rural_hors_ecole: number;
  filles_hors_ecole: number;
  garcons_hors_ecole: number;
  mahadra_pct_he: number;
  aucune_pct_he: number;
}

export interface DecompositionData {
  national: DecompositionRow & { structure?: Record<string, number> };
  wilayas: DecompositionRow[];
  n_children_6_14: number;
}

export interface MatriceQuadrant {
  id: string;
  label: string;
  description: string;
  color: string;
  key: string;
  wilayas: string[];
  enfants_hors_ecole: number;
}

export interface MatricePoint {
  wilaya: string;
  scol_Hors_ecole_formelle: number;
  volume_log: number;
  enfants_hors_ecole: number;
  quadrant_id: string;
}

export interface MatriceData {
  median_volume_log: number;
  median_intensite: number;
  quadrants: MatriceQuadrant[];
  scatter: MatricePoint[];
}

export interface ConcentrationData {
  total_enfants_hors_ecole: number;
  top5_share: number;
  top3_share: number;
  top1: string;
  n_wilayas_pour_50pct: number;
  gini: number;
  top5: { wilaya: string; enfants_hors_ecole: number; part_cumulee: number }[];
  lorenz: { x: number; y: number }[];
  classement: { wilaya: string; enfants_hors_ecole: number; part_cumulee: number }[];
}

export interface LogitFeature {
  name: string;
  label: string;
  categorie: string;
  odds_ratio: number;
  ci_lo: number;
  ci_hi: number;
  coef: number;
  pvalue: number;
  wilaya?: boolean;
}

export interface LogitData {
  n_children_6_14: number;
  prevalence_hors_ecole_pct: number;
  pseudo_r2: number;
  aic: number;
  features: LogitFeature[];
  wilayas: LogitFeature[];
  reference_wilaya: string;
  limite_donnees: string;
  interpretation: string;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  color: string;
  taux_2030: number;
  enfants_hors_ecole_2030: number;
  reduction_enfants_vs_2022: number;
}

export interface ScenariosData {
  horizon: number;
  years: number;
  trend_annual_pts: number;
  cost_per_school_mro: number;
  baseline: {
    taux_hors_ecole_2022: number;
    enfants_hors_ecole_2022: number;
    enfants_mahadra_2022: number;
    population_6_14_2022: number;
  };
  scenarios: Scenario[];
  par_wilaya: {
    wilaya: string;
    taux_2022: number;
    enfants_hors_ecole: number;
    enfants_mahadra: number;
    ecoles_pour_1000_enfants: number;
    ecoles_a_creer: number;
    cout_mro: number;
    cout_meuro: number;
  }[];
}

export interface IndicateursData {
  indicators: { key: string; label: string }[];
  matrix: { x: string; y: string; value: number }[];
  top_correlations: { a: string; b: string; r: number }[];
}

export interface TrendSeries {
  code: string;
  label: string;
  points: { year: number; value: number }[];
}

// ---- Phase 1 : incertitude, robustesse, équité ------------------------------

export interface CiEstimate {
  pct: number;
  ci_lo: number;
  ci_hi: number;
  marge: number;
}

export interface UncertaintyRow {
  wilaya: string;
  n_echantillon: number;
  hors_ecole: CiEstimate;
  mahadra: CiEstimate;
  aucune: CiEstimate;
  enfants_hors_ecole: number;
  enfants_ci_lo: number;
  enfants_ci_hi: number;
  hors_ecole_retreci_pct: number;
  poids_donnees: number;
  deplacement_pts: number;
}

export interface UncertaintyData {
  n_boot: number;
  niveau_confiance: number;
  wilayas: UncertaintyRow[];
  classement: {
    wilaya: string;
    rang_brut: number;
    rang_retreci: number;
    ipe_brut: number;
    ipe_retreci: number;
    variation_rang: number;
  }[];
  rangs_inchanges: number;
  moyenne_nationale_pct: number;
  marge_mediane_pts: number;
  plus_petit_echantillon: { wilaya: string; n: number; marge: number };
  marge_la_plus_large: { wilaya: string; n: number; marge: number };
  note: string;
}

export interface McRow {
  wilaya: string;
  rang_median: number;
  rang_min: number;
  rang_max: number;
  rang_p05: number;
  rang_p95: number;
  prob_top3: number;
  prob_top5: number;
  rang_stable: boolean;
  rang_stable_p90: boolean;
}

export interface RobustnessData {
  monte_carlo: {
    n_draws: number;
    concentration: number;
    poids_base: Record<string, number>;
    wilayas: McRow[];
    n_rangs_stables: number;
    n_rangs_stables_p90: number;
  };
  poids_alternatifs: Record<string, Record<string, number>>;
  methodes: string[];
  classements: (Record<string, number | string> & {
    wilaya: string;
    ipe: number;
    rang_min: number;
    rang_max: number;
    ecart_methodes: number;
  })[];
  spearman: { a: string; b: string; rho: number; pvalue: number }[];
  spearman_min: number;
  ecart_max_rangs: number;
  validation_externe: {
    epcv_2019_pct: number;
    wdi_2019_pct: number | null;
    ecart_pts: number | null;
    explication_ecart: string;
    uis_disponible: boolean;
    uis_note: string;
    tendance: {
      pente_2008_2024: number;
      pente_2008_2020: number;
      n_points: number;
      point_2024: number;
      point_2020: number;
      alerte: string;
    };
  };
  conclusion: string;
}

export interface EquityData {
  n_children_6_14: number;
  theil: {
    theil_total: number;
    theil_inter_wilaya: number;
    theil_intra_wilaya: number;
    part_inter_pct: number;
    part_intra_pct: number;
    par_wilaya: {
      wilaya: string;
      theil_interne: number;
      contribution_intra: number;
      taux_urbain: number | null;
      taux_rural: number | null;
      ecart_urbain_rural: number | null;
    }[];
    lecture: string;
  };
  hoi: {
    couverture_pct: number;
    d_index: number;
    hoi_pct: number;
    penalite_inegalite_pts: number;
    contributions: { circonstance: string; d_index_sans: number; part_de_D_pct: number }[];
    par_wilaya: { wilaya: string; couverture_pct: number; hoi_pct: number }[];
    lecture: string;
  };
  offre_besoin: {
    dissimilarite_ecoles_enfants: number;
    dissimilarite_ecoles_besoin: number;
    courbe_concentration: { x: number; ecoles: number; enfants: number; wilaya: string | null }[];
    ecarts: { wilaya: string; nb_etablissements: number; enfants_hors_ecole: number; ecart: number }[];
    lecture: string;
  };
}

// ---- Phase 2 : parcours, rendement, cohortes --------------------------------

export interface ParcoursData {
  retard: {
    n_scolarises_6_14: number;
    n_ages_concernes: number;
    retard_national_pct: number;
    retard_urbain_pct: number;
    retard_rural_pct: number;
    retard_filles_pct: number;
    retard_garcons_pct: number;
    par_age: {
      age: number;
      n: number;
      primaire: number;
      college: number;
      part_primaire_pct: number;
      en_retard_pct: number | null;
    }[];
    par_wilaya: {
      wilaya: string;
      n: number;
      retard_pct: number;
      retard_urbain_pct: number | null;
      retard_rural_pct: number | null;
      retard_filles_pct: number | null;
      retard_garcons_pct: number | null;
    }[];
    definition: string;
  };
  pyramide: {
    ordre: string[];
    par_age: (Record<string, number> & { age: number; n: number })[];
  };
  survie: {
    n_cohorte_15_24: number;
    etapes: {
      palier: string;
      part_cohorte_pct: number;
      effectif_echantillon: number;
      transition_depuis_precedent_pct?: number;
      perte_pts?: number;
    }[];
    ecarts_college: Record<string, number>;
    par_wilaya: { wilaya: string; college_pct: number; n: number }[];
    note: string;
  };
}

export interface RendementData {
  n_15_64: number;
  niveaux: {
    niveau: string;
    n: number;
    chomage_pct: number;
    pauvrete_pct: number;
    part_rurale_pct: number;
    age_median: number;
    formel: boolean;
  }[];
  ecart_formel: {
    n_formel: number;
    n_non_formel: number;
    pauvrete_formel_pct: number;
    pauvrete_non_formel_pct: number;
    chomage_formel_pct: number;
    chomage_non_formel_pct: number;
    ecart_pauvrete_pts: number;
  };
  oaxaca: {
    ecart_total_pts: number;
    composition_pts: number;
    structure_pts: number;
    composition_pct: number | null;
    structure_pct: number | null;
    detail_composition: { variable: string; contribution_pts: number }[];
    lecture_cle: string;
  };
  logit_pauvrete: {
    n: number;
    reference: string;
    pseudo_r2: number;
    niveaux: { niveau: string; odds_ratio: number; ci_lo: number; ci_hi: number; pvalue: number }[];
    controles: string;
  };
  avertissement: string;
}

export interface CohortesData {
  nationale: {
    generations: {
      generation: string;
      periode: string;
      n: number;
      jamais_scolarise_pct: number;
      traditionnel_pct: number;
      formel_pct: number;
      college_plus_pct: number;
      formel_filles_pct: number;
      formel_garcons_pct: number;
      ecart_genre_pts: number;
    }[];
    gain_formel_pts: number;
    resorption_genre_pts: number;
    lecture: string;
  };
  rattrapage: {
    wilayas: {
      wilaya: string;
      formel_25_59_pct: number;
      formel_15_24_pct: number;
      gain_pts: number;
      college_25_59_pct: number;
      college_15_24_pct: number;
      gain_college_pts: number;
      n_15_24: number;
      retard_vs_national_pts: number;
      sous_moyenne: boolean;
      gain_sous_median: boolean;
      rattrapage_insuffisant: boolean;
    }[];
    national_15_24_pct: number;
    gain_median_pts: number;
    rattrapage_insuffisant: string[];
    proches_du_plafond: string[];
    lecture: string;
  };
  note: string;
}

// ---- Phase 3 : ML, fouille de motifs, déviants, stabilité, optimisation -----

export interface ModelMetrics {
  cv_auc_moyenne: number;
  cv_auc_ecart_type: number;
  auc_entrainement: number;
  auc: number;
  pr_auc: number;
  seuil_youden: number;
  sensibilite: number;
  specificite: number;
  matrice: { vn: number; fp: number; fn: number; vp: number };
  roc: { fpr: number; tpr: number }[];
}

export interface MlData {
  n_total: number;
  n_entrainement: number;
  n_test: number;
  prevalence_pct: number;
  modeles: Record<string, ModelMetrics>;
  gain_auc_gbm_vs_logit: number;
  calibration: { predit: number; observe: number }[];
  shap_importance: { feature: string; label: string; importance: number }[];
  effet_age: { age: number; effet_shap: number }[];
  interaction_rural_pauvre: { rural: boolean; pauvre: boolean; n: number; proba_moyenne_pct: number }[];
  conclusion: string;
}

export interface PatternsData {
  regles: {
    n_total: number;
    n_significatifs: number;
    n_non_domines: number;
    n_enfants: number;
    regles: {
      antecedents: string;
      n_couvert: number;
      support: number;
      confidence: number;
      lift: number;
      pvalue: number;
      significatif: boolean;
    }[];
    methode: string;
  };
  sous_groupes: {
    taux_national_pct: number;
    taille_min: number;
    sous_groupes: {
      conditions: string[];
      description: string;
      n: number;
      part_population_pct: number;
      taux_hors_ecole_pct: number;
      ecart_vs_national_pts: number;
      wracc: number;
      enfants_concernes_pct_du_total: number;
    }[];
    methode: string;
  };
}

export interface DeviantsData {
  r2_leave_one_out: number;
  ecart_type_residus_pts: number;
  coefficients: { variable: string; label: string; coefficient_standardise: number }[];
  wilayas: {
    wilaya: string;
    observe_pct: number;
    attendu_pct: number;
    residu_pts: number;
    residu_z: number;
    statut: string;
    atypie: number;
    profil_atypique: boolean;
    taux_pauvrete: number;
    part_rurale: number;
    ecoles_pour_1000_enfants: number;
    enfants_hors_ecole: number;
  }[];
  deviants_positifs: string[];
  sous_performances: string[];
  profils_atypiques: string[];
  lecture: string;
}

export interface StabilityData {
  k_retenu: number;
  bootstrap: {
    n_boot: number;
    par_k: { k: number; ari_moyen: number; ari_ecart_type: number; ari_p05: number; silhouette: number }[];
    k_le_plus_stable: number;
  };
  co_assignation: {
    wilayas: string[];
    matrice: { x: string; y: string; value: number }[];
    paires_ambigues: { a: string; b: string; frequence: number }[];
  };
  melange_gaussien: { par_k: { k: number; bic: number; aic: number }[]; k_bic_optimal: number; avertissement: string };
  hierarchique: { ordre_feuilles: string[]; sauts: { de_k: number; a_k: number; saut_distance: number }[] };
  verdict: string;
}

export interface OptimData {
  tension_efficience_equite: {
    top3_ipe: string[];
    servies_a_25pct: string[];
    prioritaires_non_servies: string[];
    lecture: string;
  };
  hypotheses: Record<string, number>;
  besoin_total_mro: number;
  besoin_total_meuro: number;
  enfants_mobilisables_total: number;
  classement_cout_efficacite: {
    wilaya: string;
    enfants_hors_ecole: number;
    enfants_mobilisables: number;
    capacite_effective: number;
    etablissements_requis: number;
    cout_total_mro: number;
    cout_par_enfant_mro: number;
    cout_total_meuro: number;
  }[];
  allocations: Record<string, {
    budget_mro: number;
    budget_meuro: number;
    enfants_atteints: number;
    cout_moyen_par_enfant_mro: number | null;
    wilayas_servies: {
      wilaya: string;
      enfants_atteints: number;
      part_du_gisement_pct: number;
      budget_meuro: number;
      cout_par_enfant_mro: number;
    }[];
  }>;
  frontiere: {
    budget_meuro: number;
    enfants_atteints: number;
    part_du_besoin_pct: number;
    cout_marginal_mro?: number | null;
  }[];
  dea: {
    wilayas: { wilaya: string; score_efficience: number; efficiente: boolean; scol_formel_pct: number; ecoles_pour_1000_enfants: number }[];
    n_efficientes: number;
    lecture: string;
  };
}

// ---- Phase 4 : spatial, accès, projection, entrepôt, LLM --------------------

export interface MoranResult {
  I: number;
  I_attendu_sous_H0: number;
  pvalue_permutation: number;
  significatif: boolean;
  n_permutations: number;
  distribution_simulee: { moyenne: number; ecart_type: number; p05: number; p95: number };
}

export interface LisaRow {
  wilaya: string;
  z: number;
  lag_voisinage: number;
  lisa: number;
  pvalue: number;
  significatif: boolean;
  quadrant: string;
}

export interface SpatialData {
  voisinage: { wilayas: string[]; voisins: Record<string, string[]>; n_liens: number; methode: string };
  variables: Record<string, { label: string; moran: MoranResult; lisa: LisaRow[] }>;
  conclusion: string;
}

export interface AccesData {
  n_moughataas: number;
  n_etablissements: number;
  points_cible_par_moughataa: number;
  seuils_km: number[];
  distance_ppv_mediane_km: number;
  moughataas: {
    adm2_pcode: string;
    moughataa: string;
    wilaya: string;
    n_etablissements: number;
    n_points_echantillon: number;
    pas_grille_km: number;
    distance_mediane_km: number;
    distance_max_km: number;
    part_au_dela_5km_pct: number;
    part_au_dela_10km_pct: number;
  }[];
  par_wilaya: {
    wilaya: string;
    n_moughataas: number;
    n_etablissements: number;
    moughataas_sans_ecole: number;
    part_au_dela_10km_pct: number;
  }[];
  moughataas_sans_ecole: string[];
  geojson: string;
  limite: string;
}

export interface ProjectionData {
  hypotheses: Record<string, number>;
  par_wilaya: {
    wilaya: string;
    pop_6_14_2022: number;
    pop_6_14_2030: number;
    part_deja_nee_pct: number;
    croissance_pct: number;
  }[];
  scenarios: {
    horizon: number;
    population_6_14_2022: number;
    population_6_14_2030: number;
    croissance_population_pct: number;
    enfants_hors_ecole_2022: number;
    pente_prudente: number;
    pente_tendancielle: number;
    trajectoires: {
      id: string;
      label: string;
      description: string;
      taux_2030: number;
      enfants_2030: number;
      enfants_si_population_gelee: number;
      effet_demographique: number;
      variation_vs_2022: number;
    }[];
    fan_chart: { annee: number; median: number; p10: number; p90: number; population_6_14: number }[];
  };
  besoins: {
    wilaya: string;
    pop_6_14_2022: number;
    pop_6_14_2030: number;
    croissance_pct: number;
    etablissements_actuels: number;
    ecoles_a_creer_2022: number;
    ecoles_a_creer_2030: number;
    surcout_demographique: number;
  }[];
  surcout_total_ecoles: number;
  message_cle: string;
}

export interface CubeData {
  dimensions: string[];
  mesure: string;
  colonnes: string[];
  cellules: Record<string, string | number | boolean>[];
}

export interface AskData {
  statut: string;
  message?: string;
  question?: string;
  sql?: string;
  motif?: string;
  detail?: string;
  schema?: string;
  resultat?: { colonnes: string[]; lignes: (string | number | boolean | null)[][]; n_lignes: number; tronque: boolean };
}

export interface BriefsData {
  disponible: boolean;
  modele?: string;
  n_wilayas?: number;
  langues?: string[];
  note?: string;
  methode?: string;
  briefs: Record<string, Record<string, {
    statut: string;
    texte: string | null;
    modele?: string;
    verification?: { n_nombres_cites: number; nombres_non_sources: string[]; verifie: boolean };
  }>>;
}

export interface QualiteData {
  n_controles: number;
  n_ok: number;
  n_echecs: number;
  resultats: { controle: string; statut: string; detail: string }[];
}
