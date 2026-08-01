import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useProjection } from "../lib/api";
import { INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, LEGEND, LegendDot, NO_ANIM, Note, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { ProjectionData } from "../lib/types";

export default function Projection() {
  const { t } = useI18n();
  const { data, loading, error } = useProjection();
  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Loading label={t("projection.loading")} />;

  const s = data.scenarios;
  const prudente = s.trajectoires.find((x) => x.id === "prudente")!;

  return (
    <div>
      <PageHeader eyebrow={t("projection.eyebrow")} title={t("projection.title")} subtitle={t("projection.subtitle")} />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi icon="users" label={t("projection.kpi.population")}
               value={`${s.croissance_population_pct > 0 ? "+" : ""}${s.croissance_population_pct.toLocaleString("fr-FR")} %`}
               sub={t("projection.kpi.population_sub", {
                 a: s.population_6_14_2022.toLocaleString("fr-FR"),
                 b: s.population_6_14_2030.toLocaleString("fr-FR"),
               })} />
          <Kpi icon="child" label={t("projection.kpi.prudente")}
               value={prudente.enfants_2030.toLocaleString("fr-FR")}
               sub={t("projection.kpi.prudente_sub", {
                 v: `${prudente.variation_vs_2022 > 0 ? "+" : ""}${prudente.variation_vs_2022.toLocaleString("fr-FR")}`,
               })} />
          <Kpi icon="trend" label={t("projection.kpi.effet")}
               value={`+${prudente.effet_demographique.toLocaleString("fr-FR")}`}
               sub={t("projection.kpi.effet_sub")} />
          <Kpi icon="target" label={t("projection.kpi.ecoles")}
               value={`+${data.surcout_total_ecoles}`}
               sub={t("projection.kpi.ecoles_sub")} />
        </div>

        <FanChart data={data} />
        <Trajectoires data={data} />
        <Besoins data={data} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- fan chart */
function FanChart({ data }: { data: ProjectionData }) {
  const { t } = useI18n();
  const fan = data.scenarios.fan_chart;

  // Axe volontairement tronqué : l'amplitude utile (≈ 40 000 enfants) est petite
  // devant le niveau (≈ 380 000), et un axe partant de zéro écrase la bande
  // d'incertitude jusqu'à l'invisibilité. La troncature est signalée sous le graphique.
  const bas = Math.min(...fan.map((p) => p.p10));
  const haut = Math.max(...fan.map((p) => p.p90));
  const marge = (haut - bas) * 0.25 || 1000;
  const min = Math.floor((bas - marge) / 5000) * 5000;
  const max = Math.ceil((haut + marge) / 5000) * 5000;

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", ...TOOLTIP },
    legend: { ...LEGEND, data: [t("projection.fan.median"), t("projection.fan.bande")] },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: { type: "category", data: fan.map((p) => p.annee), ...AXIS, boundaryGap: false },
    yAxis: { type: "value", min, max, ...AXIS },
    series: [
      // bande p10–p90 : socle invisible ancré au bas de l'axe, puis épaisseur colorée
      {
        name: t("projection.fan.bande"),
        type: "line",
        stack: "bande",
        silent: true,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        itemStyle: { color: "rgba(10,132,104,0.22)" },
        // valeur absolue : l'empilement part de zéro en données, pas du minimum
        // de l'axe — la portion sous `min` est simplement rognée, et son aire est
        // de toute façon transparente.
        data: fan.map((p) => p.p10),
      },
      {
        name: t("projection.fan.bande"),
        type: "line",
        stack: "bande",
        silent: true,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: "rgba(10,132,104,0.22)" },
        itemStyle: { color: "rgba(10,132,104,0.22)" },
        data: fan.map((p) => p.p90 - p.p10),
      },
      {
        name: t("projection.fan.median"),
        type: "line",
        symbolSize: 7,
        lineStyle: { width: 2.5, color: SERIES[1] },
        itemStyle: { color: SERIES[1], borderColor: "#fcfcfb", borderWidth: 2 },
        data: fan.map((p) => p.median),
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("projection.fan.title")} subtitle={t("projection.fan.subtitle")} />
      <ReactECharts option={option} style={{ height: 300 }} />
      <Note>
        <b className="text-fg">{t("projection.fan.axe_tronque")}</b>{" "}
        {t("projection.fan.note", {
          p1: data.scenarios.pente_tendancielle.toLocaleString("fr-FR"),
          p2: data.scenarios.pente_prudente.toLocaleString("fr-FR"),
        })}
      </Note>
    </Card>
  );
}

/* ---------------------------------------------------------- trajectoires */
function Trajectoires({ data }: { data: ProjectionData }) {
  const { t } = useI18n();
  const traj = data.scenarios.trajectoires;
  const base = data.scenarios.enfants_hors_ecole_2022;

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...TOOLTIP },
    legend: { ...LEGEND, data: [t("projection.traj.gelee"), t("projection.traj.reelle")] },
    grid: { left: 8, right: 16, top: 12, bottom: 60, containLabel: true },
    xAxis: {
      type: "category",
      data: traj.map((x) => t(x.label)),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 10, interval: 0, width: 150, overflow: "break" },
    },
    yAxis: { type: "value", ...AXIS },
    series: [
      {
        name: t("projection.traj.gelee"),
        type: "bar",
        barGap: "10%",
        data: traj.map((x) => x.enfants_si_population_gelee),
        itemStyle: { color: "rgba(102,115,125,0.40)", borderRadius: [4, 4, 0, 0] },
      },
      {
        name: t("projection.traj.reelle"),
        type: "bar",
        data: traj.map((x) => ({
          value: x.enfants_2030,
          itemStyle: {
            color: x.enfants_2030 > base ? SERIES[0] : SERIES[1],
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: { show: true, position: "top", color: INK, fontSize: 10, fontWeight: 600 },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: SERIES[2], type: "dashed", width: 1.5 },
          label: { formatter: t("projection.traj.base"), color: MUT, fontSize: 10 },
          data: [{ yAxis: base }],
        },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("projection.traj.title")} subtitle={t("projection.traj.subtitle")} />
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-mut">
        <LegendDot color="rgba(102,115,125,0.40)" label={t("projection.traj.gelee")} />
        <LegendDot color={SERIES[0]} label={t("projection.traj.hausse")} />
        <LegendDot color={SERIES[1]} label={t("projection.traj.baisse")} />
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
      <Note>{data.message_cle}</Note>
    </Card>
  );
}

/* ----------------------------------------------------------------- besoins */
function Besoins({ data }: { data: ProjectionData }) {
  const { t } = useI18n();
  const lignes = data.besoins.filter((b) => b.ecoles_a_creer_2030 > 0);

  return (
    <Card>
      <SectionTitle title={t("projection.besoins.title")} subtitle={t("projection.besoins.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
                <th className="py-2 pr-3 font-semibold">{t("Wilaya")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("projection.besoins.croissance")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("projection.besoins.base2022")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("projection.besoins.base2030")}</th>
                <th className="py-2 text-right font-semibold">{t("projection.besoins.surcout")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((b) => (
                <tr key={b.wilaya} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-semibold text-fg">{b.wilaya}</td>
                  <td className="num py-2 pr-3 text-right text-mut">
                    {b.croissance_pct > 0 ? "+" : ""}{b.croissance_pct.toLocaleString("fr-FR")} %
                  </td>
                  <td className="num py-2 pr-3 text-right text-mut">{b.ecoles_a_creer_2022}</td>
                  <td className="num py-2 pr-3 text-right font-bold text-fg">{b.ecoles_a_creer_2030}</td>
                  <td className="num py-2 text-right font-semibold" style={{ color: b.surcout_demographique > 0 ? SERIES[0] : MUT }}>
                    {b.surcout_demographique > 0 ? "+" : ""}{b.surcout_demographique}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Stat label={t("projection.besoins.total")} value={`+${data.surcout_total_ecoles}`} color={SERIES[0]} />
            <Stat label={t("projection.besoins.deja_nee")}
                  value={`${data.par_wilaya[0]?.part_deja_nee_pct.toLocaleString("fr-FR")} %`} color={SERIES[1]} />
          </div>
          <div className="eyebrow mb-2">{t("projection.besoins.hypotheses")}</div>
          <div className="space-y-1.5 text-[11px]">
            {Object.entries(data.hypotheses).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="flex-1 truncate text-mut">{t(`projection.hyp.${k}`)}</span>
                <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num text-fg">
                  {v.toLocaleString("fr-FR")}
                </b>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mut">{t("projection.besoins.note")}</p>
        </div>
      </div>
    </Card>
  );
}
