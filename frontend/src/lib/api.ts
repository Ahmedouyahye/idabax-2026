import { useCallback, useEffect, useState } from "react";
import type {
 Clusters,
 ConcentrationData,
 CorrEdge,
 CorrNode,
 DecompositionData,
 IndicateursData,
 LogitData,
 MatriceData,
 RulesData,
 ScenariosData,
 SimEdge,
 SimNode,
 Summary,
 TrendSeries,
 Wilaya,
} from "./types";

async function get<T>(path: string): Promise<T> {
 const res = await fetch(path);
 if (!res.ok) throw new Error(`${res.status} sur ${path}`);
 return res.json();
}

export function useSummary() {
 return useData<Summary>("/api/summary");
}

export function useWilayas() {
 return useData<Wilaya[]>("/api/wilayas");
}

export function useClusters() {
 return useData<Clusters>("/api/clusters");
}

export function useSimilarite() {
 return useData<{ nodes: SimNode[]; edges: SimEdge[]; n_communities: number }>("/api/graph/similarite");
}

export function useCorrelations() {
 return useData<{ nodes: CorrNode[]; edges: CorrEdge[] }>("/api/graph/correlations");
}

export function useRules() {
 return useData<RulesData>("/api/rules");
}

export function useDecomposition() {
 return useData<DecompositionData>("/api/decomposition");
}

export function useMatrice() {
 return useData<MatriceData>("/api/matrice");
}

export function useConcentration() {
 return useData<ConcentrationData>("/api/concentration");
}

export function useLogit() {
 return useData<LogitData>("/api/logit");
}

export function useScenarios() {
 return useData<ScenariosData>("/api/scenarios");
}

export function useIndicateurs() {
 return useData<IndicateursData>("/api/indicateurs");
}

export function useTrends() {
 return useData<{ series: Record<string, { year: number; value: number }[]> }>("/api/trends");
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
 fetch("/api/geojson")
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
