import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { parseTrendSeries, pct, useDecomposition, useTrends } from "../lib/api";
import { ACCENT, ACCENT2, CORAL, TERRACOTTA, lineChart, donut } from "../lib/charts";
import { Badge, Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";

function seriesCode(series: ReturnType<typeof parseTrendSeries>, code: string) {
 return series.find((s) => s.code === code);
}

export default function Tendances() {
 const { t } = useI18n();
 const trends = useTrends();
 const dec = useDecomposition();

 if (trends.error || dec.error) return <ErrorBox message={trends.error ?? dec.error ?? t("tendances.error")} />;
 if (trends.loading || dec.loading) return <Loading label={t("tendances.loading")} />;

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
 { name: t("tendances.enMahadra"), value: n.mahadra_pct_he, color: ACCENT },
 { name: t("tendances.aucuneInstruction"), value: n.aucune_pct_he, color: CORAL },
 ],
 t("tendances.sur100Enfants"),
 t("tendances.horsEcoleFormel")
 );

 return (
 <div>
 <PageHeader
 eyebrow={t("tendances.eyebrow")}
 title={t("tendances.title")}
 subtitle={t("tendances.subtitle")}
 >
 <Badge color="bg-accent/15 text-accent">{t("tendances.wdiBadge")}</Badge>
 </PageHeader>

 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Kpi icon="trend" label={t("tendances.horsEcole2024")} value={horsEcole ? `${horsEcole.points[horsEcole.points.length - 1].value.toFixed(1)} %` : ""} sub={evolution ? t("tendances.vsEn", { v: evolution.first.value.toFixed(1), annee: evolution.first.year }) : undefined} accent="text-warn" />
 <Kpi icon="book" label={t("tendances.scolarisationNette")} value={nette ? `${nette.points[nette.points.length - 1].value.toFixed(1)} %` : ""} sub={nette ? t("tendances.dernierPoint", { annee: nette.points[nette.points.length - 1].year }) : undefined} accent="text-accent2" />
 <Kpi icon="child" label={t("tendances.dependanceJeunes")} value={dependance ? `${dependance.points[dependance.points.length - 1].value.toFixed(1)} %` : ""} sub={t("tendances.dependanceSub")} accent="text-accent" />
 <Kpi icon="users" label={t("tendances.horsEcoleN")} value={effectifs ? `${(effectifs.points[effectifs.points.length - 1].value / 1000).toFixed(0)} k` : ""} sub={t("tendances.enfantsPrimaire")} accent="text-danger" />
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("tendances.carte1Title")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("tendances.carte1Text")}
 </p>
 <ReactECharts
 option={lineChart([
 { name: t("tendances.seriesHorsEcole"), color: ACCENT, data: horsEcole?.points ?? [] },
 { name: t("tendances.seriesScolarisationNette"), color: ACCENT2, data: nette?.points ?? [] },
 ])}
 style={{ height: 340 }}
 />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("tendances.jeunesseTitle")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("tendances.jeunesseText")}
 </p>
 <ReactECharts
 option={lineChart([
 { name: t("tendances.seriesDependance"), color: TERRACOTTA, data: dependance?.points ?? [] },
 ...(brut ? [{ name: t("tendances.seriesScolarisationBrute"), color: ACCENT2, data: brut.points }] : []),
 ])}
 style={{ height: 340 }}
 />
 </Card>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("tendances.quiSontTitle")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("tendances.decompText", { n: dec.data!.n_children_6_14.toLocaleString("fr-FR") })}
 </p>
 <ReactECharts option={decompositionOption} style={{ height: 300 }} />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">{t("tendances.mahadraTitle")}</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 {t("tendances.mahadraText")}
 </p>
 <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
 <ReactECharts option={structureDonut} style={{ height: 300 }} />
 <div className="space-y-3">
 <Insight
 title={t("tendances.insightAgeTitle")}
 text={t("tendances.insightAgeText", { a: n.age_6_9_hors_ecole, b: n.age_10_14_hors_ecole })}
 />
 <Insight
 title={t("tendances.insightRuralTitle")}
 text={t("tendances.insightRuralText", { r: n.rural_hors_ecole, u: n.urbain_hors_ecole })}
 />
 <Insight
 title={t("tendances.insightGenreTitle")}
 text={t("tendances.insightGenreText", { f: n.filles_hors_ecole, g: n.garcons_hors_ecole })}
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
