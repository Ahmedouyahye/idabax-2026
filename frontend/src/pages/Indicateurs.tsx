import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useIndicateurs } from "../lib/api";
import { Card, ErrorBox, Loading, PageHeader } from "../components/ui";

export default function Indicateurs() {
 const data = useIndicateurs();

 if (data.error) return <ErrorBox message={data.error} />;
 if (data.loading) return <Loading label="Calcul des corrélations…" />;

 const d = data.data!;

 const heatmap: EChartsOption = {
 tooltip: {
 position: "top",
 backgroundColor: "#211b11",
 borderColor: "rgba(226,199,150,0.22)",
 textStyle: { color: "#f4edde" },
 formatter: (p: any) =>
 `<b>${p.data[1]}</b> × <b>${p.data[0]}</b><br/>r = ${p.data[2].toFixed(3)}`,
 },
 grid: { left: 120, right: 16, top: 10, bottom: 80 },
 xAxis: {
 type: "category",
 data: d.indicators.map((i) => i.label),
 axisLabel: { color: "#a19077", fontSize: 9, rotate: 45 },
 axisLine: { show: false },
 splitArea: { show: false },
 splitLine: { show: false },
 },
 yAxis: {
 type: "category",
 data: d.indicators.map((i) => i.label),
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
 .map((cell) => [cell.x, cell.y, cell.value]),
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
 eyebrow="Matrice de corrélation · Pearson"
 title="Ce qui fait l'exclusion, ce qui ne la fait pas"
 subtitle="La matrice de corrélation de 12 indicateurs (r de Pearson, couleur = force) révèle les déterminants structurels. Une heatmap symétrique, triée pour la lisibilité."
 />

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Heatmap de corrélation 12 indicateurs × 13 wilayas</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Vert = corrélation négative, orange = positive, noir = neutre. Ne lisez que le triangle inférieur (l'image est symétrique).
 </p>
 <ReactECharts option={heatmap} style={{ height: 620 }} />
 </Card>

 <div className="mt-6 grid gap-6 lg:grid-cols-5">
 <Card className="lg:col-span-3">
 <h2 className="mb-3 font-display text-base font-semibold text-fg">Les corrélations les plus fortes</h2>
 <div className="space-y-1.5">
 {top.map((t, i) => {
 const positive = t.r > 0;
 return (
 <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
 <span className="font-semibold text-fg">{t.a}</span>
 <span className="text-mut">↔</span>
 <span className="font-semibold text-fg">{t.b}</span>
 <span className={`ml-auto num font-bold ${positive ? "text-warn" : "text-accent2"}`}>
 {t.r > 0 ? "+" : ""}
 {t.r.toFixed(2)}
 </span>
 </div>
 );
 })}
 </div>
 </Card>

 <div className="space-y-4 lg:col-span-2">
 <Insight
 title="La ruralité est le socle"
 text="Le taux hors école est porté par la dépendance jeunes (0-14 / 15-64), elle-même adossée à la ruralité : la famille rurale, nombreuse et pauvre est la cible structurelle."
 />
 <Insight
 title="Population jeune et dépendance : jumeaux"
 text="La part de 0-14 ans et la dépendance jeunes sont corrélées à 1.00 : ce n'est qu'un seul et même déterminant démographique, à traiter comme un bloc."
 />
 <Insight
 title="Ce qui ne corrèle pas"
 text="Le genre n'apparaît nulle part : il ne discrimine pas le hors école. De même, le nombre d'écoles n'est pas le premier levier la distance et l'offre mahadra le sont."
 />
 <Insight
 title="Attention aux corrélations parfaites"
 text="Les r de 1.00 proviennent d'indicateurs construits l'un à partir de l'autre : nous les écartons des recommandations."
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
