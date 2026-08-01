import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { parseTrendSeries, pct, useDecomposition, useTrends } from "../lib/api";
import { ACCENT, ACCENT2, CORAL, TERRACOTTA, lineChart, donut } from "../lib/charts";
import { Badge, Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";

function seriesCode(series: ReturnType<typeof parseTrendSeries>, code: string) {
 return series.find((s) => s.code === code);
}

export default function Tendances() {
 const trends = useTrends();
 const dec = useDecomposition();

 if (trends.error || dec.error) return <ErrorBox message={trends.error ?? dec.error ?? "erreur"} />;
 if (trends.loading || dec.loading) return <Loading label="Compilation des séries temporelles…" />;

 const series = parseTrendSeries(trends.data!.series);
 const horsEcole = seriesCode(series, "SE.PRM.UNER.ZS");
 const nette = seriesCode(series, "SE.PRM.NENR");
 const brut = seriesCode(series, "SE.PRM.ENRR");
 const effectifs = seriesCode(series, "SE.PRM.UNER");
 const dependance = seriesCode(series, "SP.POP.DPND.YG");
 const n = dec.data!.national;

 const evolution = horsEcole
 ? {
 first: horsEcole.points[0],
 last: horsEcole.points[horsEcole.points.length - 1],
 delta: (horsEcole.points[horsEcole.points.length - 1].value - horsEcole.points[0].value).toFixed(1),
 }
 : null;

 const decompositionOption: EChartsOption = {
 tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#211b11", borderColor: "rgba(226,199,150,0.22)", textStyle: { color: "#f4edde" } },
 grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
 xAxis: {
 type: "value",
 axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } },
 axisLabel: { color: "#a19077", fontSize: 11, formatter: "{value} %" },
 splitLine: { lineStyle: { color: "rgba(226,199,150,0.09)" } },
 },
 yAxis: { type: "category", inverse: true, axisLine: { lineStyle: { color: "rgba(226,199,150,0.22)" } }, axisLabel: { color: "#d8cbb0", fontSize: 12, fontWeight: 600 } },
 series: [
 {
 type: "bar",
 data: [
 { value: n.age_6_9_hors_ecole, itemStyle: { color: ACCENT, borderRadius: [0, 6, 6, 0] }, label: { show: true, position: "right" } },
 { value: n.age_10_14_hors_ecole, itemStyle: { color: "rgba(238,183,79,0.32)", borderRadius: [0, 6, 6, 0] } },
 { value: n.rural_hors_ecole, itemStyle: { color: ACCENT2, borderRadius: [0, 6, 6, 0] }, label: { show: true, position: "right" } },
 { value: n.urbain_hors_ecole, itemStyle: { color: "rgba(78,195,163,0.32)", borderRadius: [0, 6, 6, 0] } },
 { value: n.garcons_hors_ecole, itemStyle: { color: CORAL, borderRadius: [0, 6, 6, 0] } },
 { value: n.filles_hors_ecole, itemStyle: { color: "rgba(239,111,95,0.45)", borderRadius: [0, 6, 6, 0] } },
 ],
 barWidth: 18,
 label: { show: true, position: "right", color: "#f4edde", fontSize: 11, fontWeight: 600, formatter: "{c} %" },
 itemStyle: { borderRadius: [0, 6, 6, 0] },
 },
 ],
 };

 const structureDonut = donut(
 [
 { name: "En mahadra (trad. + coranique)", value: n.mahadra_pct_he, color: ACCENT },
 { name: "Aucune instruction", value: n.aucune_pct_he, color: CORAL },
 ],
 "Sur 100 enfants",
 "hors école formel"
 );

 return (
 <div>
 <PageHeader
 eyebrow="Séries temporelles · Banque mondiale 2000-2024"
 title="Tendances : un pays qui scolarise, un retard qui persiste"
 subtitle="Le recul du hors-école primaire est réel mais lent et l'enquête EPCV 2019 (33,1 % hors école formelle) rappelle l'ampleur du chemin restant. Les trajectoires orientent les scénarios à 2030."
 >
 <Badge color="bg-accent/15 text-accent">WDI · Banque mondiale</Badge>
 </PageHeader>

 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Kpi icon="trend" label="Hors école primaire 2024" value={horsEcole ? `${horsEcole.points[horsEcole.points.length - 1].value.toFixed(1)} %` : ""} sub={evolution ? `vs ${evolution.first.value.toFixed(1)} % en ${evolution.first.year}` : undefined} accent="text-warn" />
 <Kpi icon="book" label="Scolarisation nette" value={nette ? `${nette.points[nette.points.length - 1].value.toFixed(1)} %` : ""} sub={nette ? `dernier point : ${nette.points[nette.points.length - 1].year}` : undefined} accent="text-accent2" />
 <Kpi icon="child" label="Dépendance jeunes" value={dependance ? `${dependance.points[dependance.points.length - 1].value.toFixed(1)} %` : ""} sub="0-14 ans / 15-64 ans" accent="text-accent" />
 <Kpi icon="users" label="Hors école primaire (n)" value={effectifs ? `${(effectifs.points[effectifs.points.length - 1].value / 1000).toFixed(0)} k` : ""} sub="enfants de niveau primaire" accent="text-danger" />
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Enfants hors école primaire % d'élèves</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Taux d'enfants en âge primaire non scolarisés (SE.PRM.UNER.ZS) et taux net de scolarisation (SE.PRM.NENR).
 </p>
 <ReactECharts
 option={lineChart([
 { name: "Hors école primaire (%)", color: ACCENT, data: horsEcole?.points ?? [] },
 { name: "Scolarisation nette (%)", color: ACCENT2, data: nette?.points ?? [] },
 ])}
 style={{ height: 340 }}
 />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Le poids de la jeunesse ne faiblit pas</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Ratio de dépendance des jeunes (0-14 / 15-64, %). Une population dont la structure maintient la pression sur le système scolaire.
 </p>
 <ReactECharts
 option={lineChart([
 { name: "Dépendance jeunes (%)", color: TERRACOTTA, data: dependance?.points ?? [] },
 ...(brut ? [{ name: "Scolarisation brute (%)", color: ACCENT2, data: brut.points }] : []),
 ])}
 style={{ height: 340 }}
 />
 </Card>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Qui sont les enfants hors école ? (EPCV 2019)</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Taux de hors école formelle par groupe, sur les {dec.data!.n_children_6_14.toLocaleString("fr-FR")} enfants 6-14 ans de l'enquête.
 </p>
 <ReactECharts option={decompositionOption} style={{ height: 300 }} />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Où sont-ils ? Mahadra ou rien</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Répartition des hors école formelle : la moitié est en mahadra (traditionnel + coranique), l'autre moitié sans aucune instruction.
 </p>
 <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
 <ReactECharts option={structureDonut} style={{ height: 300 }} />
 <div className="space-y-3">
 <Insight
 title="L'âge est le premier facteur"
 text={`${n.age_6_9_hors_ecole} % des 6-9 ans sont hors école contre ${n.age_10_14_hors_ecole} % des 10-14 ans : l'entrée tardive, pas l'abandon massif.`}
 />
 <Insight
 title="La ruralité, une fois de plus"
 text={`${n.rural_hors_ecole} % en milieu rural contre ${n.urbain_hors_ecole} % en urbain la géographie de l'offre scolaire.`}
 />
 <Insight
 title="Le genre n'écarte pas"
 text={`${n.filles_hors_ecole} % des filles contre ${n.garcons_hors_ecole} % des garçons : quasi-parité, un acquis rare à conserver.`}
 />
 </div>
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
