import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useCorrelations, useSimilarite, fmt } from "../lib/api";
import { forceGraph } from "../lib/charts";
import { Badge, Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";
import type { CorrNode, SimEdge, SimNode } from "../lib/types";

const CLUSTER_COLORS = ["#4ec3a3", "#eeb74f", "#ef6f5f"];

export default function Reseau() {
 const { t } = useI18n();
 const sim = useSimilarite();
 const corr = useCorrelations();

 if (sim.error || corr.error) return <ErrorBox message={sim.error ?? corr.error ?? t("reseau.erreur")} />;
 if (sim.loading || corr.loading) return <Loading label={t("reseau.loading")} />;

 const similarite = sim.data!;
 const correlations = corr.data!;

 const simGraph = forceGraph(
 similarite.nodes.map((n) => ({
 id: n.id,
 label: n.wilaya,
 value: n.enfants_hors_ecole ? Math.min(1, n.enfants_hors_ecole / 70000) : 0.3,
 category: n.cluster,
 })),
 similarite.edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
 [{ name: t("reseau.cat_c0") }, { name: t("reseau.cat_c1") }, { name: t("reseau.cat_c2") }]
 );

 const corrGraph = forceGraph(
 correlations.nodes.map((n) => ({ id: n.id, label: t(n.label), value: n.taille / 25, category: 0 })),
 correlations.edges.map((e) => ({ source: e.source, target: e.target, weight: Math.abs(e.r) })),
 [{ name: t("reseau.cat_indicators") }]
 );

 const degree: Record<string, number> = {};
 for (const e of similarite.edges) {
 degree[e.source] = (degree[e.source] ?? 0) + 1;
 degree[e.target] = (degree[e.target] ?? 0) + 1;
 }

 const hubs = [...similarite.nodes]
 .sort((a, b) => (degree[b.id] ?? 0) - (degree[a.id] ?? 0) || b.enfants_hors_ecole - a.enfants_hors_ecole)
 .slice(0, 4);

 const topSim = [...similarite.edges].sort((a, b) => b.weight - a.weight)[0];
 const topCorr = [...correlations.edges].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];
 const isolates = correlations.nodes.filter((n) => n.degre === 0);

 const indLabel = (id: string) => t(correlations.nodes.find((n) => n.id === id)?.label ?? id);

 const edgeHE = correlations.edges.find(
 (e) =>
 (e.source === "scol_Hors_ecole_formelle" && e.target === "ratio_dependance_jeunes") ||
 (e.target === "scol_Hors_ecole_formelle" && e.source === "ratio_dependance_jeunes")
 );
 const edgeRural = correlations.edges.find(
 (e) =>
 (e.source === "part_rurale" && e.target === "ratio_dependance_jeunes") ||
 (e.target === "part_rurale" && e.source === "ratio_dependance_jeunes")
 );

 const byCluster = new Map<number, SimNode[]>();
 for (const n of similarite.nodes) {
 const arr = byCluster.get(n.cluster) ?? [];
 arr.push(n);
 byCluster.set(n.cluster, arr);
 }
 const clusterStats = [...byCluster.entries()].sort((a, b) => a[0] - b[0]).map(([cluster, nodes]) => {
 const total = nodes.reduce((s, n) => s + n.enfants_hors_ecole, 0);
 const min = Math.min(...nodes.map((n) => n.hors_ecole_pct));
 const max = Math.max(...nodes.map((n) => n.hors_ecole_pct));
 return { cluster, nodes, total, min, max };
 });

 return (
 <div>
 <PageHeader
 eyebrow={t("reseau.eyebrow")}
 title={t("reseau.title")}
 subtitle={t("reseau.subtitle")}
 />

 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Kpi icon="wilayas" label={t("reseau.kpi_wilayas")} value={String(similarite.nodes.length)} sub={t("reseau.kpi_wilayas_sub")} />
 <Kpi icon="clusters" label={t("reseau.kpi_communautes")} value={String(similarite.n_communities)} sub={t("reseau.kpi_communautes_sub")} accent="text-accent2" />
 <Kpi icon="network" label={t("reseau.kpi_lien_max")} value={`r = ${topSim.r.toFixed(2)}`} sub={`${topSim.source} ↔ ${topSim.target}`} accent="text-warn" />
 <Kpi icon="trend" label={t("reseau.kpi_corr_max")} value={`r = ${Math.abs(topCorr.r).toFixed(2)}`} sub={`${indLabel(topCorr.source)} ↔ ${indLabel(topCorr.target)}`} accent="text-danger" />
 </div>

 <Card className="mt-6" delay={0.03}>
 <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
 <h2 className="font-display text-base font-semibold text-fg">{t("reseau.revele")}</h2>
 <Badge color="bg-accent2/15 text-accent2">{t("reseau.revele_badge")}</Badge>
 </div>
 <div className="grid gap-4 md:grid-cols-3">
 <Insight
 title={t("reseau.hub_title")}
 text={t("reseau.hub_text", { w1: hubs[0].wilaya, w2: hubs[1].wilaya, w3: hubs[2].wilaya })}
 />
 <Insight
 title={t("reseau.lienfort_title")}
 text={t("reseau.lienfort_text", { a: topSim.source, b: topSim.target, r: topSim.r.toFixed(2) })}
 />
 <Insight
 title={t("reseau.isole_title")}
 text={t("reseau.isole_text", { liste: isolates.map((n) => indLabel(n.id)).join(", ") })}
 />
 </div>
 <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
 <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mut">{t("reseau.hubs_label")}</span>
 {hubs.map((h) => (
 <Link key={h.id} to={`/wilayas?w=${encodeURIComponent(h.wilaya)}`}>
 <Badge color="bg-accent/15 text-accent hover:bg-accent/25">{h.wilaya} · {degree[h.id] ?? 0} {t("reseau.lien_degree")}</Badge>
 </Link>
 ))}
 <span className="ms-auto text-[11px] text-mut">
 {t("reseau.hubs_volume", { n: fmt(hubs.reduce((s, h) => s + h.enfants_hors_ecole, 0)) })}
 </span>
 </div>
 </Card>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card delay={0.05}>
 <div className="flex items-center justify-between">
 <h2 className="font-display text-base font-semibold text-fg">{t("reseau.similarite")}</h2>
 <Badge color="bg-accent/15 text-accent">{similarite.n_communities} {t("reseau.communautes")}</Badge>
 </div>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("reseau.similarite_desc")}
 </p>
 <ReactECharts option={simGraph} style={{ height: 520 }} />
 </Card>

 <Card delay={0.07}>
 <h2 className="font-display text-base font-semibold text-fg">{t("reseau.correlations")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("reseau.correlations_desc")}
 </p>
 <ReactECharts option={corrGraph} style={{ height: 520 }} />
 </Card>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h3 className="mb-3 font-display text-base font-semibold text-fg">{t("reseau.liens_forts")}</h3>
 <div className="space-y-1.5">
 {[...similarite.edges].sort((a, b) => b.weight - a.weight).slice(0, 8).map((e, i) => (
 <Link key={i} to={`/wilayas?w=${encodeURIComponent(e.source)}`} className="block">
 <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs transition-colors hover:bg-white/[0.06]">
 <span className="font-semibold text-fg">{e.source}</span>
 <span className="text-mut">↔</span>
 <span className="font-semibold text-fg">{e.target}</span>
 <span className="ml-auto num text-mut">{t("reseau.r")} {e.weight.toFixed(2)}</span>
 </div>
 <div className="mx-3 -mt-1 h-0.5 overflow-hidden rounded-full bg-white/5">
 <div className="h-full rounded-full bg-accent/60" style={{ width: `${Math.round(e.weight * 100)}%` }} />
 </div>
 </Link>
 ))}
 </div>
 <p className="mt-3 text-[11px] leading-relaxed text-mut">
 {t("reseau.geographie")}
 </p>
 </Card>

 <Card>
 <h3 className="mb-3 font-display text-base font-semibold text-fg">{t("reseau.lecture")}</h3>
 <div className="space-y-3">
 <Insight
 title={t("reseau.insight1_title")}
 text={t("reseau.insight1_text")}
 />
 <Insight
 title={t("reseau.insight2_title")}
 text={t("reseau.insight2_text", { r: (edgeHE?.r ?? 0.76).toFixed(2), r2: (edgeRural?.r ?? 0.91).toFixed(2) })}
 />
 <Insight
 title={t("reseau.insight3_title")}
 text={t("reseau.insight3_text")}
 />
 </div>
 </Card>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 {clusterStats.map((c, i) => (
 <Card key={c.cluster} delay={0.05 + i * 0.02}>
 <div className="mb-3 flex items-center justify-between">
 <h3 className="font-display text-base font-semibold text-fg">
 <span className="me-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: CLUSTER_COLORS[c.cluster] }} />
 {t("reseau.cat_" + ("c" + c.cluster))}
 </h3>
 <Badge color="bg-accent/15 text-accent">{fmt(c.total)} {t("reseau.enfants")}</Badge>
 </div>
 <div className="flex flex-wrap gap-2">
 {c.nodes
 .sort((a, b) => b.enfants_hors_ecole - a.enfants_hors_ecole)
 .map((n) => (
 <Link key={n.id} to={`/wilayas?w=${encodeURIComponent(n.wilaya)}`}>
 <Badge color="bg-white/5 text-mut hover:text-accent">{n.wilaya}</Badge>
 </Link>
 ))}
 </div>
 <p className="mt-3 text-[11px] leading-relaxed text-mut">
 {t("reseau.profil_range", { min: c.min.toFixed(1), max: c.max.toFixed(1) })}
 </p>
 </Card>
 ))}
 </div>
 </div>
 );
}

function Insight({ title, text }: { title: string; text: string }) {
 return (
 <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
 <div className="text-xs font-bold text-accent">{title}</div>
 <div className="mt-1 text-xs leading-relaxed text-mut">{text}</div>
 </div>
 );
}
