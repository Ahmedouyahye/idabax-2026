import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { fmt, useConcentration, useMatrice, useScenarios } from "../lib/api";
import { ACCENT2, CORAL } from "../lib/charts";
import { Badge, Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";

export default function Strategies() {
 const matrice = useMatrice();
 const conc = useConcentration();
 const scen = useScenarios();

 if (matrice.error || conc.error || scen.error)
 return <ErrorBox message={matrice.error ?? conc.error ?? scen.error ?? "erreur"} />;
 if (matrice.loading || conc.loading || scen.loading)
 return <Loading label="Construction de la matrice et des scénarios…" />;

 const m = matrice.data!;
 const c = conc.data!;
 const s = scen.data!;

 const quadrantColor = (id: string) => m.quadrants.find((q) => q.id === id)?.color ?? "#a19077";

 const scatterOption: EChartsOption = {
 tooltip: {
 trigger: "item",
 backgroundColor: "#211b11",
 borderColor: "rgba(226,199,150,0.22)",
 textStyle: { color: "#f4edde" },
 formatter: (p: any) =>
 `<b>${p.data.name}</b><br/>Enfants hors école : ${fmt(p.data.value[2])}<br/>Volume : ${p.data.value[0].toFixed(1)} (log)<br/>Taux : ${p.data.value[1].toFixed(1)} %`,
 },
 grid: { left: 10, right: 16, top: 16, bottom: 10, containLabel: true },
 xAxis: {
 type: "value",
 name: "Volume (log enfants hors école)",
 nameTextStyle: { color: "#a19077", fontSize: 10 },
 axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } },
 axisLabel: { color: "#a19077", fontSize: 11 },
 splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } },
 },
 yAxis: {
 type: "value",
 name: "Taux hors école formelle (%)",
 nameTextStyle: { color: "#a19077", fontSize: 10 },
 axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } },
 axisLabel: { color: "#a19077", fontSize: 11 },
 splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } },
 },
 series: [
 {
 type: "scatter",
 symbolSize: (val: number[]) => Math.max(10, Math.min(34, val[2] / 6000)),
 data: m.scatter.map((p) => ({
 name: p.wilaya,
 value: [p.volume_log, p.scol_Hors_ecole_formelle, p.enfants_hors_ecole],
 itemStyle: { color: quadrantColor(p.quadrant_id), opacity: 0.92, borderColor: "#15110a", borderWidth: 1.5 },
 label: { show: true, formatter: p.wilaya, position: "top", color: "#d8cbb0", fontSize: 10, fontWeight: 600 },
 })),
 markLine: {
 symbol: "none",
 silent: true,
 label: { show: false },
 lineStyle: { color: "rgba(226,199,150,0.4)", type: "dashed" },
 data: [{ xAxis: m.median_volume_log }, { yAxis: m.median_intensite }],
 },
 },
 ],
 };

 const paretoOption: EChartsOption = {
 tooltip: { trigger: "axis", backgroundColor: "#211b11", borderColor: "rgba(226,199,150,0.22)", textStyle: { color: "#f4edde" } },
 grid: { left: 10, right: 40, top: 12, bottom: 10, containLabel: true },
 legend: { textStyle: { color: "#a19077", fontSize: 11 }, top: 0 },
 xAxis: { type: "category", data: c.top5.map((t) => t.wilaya), axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } }, axisLabel: { color: "#d8cbb0", fontSize: 10, fontWeight: 600 } },
 yAxis: [
 {
 type: "value",
 axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } },
 axisLabel: { color: "#a19077", fontSize: 11 },
 splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } },
 },
 {
 type: "value",
 max: 100,
 axisLabel: { color: "#a19077", fontSize: 11, formatter: "{value} %" },
 splitLine: { show: false },
 },
 ],
 series: [
 {
 name: "Enfants hors école",
 type: "bar",
 barWidth: 34,
 data: c.top5.map((t) => ({ value: t.enfants_hors_ecole, itemStyle: { color: ACCENT2, borderRadius: [6, 6, 0, 0] } })),
 },
 {
 name: "Part cumulée (%)",
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
 backgroundColor: "#211b11",
 borderColor: "rgba(226,199,150,0.22)",
 textStyle: { color: "#f4edde" },
 formatter: (p: any) => `${p[0].data[0].toFixed(1)} % des wilayas → ${p[0].data[1].toFixed(1)} % des enfants`,
 },
 grid: { left: 10, right: 16, top: 12, bottom: 10, containLabel: true },
 xAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#a19077", fontSize: 11, formatter: "{value} %" }, axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } }, splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } } },
 yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#a19077", fontSize: 11, formatter: "{value} %" }, axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } }, splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } } },
 series: [
 {
 type: "line",
 name: "Concentration",
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
 name: "Égalité parfaite",
 symbol: "none",
 lineStyle: { color: "rgba(226,199,150,0.35)", type: "dashed" },
 data: [
 [0, 0],
 [100, 100],
 ],
 },
 ],
 };

 const scenarioBars: EChartsOption = {
 tooltip: { trigger: "axis", backgroundColor: "#211b11", borderColor: "rgba(226,199,150,0.22)", textStyle: { color: "#f4edde" }, formatter: (p: any) => `${p[0].name}<br/>${fmt(p[0].value)} enfants hors école en 2030` },
 grid: { left: 10, right: 16, top: 12, bottom: 10, containLabel: true },
 xAxis: { type: "category", data: s.scenarios.map((x) => x.label), axisLabel: { color: "#d8cbb0", fontSize: 10, fontWeight: 600, interval: 0 }, axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } } },
 yAxis: { type: "value", axisLabel: { color: "#a19077", fontSize: 11 }, axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } }, splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } } },
 series: [
 {
 type: "bar",
 barWidth: 46,
 data: s.scenarios.map((x) => ({
 value: x.enfants_hors_ecole_2030,
 itemStyle: { color: x.color, borderRadius: [8, 8, 0, 0] },
 label: { show: true, position: "top", color: "#f4edde", fontSize: 11, fontWeight: 700, formatter: (p: any) => `${Math.round(p.value / 1000)} k` },
 })),
 },
 ],
 };

 return (
 <div>
 <PageHeader
 eyebrow="Diagnostic stratégique · 2030"
 title="Prioriser, concentrer, transformer"
 subtitle="Trois outils de décision : la matrice volume × intensité (où agir), la concentration (quel rendement d'échelle) et des scénarios chiffrés à 2030 (combien d'enfants, à quel coût)."
 >
 <Badge color="bg-accent/15 text-accent">4 scénarios · coût 25 M MRO / école</Badge>
 </PageHeader>

 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Kpi icon="target" label="Top 5 concentre" value={`${c.top5_share.toFixed(1)} %`} sub={`des ${fmt(c.total_enfants_hors_ecole)} enfants hors école`} accent="text-warn" />
 <Kpi icon="grid" label="Wilayas pour 50 %" value={`${c.n_wilayas_pour_50pct}`} sub={`sur 13 une cible économe`} accent="text-accent2" />
 <Kpi icon="trend" label="Indice de Gini" value={c.gini.toFixed(3)} sub="0 = égalité · 1 = concentration extrême" accent="text-danger" />
 <Kpi icon="child" label="Hors école en 2030" value={`${fmt(s.scenarios[0].enfants_hors_ecole_2030)}`} sub="trajectoire tendancielle" accent="text-accent" />
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-5">
 <Card className="lg:col-span-3">
 <h2 className="font-display text-base font-semibold text-fg">Matrice volume × intensité</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 En abscisse, le volume d'enfants hors école (logarithme) ; en ordonnée, le taux. Les médianes nationales découpent quatre territoires d'action.
 </p>
 <ReactECharts option={scatterOption} style={{ height: 440 }} />
 </Card>

 <div className="space-y-4 lg:col-span-2">
 {m.quadrants.map((q) => (
 <div key={q.id} className="glass rounded-2xl p-4" style={{ borderLeft: `3px solid ${q.color}` }}>
 <div className="flex items-center justify-between gap-2">
 <h3 className="font-display text-sm font-semibold" style={{ color: q.color }}>{q.label}</h3>
 <Badge color="bg-white/5 text-mut">{fmt(q.enfants_hors_ecole)} enfants</Badge>
 </div>
 <p className="mt-1.5 text-xs leading-relaxed text-mut">{q.description}</p>
 <div className="mt-2 flex flex-wrap gap-1.5">
 {q.wilayas.map((w) => (
 <span key={w} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-fg/80">{w}</span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Concentration : la loi de Pareto de l'exclusion</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Cinq wilayas concentrent {c.top5_share.toFixed(1)} % du problème {c.n_wilayas_pour_50pct} suffisent pour la moitié. La taille des points sur la matrice est proportionnelle aux effectifs.
 </p>
 <ReactECharts option={paretoOption} style={{ height: 300 }} />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Courbe de Lorenz & indice de Gini</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 La courbe s'écarte fortement de l'égalité (Gini = {c.gini.toFixed(2)}) : une poignée de wilayas porte la majorité de l'exclusion la cible géographique est étroite.
 </p>
 <ReactECharts option={lorenzOption} style={{ height: 300 }} />
 </Card>
 </div>

 <Card className="mt-6">
 <div className="flex items-center justify-between gap-3">
 <h2 className="font-display text-base font-semibold text-fg">Scénarios 2030 combien d'enfants, à quel coût</h2>
 <Badge color="bg-accent2/15 text-accent2">tendance −{Math.abs(s.trend_annual_pts).toFixed(2)} pt/an</Badge>
 </div>
 <div className="mt-4 grid gap-6 lg:grid-cols-2">
 <ReactECharts option={scenarioBars} style={{ height: 320 }} />
 <div className="space-y-3">
 {s.scenarios.map((x) => (
 <div key={x.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-fg">{x.label}</span>
 <span className="num text-xs font-semibold" style={{ color: x.color }}>
 {x.taux_2030.toFixed(1)} % · {fmt(x.enfants_hors_ecole_2030)} enfants
 </span>
 </div>
 <p className="mt-1 text-[11px] leading-relaxed text-mut">{x.description}</p>
 </div>
 ))}
 <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-[11px] leading-relaxed text-mut">
 <b className="text-accent">Lecture :</b> à tendance constante, il resterait ~<b className="text-fg">{fmt(s.scenarios[0].enfants_hors_ecole_2030)}</b> enfants hors école en 2030.
 Des passerelles massives mahadra → formel (50 %) les ramèneraient à ~<b className="text-fg">{fmt(s.scenarios[2].enfants_hors_ecole_2030)}</b> (−{fmt(s.scenarios[2].reduction_enfants_vs_2022)} vs 2022). 1 € ≈ 400 MRO.
 </div>
 </div>
 </div>
 </Card>

 <Card className="mt-6">
 <h2 className="font-display text-base font-semibold text-fg">Construire l'école de proximité besoins par wilaya</h2>
 <p className="mt-1 mb-3 text-[11px] text-mut">
 Capacité à 40 élèves / école, objectif 2 écoles pour 1000 enfants (référentiel international ~1 pour 500). Coût indicatif : 25 M MRO / école.
 </p>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-line text-[10px] uppercase tracking-wider text-mut">
 <th className="py-2 pr-3 font-semibold">Wilaya</th>
 <th className="py-2 pr-3 text-right font-semibold">Taux 2022</th>
 <th className="py-2 pr-3 text-right font-semibold">Hors école</th>
 <th className="py-2 pr-3 text-right font-semibold">Mahadra</th>
 <th className="py-2 pr-3 text-right font-semibold">Écoles / 1000</th>
 <th className="py-2 pr-3 text-right font-semibold">Écoles à créer</th>
 <th className="py-2 text-right font-semibold">Coût (M MRO)</th>
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
