import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useIndicateurs } from "../lib/api";
import { Card, ErrorBox, Loading, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";

export default function Indicateurs() {
 const { t } = useI18n();
 const data = useIndicateurs();

 if (data.error) return <ErrorBox message={data.error} />;
 if (data.loading) return <Loading label={t("indicateurs.loading")} />;

 const d = data.data!;

 const heatmap: EChartsOption = {
 tooltip: {
 position: "top",
 backgroundColor: "#211b11",
 borderColor: "rgba(226,199,150,0.22)",
 textStyle: { color: "#f4edde" },
 formatter: (p: any) =>
 `<b>${t(p.data[1])}</b> × <b>${t(p.data[0])}</b><br/>r = ${p.data[2].toFixed(3)}`,
 },
 grid: { left: 120, right: 16, top: 10, bottom: 80 },
 xAxis: {
 type: "category",
 data: d.indicators.map((i) => t(i.label)),
 axisLabel: { color: "#a19077", fontSize: 9, rotate: 45 },
 axisLine: { show: false },
 splitArea: { show: false },
 splitLine: { show: false },
 },
 yAxis: {
 type: "category",
 data: d.indicators.map((i) => t(i.label)),
 axisLabel: { color: "#d8cbb0", fontSize: 9, fontWeight: 600 },
 axisLine: { show: false },
 splitArea: { show: false },
 splitLine: { show: false },
 },
 visualMap: {
 min: -1,
 max: 1,
 calculable: true,
 orient: "horizontal",
 left: "center",
 bottom: 0,
 inRange: { color: ["#2f9b82", "#15110a", "#e88f3a"] },
 textStyle: { color: "#a19077", fontSize: 10 },
 },
 series: [
 {
 type: "heatmap",
 data: d.matrix
 .filter((cell) => d.indicators.findIndex((i) => i.label === cell.y) < d.indicators.findIndex((i) => i.label === cell.x))
 .map((cell) => [t(cell.x), t(cell.y), cell.value]),
 label: {
 show: true,
 color: "#f4edde",
 fontSize: 8,
 formatter: (p: any) => p.data[2].toFixed(1).replace(".", ","),
 },
 itemStyle: { borderColor: "#15110a", borderWidth: 2, borderRadius: 3 },
 emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(238,183,79,0.5)" } },
 },
 ],
 };

 const top = d.top_correlations
 .filter((t) => Math.abs(t.r) < 0.999)
 .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
 .slice(0, 12);

 return (
 <div>
 <PageHeader
 eyebrow={t("indicateurs.eyebrow")}
 title={t("indicateurs.title")}
 subtitle={t("indicateurs.subtitle")}
 />

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("indicateurs.heatmap_title")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("indicateurs.heatmap_sub")}
 </p>
 <ReactECharts option={heatmap} style={{ height: 620 }} />
 </Card>

 <div className="mt-6 grid gap-6 lg:grid-cols-5">
 <Card className="lg:col-span-3">
 <h2 className="mb-3 font-display text-base font-semibold text-fg">{t("indicateurs.top_title")}</h2>
 <div className="space-y-1.5">
 {top.map((c, i) => {
 const positive = c.r > 0;
 return (
 <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
 <span className="font-semibold text-fg">{t(c.a)}</span>
 <span className="text-mut">↔</span>
 <span className="font-semibold text-fg">{t(c.b)}</span>
 <span className={`ml-auto num font-bold ${positive ? "text-warn" : "text-accent2"}`}>
 {c.r > 0 ? "+" : ""}
 {c.r.toFixed(2)}
 </span>
 </div>
 );
 })}
 </div>
 </Card>

 <div className="space-y-4 lg:col-span-2">
 <Insight
 title={t("indicateurs.insight1.title")}
 text={t("indicateurs.insight1.text")}
 />
 <Insight
 title={t("indicateurs.insight2.title")}
 text={t("indicateurs.insight2.text")}
 />
 <Insight
 title={t("indicateurs.insight3.title")}
 text={t("indicateurs.insight3.text")}
 />
 <Insight
 title={t("indicateurs.insight4.title")}
 text={t("indicateurs.insight4.text")}
 />
 </div>
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
