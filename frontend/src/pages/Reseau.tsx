import ReactECharts from "echarts-for-react";
import { useCorrelations, useSimilarite } from "../lib/api";
import { forceGraph } from "../lib/charts";
import { Badge, Card, ErrorBox, Loading, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";

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

 return (
 <div>
 <PageHeader
 eyebrow={t("reseau.eyebrow")}
 title={t("reseau.title")}
 subtitle={t("reseau.subtitle")}
 />

 <div className="grid gap-6 lg:grid-cols-2">
 <Card>
 <div className="flex items-center justify-between">
 <h2 className="font-display text-base font-semibold text-fg">{t("reseau.similarite")}</h2>
 <Badge color="bg-accent/15 text-accent">{similarite.n_communities} {t("reseau.communautes")}</Badge>
 </div>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("reseau.similarite_desc")}
 </p>
 <ReactECharts option={simGraph} style={{ height: 520 }} />
 </Card>

 <Card>
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
 {[...similarite.edges].sort((a, b) => b.weight - a.weight).map((e, i) => (
 <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
 <span className="font-semibold text-fg">{e.source}</span>
 <span className="text-mut">↔</span>
 <span className="font-semibold text-fg">{e.target}</span>
 <span className="ml-auto num text-mut">{t("reseau.r")} {e.weight.toFixed(2)}</span>
 </div>
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
 text={t("reseau.insight2_text")}
 />
 <Insight
 title={t("reseau.insight3_title")}
 text={t("reseau.insight3_text")}
 />
 </div>
 </Card>
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
