import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useAcces, useSpatial } from "../lib/api";
import { AXIS_LINE, INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, LegendDot, Meter, NO_ANIM, Note, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { AccesData, SpatialData } from "../lib/types";

export default function Acces() {
  const { t } = useI18n();
  const acc = useAcces();
  const spa = useSpatial();

  const error = acc.error || spa.error;
  if (error) return <ErrorBox message={error} />;
  if (acc.loading || spa.loading) return <Loading label={t("acces.loading")} />;

  const a = acc.data!;
  const s = spa.data!;
  const moran = s.variables["ipe"].moran;

  return (
    <div>
      <PageHeader eyebrow={t("acces.eyebrow")} title={t("acces.title")} subtitle={t("acces.subtitle")} />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi icon="map" label={t("acces.kpi.moughataas")} value={`${a.n_moughataas}`}
               sub={t("acces.kpi.moughataas_sub")} />
          <Kpi icon="target" label={t("acces.kpi.moran")} value={moran.I.toLocaleString("fr-FR")}
               sub={t("acces.kpi.moran_sub", { p: moran.pvalue_permutation.toLocaleString("fr-FR") })} />
          <Kpi icon="door" label={t("acces.kpi.sans_ecole")} value={`${a.moughataas_sans_ecole.length}`}
               sub={t("acces.kpi.sans_ecole_sub")} />
          <Kpi icon="grid" label={t("acces.kpi.etablissements")} value={a.n_etablissements.toLocaleString("fr-FR")}
               sub={t("acces.kpi.etablissements_sub", { d: a.distance_ppv_mediane_km.toLocaleString("fr-FR") })} />
        </div>

        <Autocorrelation data={s} />
        <Couverture data={a} />
      </div>
    </div>
  );
}

/* ------------------------------------------------- autocorrélation spatiale */
function Autocorrelation({ data }: { data: SpatialData }) {
  const { t } = useI18n();
  const lisa = data.variables["ipe"].lisa;

  const couleurQuadrant: Record<string, string> = {
    "haut-haut": SERIES[0],
    "bas-bas": SERIES[1],
    "haut-bas": SERIES[2],
    "bas-haut": "rgba(102,115,125,0.55)",
  };

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: {
      trigger: "item",
      ...TOOLTIP,
      formatter: (p: any) => {
        const d = lisa[p.dataIndex];
        return `<b>${d.wilaya}</b><br/>${t(`acces.quadrant.${d.quadrant}`)}<br/>z = ${d.z}<br/>${t(
          "acces.lisa.voisinage"
        )} = ${d.lag_voisinage}<br/>p = ${d.pvalue}`;
      },
    },
    grid: { left: 8, right: 24, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: "value", ...AXIS,
      name: t("acces.lisa.z"), nameLocation: "middle", nameGap: 26, nameTextStyle: { color: MUT, fontSize: 10 },
    },
    yAxis: {
      type: "value", ...AXIS,
      name: t("acces.lisa.voisinage"), nameLocation: "middle", nameGap: 34, nameTextStyle: { color: MUT, fontSize: 10 },
    },
    series: [
      {
        type: "line", silent: true, showSymbol: false,
        lineStyle: { width: 1, type: "dashed", color: AXIS_LINE },
        data: [[-2.2, 0], [2.2, 0]],
      },
      {
        type: "line", silent: true, showSymbol: false,
        lineStyle: { width: 1, type: "dashed", color: AXIS_LINE },
        data: [[0, -2.2], [0, 2.2]],
      },
      {
        type: "scatter",
        symbolSize: (_: unknown, p: any) => (lisa[p.dataIndex].significatif ? 18 : 12),
        data: lisa.map((d) => ({
          value: [d.z, d.lag_voisinage],
          itemStyle: {
            color: couleurQuadrant[d.quadrant],
            borderColor: "#fcfcfb",
            borderWidth: 2,
            opacity: d.significatif ? 1 : 0.6,
          },
        })),
        label: {
          show: true, position: "right", color: MUT, fontSize: 9,
          formatter: (p: any) => lisa[p.dataIndex].wilaya,
        },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("acces.moran.title")} subtitle={t("acces.moran.subtitle")} />
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-mut">
        <LegendDot color={SERIES[0]} label={t("acces.quadrant.haut-haut")} />
        <LegendDot color={SERIES[1]} label={t("acces.quadrant.bas-bas")} />
        <LegendDot color={SERIES[2]} label={t("acces.quadrant.haut-bas")} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <ReactECharts option={option} style={{ height: 330 }} />
        <div>
          <div className="mb-3 grid grid-cols-3 gap-3">
            {Object.entries(data.variables).map(([cle, v]) => (
              <Stat
                key={cle}
                label={t(v.label)}
                value={`I = ${v.moran.I.toLocaleString("fr-FR")}`}
                color={v.moran.significatif ? SERIES[1] : MUT}
              />
            ))}
          </div>
          <div className="eyebrow mb-2">{t("acces.moran.pvalues")}</div>
          <div className="space-y-1.5">
            {Object.entries(data.variables).map(([cle, v]) => (
              <div key={cle} className="flex items-center gap-2 text-[11px]">
                <span className="w-44 shrink-0 truncate text-fg">{t(v.label)}</span>
                <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="num text-mut">
                  p = {v.moran.pvalue_permutation}
                </span>
                <span
                  className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: v.moran.significatif ? "rgba(10,132,104,0.16)" : "rgba(102,115,125,0.12)",
                    color: v.moran.significatif ? SERIES[1] : MUT,
                  }}
                >
                  {t(v.moran.significatif ? "acces.significatif" : "acces.non_significatif")}
                </span>
              </div>
            ))}
          </div>
          <Note>{data.conclusion}</Note>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------ couverture moughataa */
function Couverture({ data }: { data: AccesData }) {
  const { t } = useI18n();
  const pires = data.moughataas.slice(0, 14);

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: {
      trigger: "item",
      ...TOOLTIP,
      formatter: (p: any) => {
        const d = data.par_wilaya[p.dataIndex];
        return `<b>${d.wilaya}</b><br/>${d.n_moughataas} ${t("acces.moughataas")}<br/>${t(
          "acces.etablissements"
        )} : ${d.n_etablissements}<br/>${t("acces.au_dela_10")} : ${d.part_au_dela_10km_pct} %`;
      },
    },
    grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", max: 100, ...AXIS, axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" } },
    yAxis: {
      type: "category", inverse: true,
      data: data.par_wilaya.map((d) => d.wilaya),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 11, fontWeight: 600, color: "#55636d" },
    },
    series: [
      {
        type: "bar",
        barWidth: 14,
        data: data.par_wilaya.map((d) => ({
          value: d.part_au_dela_10km_pct,
          itemStyle: {
            color: d.part_au_dela_10km_pct >= 90 ? SERIES[0] : d.part_au_dela_10km_pct >= 60 ? SERIES[2] : SERIES[1],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: { show: true, position: "right", color: INK, fontSize: 10, fontWeight: 600, formatter: "{c} %" },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("acces.couverture.title")} subtitle={t("acces.couverture.subtitle")} />
      <div
        className="mb-4 rounded-xl border-l-[3px] px-4 py-3"
        style={{ borderColor: SERIES[0], background: "rgba(192,61,58,0.06)" }}
      >
        <b className="text-xs text-fg">{t("acces.limite.title")}</b>
        <p className="mt-1 text-[11px] leading-relaxed text-mut">{data.limite}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="eyebrow mb-1">{t("acces.couverture.par_wilaya")}</div>
          <ReactECharts option={option} style={{ height: 380 }} />
        </div>
        <div>
          <div className="eyebrow mb-2">{t("acces.couverture.pires")}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
                  <th className="py-2 pr-3 font-semibold">{t("acces.moughataa")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("Wilaya")}</th>
                  <th className="py-2 pr-3 text-right font-semibold">{t("acces.ecoles")}</th>
                  <th className="py-2 text-right font-semibold">{t("acces.distance_mediane")}</th>
                </tr>
              </thead>
              <tbody>
                {pires.map((m) => (
                  <tr key={m.adm2_pcode} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5 pr-3 font-semibold text-fg">{m.moughataa}</td>
                    <td className="py-1.5 pr-3 text-mut">{m.wilaya}</td>
                    <td className="num py-1.5 pr-3 text-right" style={{ color: m.n_etablissements === 0 ? SERIES[0] : MUT }}>
                      {m.n_etablissements}
                    </td>
                    <td className="num py-1.5 text-right font-semibold text-fg">
                      {m.distance_mediane_km.toLocaleString("fr-FR")} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px]">
            <span className="w-40 shrink-0 text-fg">{t("acces.dispersion")}</span>
            <Meter value={data.distance_ppv_mediane_km} max={5} color={SERIES[2]} suffix="km" />
          </div>
        </div>
      </div>
    </Card>
  );
}
