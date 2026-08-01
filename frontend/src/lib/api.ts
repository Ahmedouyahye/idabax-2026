import { useCallback, useEffect, useState } from "react";
import type {
 AccesData,
 AskData,
 BriefsData,
 Clusters,
 CohortesData,
 CubeData,
 ConcentrationData,
 CorrEdge,
 CorrNode,
 DecompositionData,
 DeviantsData,
 EquityData,
 IndicateursData,
 LogitData,
 MatriceData,
 MlData,
 OptimData,
 ParcoursData,
 PatternsData,
 ProjectionData,
 QualiteData,
 RendementData,
 RobustnessData,
 RulesData,
 ScenariosData,
 SpatialData,
 StabilityData,
 SimEdge,
 SimNode,
 Summary,
 TrendSeries,
 UncertaintyData,
 Wilaya,
} from "./types";

// Depuis `python -m backend.export_static`, l'API est figée dans des fichiers
// statiques sous `frontend/public/data/` : aucun serveur FastAPI n'est requis,
// le tableau de bord se déploie tel quel sur Vercel / GitHub Pages.
const STATIC = "/data";

async function get<T>(path: string): Promise<T> {
 const res = await fetch(path);
 if (!res.ok) throw new Error(`${res.status} sur ${path}`);
 return res.json();
}

export function useSummary() {
 return useData<Summary>(`${STATIC}/summary.json`);
}

export function useWilayas() {
 return useData<Wilaya[]>(`${STATIC}/wilayas.json`);
}

export function useClusters() {
 return useData<Clusters>(`${STATIC}/clusters.json`);
}

export function useSimilarite() {
 return useData<{ nodes: SimNode[]; edges: SimEdge[]; n_communities: number }>(`${STATIC}/graph_similarite.json`);
}

export function useCorrelations() {
 return useData<{ nodes: CorrNode[]; edges: CorrEdge[] }>(`${STATIC}/graph_correlations.json`);
}

export function useRules() {
 return useData<RulesData>(`${STATIC}/rules.json`);
}

export function useDecomposition() {
 return useData<DecompositionData>(`${STATIC}/decomposition.json`);
}

export function useMatrice() {
 return useData<MatriceData>(`${STATIC}/matrice.json`);
}

export function useConcentration() {
 return useData<ConcentrationData>(`${STATIC}/concentration.json`);
}

export function useLogit() {
 return useData<LogitData>(`${STATIC}/logit.json`);
}

export function useScenarios() {
 return useData<ScenariosData>(`${STATIC}/scenarios.json`);
}

export function useIndicateurs() {
 return useData<IndicateursData>(`${STATIC}/indicateurs.json`);
}

export function useUncertainty() {
 return useData<UncertaintyData>(`${STATIC}/uncertainty.json`);
}

export function useRobustesse() {
 return useData<RobustnessData>(`${STATIC}/robustesse.json`);
}

export function useEquite() {
 return useData<EquityData>(`${STATIC}/equite.json`);
}

export function useParcours() {
 return useData<ParcoursData>(`${STATIC}/parcours.json`);
}

export function useRendement() {
 return useData<RendementData>(`${STATIC}/rendement.json`);
}

export function useCohortes() {
 return useData<CohortesData>(`${STATIC}/cohortes.json`);
}

export function useMl() {
 return useData<MlData>(`${STATIC}/ml.json`);
}

export function usePatterns() {
 return useData<PatternsData>(`${STATIC}/patterns.json`);
}

export function useDeviants() {
 return useData<DeviantsData>(`${STATIC}/deviants.json`);
}

export function useStabilite() {
 return useData<StabilityData>(`${STATIC}/stabilite.json`);
}

export function useOptimisation() {
 return useData<OptimData>(`${STATIC}/optimisation.json`);
}

export function useSpatial() {
 return useData<SpatialData>(`${STATIC}/spatial.json`);
}

export function useAcces() {
 return useData<AccesData>(`${STATIC}/acces.json`);
}

export function useProjection() {
 return useData<ProjectionData>(`${STATIC}/projection.json`);
}

export function useQualite() {
 return useData<QualiteData>(`${STATIC}/qualite.json`);
}

export function useBriefs() {
 return useData<BriefsData>(`${STATIC}/briefs.json`);
}

/* ------------------------------------------------------------- cube (local) */
interface CubeCells {
 dimensions_possibles: string[];
 mesures_possibles: Record<string, string>;
 cellules: Record<string, string | number | boolean>[];
 note: string;
}

interface CubeRow extends Record<string, string | number | boolean> {
 n_enfants: number;
 mesure: number;
 pct: number;
}

const CUBE_MESURES: Record<string, string> = {
 hors_ecole: "n_hors_ecole",
 traditionnel: "n_traditionnel",
 enfants: "n_enfants",
};

// L'agrégation OLAP était servie par DuckDB ; en statique on charge les cellules
// de base et on recompose chaque sous-total dans le navigateur.
export function useCube(dims: string, measure: string) {
 const base = useData<CubeCells>(`${STATIC}/cube_cells.json`);
 const [data, setData] = useState<CubeData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  if (base.loading || base.error || !base.data) return;
  try {
   const cols = dims.split(",").map((s) => s.trim()).filter(Boolean);
   const mesureCol = CUBE_MESURES[measure] ?? "n_hors_ecole";
   const groups = new Map<string, CubeRow>();
   for (const cell of base.data.cellules) {
    const key = cols.map((c) => String(cell[c] ?? "")).join("|");
    let g = groups.get(key);
    if (!g) {
     g = { ...(Object.fromEntries(cols.map((c) => [c, cell[c]])) as Record<string, string | number | boolean>), n_enfants: 0, mesure: 0, pct: 0 };
     groups.set(key, g);
    }
    g.n_enfants += Number(cell.n_enfants) || 0;
    g.mesure += Number(cell[mesureCol]) || 0;
   }
   const cellules = [...groups.values()]
    .map((g) => ({ ...g, pct: g.n_enfants ? Math.round((1000 * g.mesure) / g.n_enfants) / 10 : 0 }))
    .sort((a, b) => Number(b.mesure) - Number(a.mesure));
   setData({
    dimensions: cols,
    mesure: measure in CUBE_MESURES ? measure : "hors_ecole",
    colonnes: [...cols, "n_enfants", "mesure", "pct"],
    cellules,
   });
   setLoading(false);
  } catch (e) {
   setError(String(e));
   setLoading(false);
  }
 }, [base, dims, measure]);

 return {
  data,
  loading: base.loading || loading,
  error: base.error ?? error,
  reload: base.reload,
 };
}

export function useTrends() {
 return useData<{ series: Record<string, { year: number; value: number }[]> }>(`${STATIC}/trends.json`);
}

export function parseTrendSeries(raw: Record<string, { year: number; value: number }[]>): TrendSeries[] {
 return Object.entries(raw)
 .map(([key, points]) => {
 const idx = key.indexOf(",");
 const code = idx >= 0 ? key.slice(0, idx) : key;
 const label = idx >= 0 ? key.slice(idx + 1) : key;
 return { code, label, points: points.slice().sort((a, b) => a.year - b.year) };
 })
 .sort((a, b) => a.label.localeCompare(b.label));
}

export function useGeojson() {
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 useEffect(() => {
  fetch(`${STATIC}/geojson.json`)
  .then((r) => r.json())
  .then(setData)
  .catch((e) => setError(String(e)))
  .finally(() => setLoading(false));
 }, []);
 return { data, loading, error };
}

export function useData<T>(path: string) {
 const [data, setData] = useState<T | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const reload = useCallback(() => {
 setLoading(true);
 get<T>(path)
 .then(setData)
 .catch((e) => setError(String(e)))
 .finally(() => setLoading(false));
 }, [path]);

 useEffect(reload, [reload]);
 return { data, loading, error, reload };
}

export function fmt(n: number | null | undefined): string {
 if (n === null || n === undefined || Number.isNaN(n)) return "";
 return n.toLocaleString("fr-FR");
}

export function pct(n: number | null | undefined): string {
 if (n === null || n === undefined || Number.isNaN(n)) return "";
 return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}
