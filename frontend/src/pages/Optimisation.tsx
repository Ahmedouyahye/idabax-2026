import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useDeviants, useOptimisation } from "../lib/api";
import { AXIS_LINE, INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, LegendDot, Meter, NO_ANIM, Note, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { DeviantsData, OptimData } from "../lib/types";

export default function Optimisation() {
  const { t } = useI18n();
  const dev = useDeviants();
  const opt = useOptimisation();

  const error = dev.error || opt.error;
  if (error) return <ErrorBox message={error} />;
  if (dev.loading || opt.loading) return <Loading label={t("optim.loading")} />;

  const d = dev.data!;
  const o = opt.data!;
  const a25 = o.allocations["budget_25pct"];

  return (
    <div>
      <PageHeader eyebrow={t("optim.eyebrow")} title={t("optim.title")} subtitle={t("optim.subtitle")} />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi icon="target" label={t("optim.kpi.besoin")} value={`${o.besoin_total_meuro.toLocaleString("fr-FR")} M€`}
               sub={t("optim.kpi.besoin_sub", { n: o.enfants_mobilisables_total.toLocaleString("fr-FR") })} />
          <Kpi icon="users" label={t("optim.kpi.a25")} value={a25.enfants_atteints.toLocaleString("fr-FR")}
               sub={t("optim.kpi.a25_sub", { b: a25.budget_meuro.toLocaleString("fr-FR") })} />
          <Kpi icon="grid" label={t("optim.kpi.dea")} value={`${o.dea.n_efficientes}/13`}
               sub={t("optim.kpi.dea_sub")} />
          <Kpi icon="compass" label={t("optim.kpi.deviants")} value={`${d.deviants_positifs.length}`}
               sub={t("optim.kpi.deviants_sub", { liste: d.deviants_positifs.join(", ") || "—" })} />
        </div>

        <Deviants data={d} />
        <Allocation data={o} />
        <Frontiere data={o} />
        <Dea data={o} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------ attendu vs observé */
function Deviants({ data }: { data: DeviantsData }) {
  const { t } = useI18n();
  const pts = data.wilayas;
  const lim = Math.ceil(Math.max(...pts.flatMap((p) => [p.observe_pct, p.attendu_pct])) / 10) * 10 + 5;

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: {
      trigger: "item",
      ...TOOLTIP,
      formatter: (p: any) => {
        const w = pts[p.dataIndex];
        return `<b>${w.wilaya}</b><br/>${t("optim.dev.observe")} : ${w.observe_pct} %<br/>${t(
          "optim.dev.attendu"
        )} : ${w.attendu_pct} %<br/>${t("optim.dev.residu")} : ${w.residu_pts > 0 ? "+" : ""}${w.residu_pts} pts`;
      },
    },
    grid: { left: 8, right: 24, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: "value", min: 0, max: lim, ...AXIS,
      name: t("optim.dev.attendu"), nameLocation: "middle", nameGap: 26, nameTextStyle: { color: MUT, fontSize: 10 },
      axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" },
    },
    yAxis: {
      type: "value", min: 0, max: lim, ...AXIS,
      axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" },
    },
    series: [
      {
        type: "line", silent: true, showSymbol: false,
        lineStyle: { width: 1, type: "dashed", color: AXIS_LINE },
        data: [[0, 0], [lim, lim]],
      },
      {
        type: "scatter",
        symbolSize: 14,
        data: pts.map((w) => ({
          value: [w.attendu_pct, w.observe_pct],
          itemStyle: {
            color: w.statut === "deviant_positif" ? SERIES[1] : w.statut === "sous_performance" ? SERIES[0] : "rgba(102,115,125,0.45)",
            borderColor: "#fcfcfb",
            borderWidth: 2,
          },
        })),
        label: {
          show: true,
          position: "right",
          color: MUT,
          fontSize: 9,
          formatter: (p: any) => pts[p.dataIndex].wilaya,
        },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("optim.dev.title")} subtitle={t("optim.dev.subtitle")} />
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-mut">
        <LegendDot color={SERIES[1]} label={t("optim.dev.modele")} />
        <LegendDot color={SERIES[0]} label={t("optim.dev.alerte")} />
        <LegendDot color="rgba(102,115,125,0.45)" label={t("optim.dev.conforme")} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <ReactECharts option={option} style={{ height: 320 }} />
        <div>
          <div className="eyebrow mb-2">{t("optim.dev.residus")}</div>
          <div className="space-y-1.5">
            {data.wilayas.map((w) => (
              <div key={w.wilaya} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 shrink-0 truncate font-semibold text-fg">{w.wilaya}</span>
                <span className="relative h-1.5 flex-1 rounded-full bg-ink/[0.08]">
                  <span
                    className="absolute top-0 block h-full rounded-full"
                    style={{
                      left: w.residu_pts >= 0 ? "50%" : undefined,
                      right: w.residu_pts < 0 ? "50%" : undefined,
                      width: `${Math.min(Math.abs(w.residu_pts) / 20, 1) * 50}%`,
                      background: w.residu_pts >= 0 ? SERIES[0] : SERIES[1],
                    }}
                  />
                </span>
                <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-16 text-right text-fg">
                  {w.residu_pts > 0 ? "+" : ""}{w.residu_pts.toLocaleString("fr-FR")}
                </b>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mut">
            {t("optim.dev.r2", { r2: Math.round(Math.max(data.r2_leave_one_out, 0) * 100), sigma: data.ecart_type_residus_pts.toLocaleString("fr-FR") })}
          </p>
        </div>
      </div>
      <Note>{data.lecture}</Note>
    </Card>
  );
}

/* -------------------------------------------------------- allocation optimale */
function Allocation({ data }: { data: OptimData }) {
  const { t } = useI18n();
  const classement = data.classement_cout_efficacite;
  const maxCout = Math.max(...classement.map((c) => c.cout_par_enfant_mro));

  return (
    <Card>
      <SectionTitle title={t("optim.alloc.title")} subtitle={t("optim.alloc.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="eyebrow mb-2">{t("optim.alloc.cout")}</div>
          <div className="space-y-1.5">
            {classement.map((c) => (
              <div key={c.wilaya} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 shrink-0 truncate text-fg">{c.wilaya}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                  <span className="block h-full rounded-full" style={{ width: `${(c.cout_par_enfant_mro / maxCout) * 100}%`, background: SERIES[2] }} />
                </span>
                <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-24 text-right text-fg">
                  {Math.round(c.cout_par_enfant_mro / 1000).toLocaleString("fr-FR")} k
                </b>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-mut">{t("optim.alloc.cout_note")}</p>
        </div>
        <div>
          {Object.entries(data.allocations).map(([cle, a]) => (
            <div key={cle} className="mb-4">
              <div className="eyebrow mb-1.5">
                {t(`optim.alloc.${cle}`)} · {a.budget_meuro.toLocaleString("fr-FR")} M€ →{" "}
                <b className="text-fg">{a.enfants_atteints.toLocaleString("fr-FR")}</b> {t("optim.alloc.enfants")}
              </div>
              <div className="flex flex-wrap gap-1">
                {a.wilayas_servies.map((w) => (
                  <span
                    key={w.wilaya}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: w.part_du_gisement_pct >= 99 ? "rgba(10,132,104,0.16)" : "rgba(181,119,14,0.16)",
                      color: w.part_du_gisement_pct >= 99 ? SERIES[1] : SERIES[2],
                    }}
                  >
                    {w.wilaya} {Math.round(w.part_du_gisement_pct)} %
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 rounded-xl border-l-[3px] px-4 py-3" style={{ borderColor: SERIES[0], background: "rgba(192,61,58,0.06)" }}>
        <b className="text-xs text-fg">{t("optim.tension.title")}</b>
        <p className="mt-1 text-[11px] leading-relaxed text-mut">{data.tension_efficience_equite.lecture}</p>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------- frontière d'efficience */
function Frontiere({ data }: { data: OptimData }) {
  const { t } = useI18n();
  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", ...TOOLTIP },
    grid: { left: 8, right: 16, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: "value", ...AXIS,
      name: t("optim.front.budget"), nameLocation: "middle", nameGap: 26, nameTextStyle: { color: MUT, fontSize: 10 },
      axisLabel: { ...AXIS.axisLabel, formatter: "{value} M€" },
    },
    yAxis: { type: "value", ...AXIS },
    series: [
      {
        type: "line",
        smooth: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: SERIES[1] },
        itemStyle: { color: SERIES[1], borderColor: "#fcfcfb", borderWidth: 2 },
        areaStyle: { color: "rgba(10,132,104,0.10)" },
        data: data.frontiere.map((p) => [p.budget_meuro, p.enfants_atteints]),
      },
    ],
  };
  return (
    <Card>
      <SectionTitle title={t("optim.front.title")} subtitle={t("optim.front.subtitle")} />
      <ReactECharts option={option} style={{ height: 260 }} />
    </Card>
  );
}

/* --------------------------------------------------------------------- DEA */
function Dea({ data }: { data: OptimData }) {
  const { t } = useI18n();
  return (
    <Card>
      <SectionTitle title={t("optim.dea.title")} subtitle={t("optim.dea.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-1.5">
          {data.dea.wilayas.map((w) => (
            <div key={w.wilaya} className="flex items-center gap-2 text-[11px]">
              <span className="w-32 shrink-0 truncate text-fg">{w.wilaya}</span>
              <Meter value={w.score_efficience * 100} color={w.efficiente ? SERIES[1] : SERIES[2]} />
            </div>
          ))}
        </div>
        <div>
          <Stat label={t("optim.dea.efficientes")} value={`${data.dea.n_efficientes} / ${data.dea.wilayas.length}`} color={SERIES[1]} />
          <p className="mt-3 text-[11px] leading-relaxed text-mut">{data.dea.lecture}</p>
          <p className="mt-3 text-[11px] leading-relaxed text-mut">{t("optim.dea.convergence")}</p>
        </div>
      </div>
    </Card>
  );
}
