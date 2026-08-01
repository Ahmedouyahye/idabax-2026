import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { fmt, useConcentration, useMatrice, useScenarios } from "../lib/api";
import { ACCENT2, CORAL } from "../lib/charts";
import { Badge, Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";

export default function Strategies() {
 const { t } = useI18n();
 const matrice = useMatrice();
 const conc = useConcentration();
 const scen = useScenarios();

 if (matrice.error || conc.error || scen.error)
 return <ErrorBox message={matrice.error ?? conc.error ?? scen.error ?? t("strategies.error")} />;
 if (matrice.loading || conc.loading || scen.loading)
 return <Loading label={t("strategies.loading")} />;

 const m = matrice.data!;
 const c = conc.data!;
 const s = scen.data!;

 const quadrantColor = (id: string) => m.quadrants.find((q) => q.id === id)?.color ?? "#66737d";

 const scatterOption: EChartsOption = {
 tooltip: {
 trigger: "item",
 backgroundColor: "#ffffff",
 borderColor: "rgba(37,50,58,0.14)",
 textStyle: { color: "#22303a" },
 formatter: (p: any) =>
 t("strategies.scatterTooltip", { wilaya: p.data.name, enfants: fmt(p.data.value[2]), volume: p.data.value[0].toFixed(1), taux: p.data.value[1].toFixed(1) }),
 },
 grid: { left: 10, right: 16, top: 16, bottom: 10, containLabel: true },
 xAxis: {
 type: "value",
 name: t("strategies.volume"),
 nameTextStyle: { color: "#66737d", fontSize: 10 },
 axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } },
 axisLabel: { color: "#66737d", fontSize: 11 },
 splitLine: { lineStyle: { color: "rgba(37,50,58,0.07)" } },
 },
 yAxis: {
 type: "value",
 name: t("strategies.taux"),
 nameTextStyle: { color: "#66737d", fontSize: 10 },
 axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } },
 axisLabel: { color: "#66737d", fontSize: 11 },
 splitLine: { lineStyle: { color: "rgba(37,50,58,0.07)" } },
 },
 series: [
 {
 type: "scatter",
 symbolSize: (val: number[]) => Math.max(10, Math.min(34, val[2] / 6000)),
 data: m.scatter.map((p) => ({
 name: p.wilaya,
 value: [p.volume_log, p.scol_Hors_ecole_formelle, p.enfants_hors_ecole],
 itemStyle: { color: quadrantColor(p.quadrant_id), opacity: 0.92, borderColor: "#ffffff", borderWidth: 1.5 },
 label: { show: true, formatter: p.wilaya, position: "top", color: "#55636d", fontSize: 10, fontWeight: 600 },
 })),
 markLine: {
 symbol: "none",
 silent: true,
 label: { show: false },
 lineStyle: { color: "rgba(37,50,58,0.22)", type: "dashed" },
 data: [{ xAxis: m.median_volume_log }, { yAxis: m.median_intensite }],
 },
 },
 ],
 };

 const paretoOption: EChartsOption = {
 tooltip: { trigger: "axis", backgroundColor: "#ffffff", borderColor: "rgba(37,50,58,0.14)", textStyle: { color: "#22303a" } },
 grid: { left: 10, right: 40, top: 12, bottom: 10, containLabel: true },
 legend: { textStyle: { color: "#66737d", fontSize: 11 }, top: 0 },
 xAxis: { type: "category", data: c.top5.map((t) => t.wilaya), axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } }, axisLabel: { color: "#55636d", fontSize: 10, fontWeight: 600 } },
 yAxis: [
 {
 type: "value",
 axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } },
 axisLabel: { color: "#66737d", fontSize: 11 },
 splitLine: { lineStyle: { color: "rgba(37,50,58,0.07)" } },
 },
 {
 type: "value",
 max: 100,
 axisLabel: { color: "#66737d", fontSize: 11, formatter: "{value} %" },
 splitLine: { show: false },
 },
 ],
 series: [
 {
 name: t("strategies.enfantsHorsEcole"),
 type: "bar",
 barWidth: 34,
 data: c.top5.map((t) => ({ value: t.enfants_hors_ecole, itemStyle: { color: ACCENT2, borderRadius: [6, 6, 0, 0] } })),
 },
 {
 name: t("strategies.partCumulee"),
 type: "line",
 yAxisIndex: 1,
 symbol: "circle",
 symbolSize: 7,
 lineStyle: { color: CORAL, width: 2.5 },
 itemStyle: { color: CORAL },
 data: c.top5.map((t) => t.part_cumulee),
 },
 ],
 };

 const lorenzOption: EChartsOption = {
 tooltip: {
 trigger: "axis",
 backgroundColor: "#ffffff",
 borderColor: "rgba(37,50,58,0.14)",
 textStyle: { color: "#22303a" },
 formatter: (p: any) => t("strategies.lorenzTooltip", { w: p[0].data[0].toFixed(1), e: p[0].data[1].toFixed(1) }),
 },
 grid: { left: 10, right: 16, top: 12, bottom: 10, containLabel: true },
 xAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#66737d", fontSize: 11, formatter: "{value} %" }, axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } }, splitLine: { lineStyle: { color: "rgba(37,50,58,0.07)" } } },
 yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#66737d", fontSize: 11, formatter: "{value} %" }, axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } }, splitLine: { lineStyle: { color: "rgba(37,50,58,0.07)" } } },
 series: [
 {
 type: "line",
 name: t("strategies.concentration"),
 smooth: true,
 symbol: "circle",
 symbolSize: 5,
 lineStyle: { color: CORAL, width: 2.5 },
 itemStyle: { color: CORAL },
 areaStyle: { color: "rgba(239,111,95,0.12)" },
 data: c.lorenz.map((p) => [p.x, p.y]),
 },
 {
 type: "line",
 name: t("strategies.egaliteParfaite"),
 symbol: "none",
 lineStyle: { color: "rgba(37,50,58,0.25)", type: "dashed" },
 data: [
 [0, 0],
 [100, 100],
 ],
 },
 ],
 };

 const scenarioBars: EChartsOption = {
 tooltip: { trigger: "axis", backgroundColor: "#ffffff", borderColor: "rgba(37,50,58,0.14)", textStyle: { color: "#22303a" }, formatter: (p: any) => `${t(p[0].name)}<br/>${t("strategies.scenarioTooltip", { n: fmt(p[0].value) })}` },
 grid: { left: 10, right: 16, top: 12, bottom: 10, containLabel: true },
 xAxis: { type: "category", data: s.scenarios.map((x) => x.label), axisLabel: { color: "#55636d", fontSize: 10, fontWeight: 600, interval: 0 }, axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } } },
 yAxis: { type: "value", axisLabel: { color: "#66737d", fontSize: 11 }, axisLine: { lineStyle: { color: "rgba(37,50,58,0.14)" } }, splitLine: { lineStyle: { color: "rgba(37,50,58,0.07)" } } },
 series: [
 {
 type: "bar",
 barWidth: 46,
 data: s.scenarios.map((x) => ({
 value: x.enfants_hors_ecole_2030,
 itemStyle: { color: x.color, borderRadius: [8, 8, 0, 0] },
 label: { show: true, position: "top", color: "#22303a", fontSize: 11, fontWeight: 700, formatter: (p: any) => `${Math.round(p.value / 1000)} k` },
 })),
 },
 ],
 };

 return (
 <div>
 <PageHeader
 eyebrow={t("strategies.eyebrow")}
 title={t("strategies.title")}
 subtitle={t("strategies.subtitle")}
 >
 <Badge color="bg-accent/15 text-accent">{t("strategies.badge")}</Badge>
 </PageHeader>

 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Kpi icon="target" label={t("strategies.kpiTop5")} value={`${c.top5_share.toFixed(1)} %`} sub={t("strategies.kpiTop5Sub", { n: fmt(c.total_enfants_hors_ecole) })} accent="text-warn" />
 <Kpi icon="grid" label={t("strategies.kpiWilayas")} value={`${c.n_wilayas_pour_50pct}`} sub={t("strategies.kpiWilayasSub")} accent="text-accent2" />
 <Kpi icon="trend" label={t("strategies.kpiGini")} value={c.gini.toFixed(3)} sub={t("strategies.kpiGiniSub")} accent="text-danger" />
 <Kpi icon="child" label={t("strategies.kpiHorsEcole2030")} value={`${fmt(s.scenarios[0].enfants_hors_ecole_2030)}`} sub={t("strategies.kpiTrajectoire")} accent="text-accent" />
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-5">
 <Card className="lg:col-span-3">
 <h2 className="font-display text-base font-semibold text-fg">{t("strategies.matrice")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("strategies.matriceText")}
 </p>
 <ReactECharts option={scatterOption} style={{ height: 440 }} />
 </Card>

 <div className="space-y-4 lg:col-span-2">
 {m.quadrants.map((q) => (
 <div key={q.id} className="glass rounded-2xl p-4" style={{ borderLeft: `3px solid ${q.color}` }}>
 <div className="flex items-center justify-between gap-2">
 <h3 className="font-display text-sm font-semibold" style={{ color: q.color }}>{t(q.label)}</h3>
 <Badge color="bg-ink/[0.05] text-mut">{fmt(q.enfants_hors_ecole)} {t("strategies.enfants")}</Badge>
 </div>
 <p className="mt-1.5 text-xs leading-relaxed text-mut">{t(q.description)}</p>
 <div className="mt-2 flex flex-wrap gap-1.5">
 {q.wilayas.map((w) => (
 <span key={w} className="rounded-md bg-ink/[0.05] px-2 py-0.5 text-[10px] font-semibold text-fg/80">{w}</span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("strategies.concentrationTitle")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("strategies.concentrationText", { part: c.top5_share.toFixed(1), n: c.n_wilayas_pour_50pct })}
 </p>
 <ReactECharts option={paretoOption} style={{ height: 300 }} />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("strategies.lorenzTitle")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("strategies.lorenzText", { gini: c.gini.toFixed(2) })}
 </p>
 <ReactECharts option={lorenzOption} style={{ height: 300 }} />
 </Card>
 </div>

 <Card className="mt-6">
 <div className="flex items-center justify-between gap-3">
 <h2 className="font-display text-base font-semibold text-fg">{t("strategies.scenariosTitle")}</h2>
 <Badge color="bg-accent2/15 text-accent2">{t("strategies.tendanceBadge", { v: Math.abs(s.trend_annual_pts).toFixed(2) })}</Badge>
 </div>
 <div className="mt-4 grid gap-6 lg:grid-cols-2">
 <ReactECharts option={scenarioBars} style={{ height: 320 }} />
 <div className="space-y-3">
 {s.scenarios.map((x) => (
 <div key={x.id} className="rounded-xl border border-line bg-ink/[0.045] p-3">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-fg">{t(x.label)}</span>
 <span className="num text-xs font-semibold" style={{ color: x.color }}>
 {x.taux_2030.toFixed(1)} % · {fmt(x.enfants_hors_ecole_2030)} {t("strategies.enfants")}
 </span>
 </div>
 <p className="mt-1 text-[11px] leading-relaxed text-mut">{t(x.description)}</p>
 </div>
 ))}
 <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-[11px] leading-relaxed text-mut">
 <b className="text-accent">{t("strategies.lecture")} :</b>
 {t("strategies.lecture1Pre")}
 <b className="text-fg">{fmt(s.scenarios[0].enfants_hors_ecole_2030)}</b>
 {t("strategies.lecture1Post")}
 {t("strategies.lecture2Pre")}
 <b className="text-fg">{fmt(s.scenarios[2].enfants_hors_ecole_2030)}</b>
 {t("strategies.lecture2Post", { red: fmt(s.scenarios[2].reduction_enfants_vs_2022) })}
 </div>
 </div>
 </div>
 </Card>

 <Card className="mt-6">
 <h2 className="font-display text-base font-semibold text-fg">{t("strategies.constructions")}</h2>
 <p className="mt-1 mb-3 text-[11px] text-mut">
 {t("strategies.constructionsText")}
 </p>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-line text-[10px] uppercase tracking-wider text-mut">
 <th className="py-2 pr-3 font-semibold">{t("strategies.thWilaya")}</th>
 <th className="py-2 pr-3 text-right font-semibold">{t("strategies.thTaux")}</th>
 <th className="py-2 pr-3 text-right font-semibold">{t("strategies.thHorsEcole")}</th>
 <th className="py-2 pr-3 text-right font-semibold">{t("strategies.thMahadra")}</th>
 <th className="py-2 pr-3 text-right font-semibold">{t("strategies.thEcoles")}</th>
 <th className="py-2 pr-3 text-right font-semibold">{t("strategies.thEcolesCreer")}</th>
 <th className="py-2 text-right font-semibold">{t("strategies.cout")}</th>
 </tr>
 </thead>
 <tbody>
 {s.par_wilaya
 .slice()
 .sort((a, b) => b.ecoles_a_creer - a.ecoles_a_creer)
 .map((w) => (
 <tr key={w.wilaya} className="border-b border-line/60">
 <td className="py-2 pr-3 font-semibold text-fg">{w.wilaya}</td>
 <td className="num py-2 pr-3 text-right">{w.taux_2022.toFixed(1)} %</td>
 <td className="num py-2 pr-3 text-right">{fmt(w.enfants_hors_ecole)}</td>
 <td className="num py-2 pr-3 text-right">{fmt(w.enfants_mahadra)}</td>
 <td className="num py-2 pr-3 text-right">{w.ecoles_pour_1000_enfants.toFixed(2)}</td>
 <td className="num py-2 pr-3 text-right font-bold text-warn">{w.ecoles_a_creer}</td>
 <td className="num py-2 text-right">{fmt(Math.round(w.cout_mro / 1e6))}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 </div>
 );
}
