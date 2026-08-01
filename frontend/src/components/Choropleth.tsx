import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGeojson, fmt, pct } from "../lib/api";
import { useI18n } from "../lib/i18n";

const METRICS: Record<string, { labelKey: string; accessor: (p: any) => number; fmt: (v: number) => string }> = {
 ipe: {
  labelKey: "choropleth.metric.ipe",
  accessor: (p) => p.ipe ?? 0,
  fmt: (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }),
 },
 scol_Hors_ecole_formelle: {
  labelKey: "Taux hors école formelle",
  accessor: (p) => p.scol_Hors_ecole_formelle ?? 0,
  fmt: pct,
 },
 taux_pauvrete: { labelKey: "Taux de pauvreté", accessor: (p) => p.taux_pauvrete ?? 0, fmt: pct },
 population_2022: { labelKey: "Population 2022", accessor: (p) => p.population_2022 ?? 0, fmt: fmt },
 enfants_hors_ecole: { labelKey: "choropleth.metric.enfantsHorsEcole", accessor: (p) => p.enfants_hors_ecole ?? 0, fmt: fmt },
 ratio_dependance_jeunes: { labelKey: "Dépendance jeunes", accessor: (p) => p.ratio_dependance_jeunes ?? 0, fmt: fmt },
};

function colorScale(v: number, min: number, max: number) {
 if (max === min) return "#4ec3a3";
 const t = (v - min) / (max - min);
 const c = Math.round(160 - t * 125);
 return `hsl(${c} 78% 55%)`;
}

const CENTER: [number, number] = [19.5, -11.5];
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png";

function toRings(geometry: any): [number, number][][] {
 const coords = geometry?.coordinates ?? [];
 const rings: [number, number][][] = [];
 if (geometry?.type === "Polygon") {
 for (const ring of coords) rings.push(ring.map((c: number[]) => [c[1], c[0]] as [number, number]));
 } else if (geometry?.type === "MultiPolygon") {
 for (const poly of coords) for (const ring of poly) rings.push(ring.map((c: number[]) => [c[1], c[0]] as [number, number]));
 }
 return rings;
}

function FitBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
 const map = useMap();
 useEffect(() => {
 map.fitBounds(bounds, { padding: [12, 12] });
 }, [map, bounds]);
 return null;
}

export function Choropleth({ height = 460, selector = true }: { height?: number; selector?: boolean }) {
 const { t } = useI18n();
 const geo = useGeojson();
 const [metric, setMetric] = useState("ipe");

 const features = useMemo(() => geo.data?.features ?? [], [geo.data]);

 const values = useMemo(
 () => features.map((f: any) => METRICS[metric].accessor(f.properties)).filter((v: number) => Number.isFinite(v)),
 [features, metric]
 );
 const min = Math.min(...values);
 const max = Math.max(...values);

 const bounds: [[number, number], [number, number]] | null = useMemo(() => {
 const pts: [number, number][] = [];
 features.forEach((f: any) => toRings(f.geometry).forEach((r) => pts.push(...r)));
 if (pts.length === 0) return null;
 const lats = pts.map((p) => p[0]);
 const lons = pts.map((p) => p[1]);
 return [
 [Math.min(...lats), Math.min(...lons)],
 [Math.max(...lats), Math.max(...lons)],
 ];
 }, [features]);

 if (geo.loading) return <div className="flex h-64 items-center justify-center text-sm text-mut">{t("choropleth.loading")}</div>;
 if (!geo.data || features.length === 0) return <div className="flex h-64 items-center justify-center text-sm text-danger">{t("choropleth.unavailable")}</div>;

 const m = METRICS[metric];
 return (
 <div className="relative">
 {selector && (
 <div className="mb-3 flex flex-wrap gap-2">
 {Object.entries(METRICS).map(([key, mm]) => (
 <button
 key={key}
 onClick={() => setMetric(key)}
 className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
 metric === key
 ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(45,212,191,0.3)]"
 : "bg-white/5 text-mut hover:text-fg"
 }`}
 >
 {t(mm.labelKey)}
 </button>
 ))}
 </div>
 )}
 <div className="relative overflow-hidden rounded-2xl border border-line">
 <MapContainer center={CENTER} zoom={5} minZoom={4} maxZoom={9} style={{ height, width: "100%" }} zoomControl={false} attributionControl={false}>
 {bounds && <FitBounds bounds={bounds} />}
 <TileLayer url={DARK_TILES} subdomains="abcd" />
 {features.map((f: any, idx: number) => {
 const p = f.properties;
 const v = m.accessor(p);
 const color = colorScale(v, min, max);
 return (
 <Polygon
 key={`${p.wilaya}-${idx}`}
 positions={toRings(f.geometry)}
 pathOptions={{ color: "rgba(21,17,10,0.95)", weight: 1.4, fillColor: color, fillOpacity: 0.74 }}
 >
 <Tooltip direction="top" sticky>
 <div className="text-xs">
 <div className="font-bold text-fg">{p.wilaya}</div>
 <div className="text-mut">
 {t(m.labelKey)} : <span className="num font-semibold text-accent">{m.fmt(v)}</span>
 </div>
 <div className="text-mut">{t("choropleth.tooltip.population")} : {fmt(p.population_2022)}</div>
 <div className="text-mut">{t("choropleth.tooltip.rangIpe")} : #{p.rang_ipe ?? ""}</div>
 </div>
 </Tooltip>
 </Polygon>
 );
 })}
 </MapContainer>
 <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-line bg-panel/90 p-3 backdrop-blur">
 <div className="text-[11px] font-semibold text-fg">{t(m.labelKey)}</div>
 <div className="mt-2 flex items-center gap-2">
 <div className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg, hsl(160 78% 55%), hsl(35 92% 55%))" }} />
 <span className="num text-[11px] text-mut">
 {m.fmt(min)} {m.fmt(max)}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}
