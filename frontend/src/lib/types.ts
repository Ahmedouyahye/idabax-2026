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
  sans_cm: Rule[];
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
  facteur_determinant: string;
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
