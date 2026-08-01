import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useEquite, useRobustesse, useUncertainty } from "../lib/api";
import { AXIS_LINE, INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, LegendDot, NO_ANIM, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";

export default function Robustesse() {
  const { t } = useI18n();
  const unc = useUncertainty();
  const rob = useRobustesse();
  const eq = useEquite();

  const error = unc.error || rob.error || eq.error;
  if (error) return <ErrorBox message={error} />;
  if (unc.loading || rob.loading || eq.loading) return <Loading label={t("robustesse.loading")} />;

  const u = unc.data!;
  const r = rob.data!;
  const e = eq.data!;

  return (
    <div>
      <PageHeader
        eyebrow={t("robustesse.eyebrow")}
        title={t("robustesse.title")}
        subtitle={t("robustesse.subtitle")}
      />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi
            icon="target"
            label={t("robustesse.kpi.marge")}
            value={`±${u.marge_mediane_pts.toLocaleString("fr-FR")} ${t("unit.pts")}`}
            sub={t("robustesse.kpi.marge_sub", { n: u.n_boot.toLocaleString("fr-FR") })}
          />
          <Kpi
            icon="grid"
            label={t("robustesse.kpi.rangs")}
            value={`${r.monte_carlo.n_rangs_stables_p90}/13`}
            sub={t("robustesse.kpi.rangs_sub", { n: r.monte_carlo.n_draws.toLocaleString("fr-FR") })}
          />
          <Kpi
            icon="compass"
            label={t("robustesse.kpi.spearman")}
            value={`ρ ≥ ${r.spearman_min.toFixed(2)}`}
            sub={t("robustesse.kpi.spearman_sub", { n: String(r.methodes.length) })}
          />
          <Kpi
            icon="child"
            label={t("robustesse.kpi.hoi")}
            value={`${e.hoi.hoi_pct.toLocaleString("fr-FR")} %`}
            sub={t("robustesse.kpi.hoi_sub", {
              c: e.hoi.couverture_pct.toLocaleString("fr-FR"),
              p: e.hoi.penalite_inegalite_pts.toLocaleString("fr-FR"),
            })}
          />
        </div>

        <RangIntervals data={r} />
        <IntervallesConfiance data={u} />
        <Ponderations data={r} />
        <Equite data={e} />
        <ValidationExterne data={r} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- rangs IPE */
function RangIntervals({ data }: { data: import("../lib/types").RobustnessData }) {
  const { t } = useI18n();
  const rows = data.monte_carlo.wilayas;

  // Barre flottante : un segment transparent jusqu'à p05, puis l'étendue p05→p95.
  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: {
      trigger: "item",
      ...TOOLTIP,
      formatter: (p: any) => {
        const d = rows[p.dataIndex];
        return `<b>${d.wilaya}</b><br/>${t("robustesse.rang_median")} : ${d.rang_median}<br/>${t(
          "robustesse.intervalle_90"
        )} : ${d.rang_p05}–${d.rang_p95}<br/>${t("robustesse.prob_top3")} : ${Math.round(
          d.prob_top3 * 100
        )} %`;
      },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      min: 0.5,
      max: 13.5,
      interval: 1,
      ...AXIS,
      name: t("robustesse.rang_ipe"),
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: MUT, fontSize: 10 },
      axisLabel: { ...AXIS.axisLabel, formatter: (v: number) => (Number.isInteger(v) ? `${v}` : "") },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: rows.map((d) => d.wilaya),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 11, fontWeight: 600, color: "#55636d" },
    },
    series: [
      // segment invisible qui décale la barre jusqu'au rang p05
      {
        type: "bar",
        stack: "r",
        silent: true,
        itemStyle: { color: "transparent" },
        data: rows.map((d) => d.rang_p05 - 0.5),
      },
      {
        type: "bar",
        stack: "r",
        barWidth: 14,
        data: rows.map((d) => ({
          value: d.rang_p95 - d.rang_p05 + 1,
          itemStyle: {
            color: d.rang_stable_p90 ? SERIES[1] : SERIES[2],
            borderRadius: 4,
            borderColor: "#fcfcfb",
            borderWidth: 2,
          },
        })),
        label: {
          show: true,
          position: "right",
          color: INK,
          fontSize: 10,
          fontWeight: 600,
          formatter: (p: any) => {
            const d = rows[p.dataIndex];
            return d.rang_p05 === d.rang_p95 ? `${d.rang_p05}` : `${d.rang_p05}–${d.rang_p95}`;
          },
        },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("robustesse.mc.title")} subtitle={t("robustesse.mc.subtitle")} />
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-mut">
        <LegendDot color={SERIES[1]} label={t("robustesse.legende.stable")} />
        <LegendDot color={SERIES[2]} label={t("robustesse.legende.instable")} />
      </div>
      <ReactECharts option={option} style={{ height: 380 }} />
      <p className="mt-3 text-[11px] leading-relaxed text-mut">
        {t("robustesse.mc.conclusion", {
          n: data.monte_carlo.n_draws.toLocaleString("fr-FR"),
          k: data.monte_carlo.n_rangs_stables_p90,
          tot: rows.length,
          instables: rows
            .filter((d) => !d.rang_stable_p90 && d.rang_median > 5 && d.rang_median < 10)
            .map((d) => d.wilaya)
            .join(", "),
          rho: data.spearman_min.toFixed(2),
        })}
      </p>
    </Card>
  );
}

/* -------------------------------------------------- intervalles de confiance */
function IntervallesConfiance({ data }: { data: import("../lib/types").UncertaintyData }) {
  const { t } = useI18n();
  return (
    <Card>
      <SectionTitle title={t("robustesse.ci.title")} subtitle={t("robustesse.ci.subtitle")} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
              <th className="py-2 pr-3 font-semibold">{t("Wilaya")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("robustesse.ci.n")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("robustesse.ci.taux")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("robustesse.ci.ic")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("robustesse.ci.marge")}</th>
              <th className="py-2 text-right font-semibold">{t("robustesse.ci.retreci")}</th>
            </tr>
          </thead>
          <tbody>
            {data.wilayas.map((w) => (
              <tr key={w.wilaya} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3 font-semibold text-fg">{w.wilaya}</td>
                <td className="num py-2 pr-3 text-right text-mut">{w.n_echantillon.toLocaleString("fr-FR")}</td>
                <td className="num py-2 pr-3 text-right font-semibold text-fg">
                  {w.hors_ecole.pct.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                </td>
                <td className="num py-2 pr-3 text-right text-mut">
                  {w.hors_ecole.ci_lo.toFixed(1)} – {w.hors_ecole.ci_hi.toFixed(1)}
                </td>
                <td className="num py-2 pr-3 text-right">
                  <MargeBar marge={w.hors_ecole.marge} max={5} />
                </td>
                <td className="num py-2 text-right text-mut">
                  {w.hors_ecole_retreci_pct.toFixed(1)} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl bg-ink/[0.04] px-4 py-3 text-[11px] leading-relaxed text-mut">
        <b className="text-fg">
          {t("robustesse.ci.rangs", { n: String(data.rangs_inchanges) })}
        </b>{" "}
        {t("robustesse.ci.note")}
      </div>
    </Card>
  );
}

function MargeBar({ marge, max }: { marge: number; max: number }) {
  const w = Math.min(marge / max, 1) * 100;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.08]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${w}%`, background: marge >= 3.5 ? SERIES[0] : SERIES[2] }}
        />
      </span>
      <span className="w-10 text-right font-semibold text-fg">±{marge.toFixed(1)}</span>
    </span>
  );
}

/* ------------------------------------------------------------- pondérations */
function Ponderations({ data }: { data: import("../lib/types").RobustnessData }) {
  const { t } = useI18n();
  const methodes = Object.keys(data.poids_alternatifs);
  const dims = Object.keys(data.poids_alternatifs[methodes[0]]);

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...TOOLTIP },
    legend: {
      data: methodes.map((m) => t(`robustesse.poids.${m}`)),
      bottom: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: MUT, fontSize: 11 },
    },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: dims.map((d) => t(d)),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 10, interval: 0, width: 110, overflow: "break" },
    },
    yAxis: { type: "value", max: 0.5, ...AXIS, axisLabel: { ...AXIS.axisLabel, formatter: "{value}" } },
    series: methodes.map((m, i) => ({
      name: t(`robustesse.poids.${m}`),
      type: "bar",
      barGap: "12%",
      data: dims.map((d) => data.poids_alternatifs[m][d]),
      itemStyle: { color: SERIES[i % SERIES.length], borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: "top",
        color: MUT,
        fontSize: 9,
        formatter: (p: any) => p.value.toFixed(2),
      },
    })),
  };

  return (
    <Card>
      <SectionTitle title={t("robustesse.poids.title")} subtitle={t("robustesse.poids.subtitle")} />
      <ReactECharts option={option} style={{ height: 280 }} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.spearman.slice(0, 4).map((s) => (
          <div key={`${s.a}|${s.b}`} className="flex items-center gap-2 rounded-lg bg-ink/[0.04] px-3 py-2 text-[11px]">
            <span className="truncate text-mut">
              {t(s.a)} × {t(s.b)}
            </span>
            <b className="num ml-auto text-fg">ρ = {s.rho.toFixed(3)}</b>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------- équité */
function Equite({ data }: { data: import("../lib/types").EquityData }) {
  const { t } = useI18n();
  const th = data.theil;
  const hoi = data.hoi;
  const ob = data.offre_besoin;

  const courbe: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", ...TOOLTIP },
    legend: {
      data: [t("robustesse.offre.enfants"), t("robustesse.offre.ecoles")],
      bottom: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: MUT, fontSize: 11 },
    },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: {
      type: "value",
      max: 100,
      ...AXIS,
      name: t("robustesse.offre.x"),
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: MUT, fontSize: 10 },
      axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" },
    },
    yAxis: { type: "value", max: 100, ...AXIS, axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" } },
    series: [
      {
        name: t("robustesse.offre.enfants"),
        type: "line",
        smooth: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: SERIES[0] },
        itemStyle: { color: SERIES[0], borderColor: "#fcfcfb", borderWidth: 2 },
        data: ob.courbe_concentration.map((p) => [p.x, p.enfants]),
      },
      {
        name: t("robustesse.offre.ecoles"),
        type: "line",
        smooth: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: SERIES[1] },
        itemStyle: { color: SERIES[1], borderColor: "#fcfcfb", borderWidth: 2 },
        data: ob.courbe_concentration.map((p) => [p.x, p.ecoles]),
      },
      {
        name: "ref",
        type: "line",
        silent: true,
        showSymbol: false,
        lineStyle: { width: 1, type: "dashed", color: AXIS_LINE },
        data: [
          [0, 0],
          [100, 100],
        ],
      },
    ],
  };

  const ecartsTries = [...th.par_wilaya]
    .filter((w) => w.ecart_urbain_rural !== null)
    .sort((a, b) => (b.ecart_urbain_rural ?? 0) - (a.ecart_urbain_rural ?? 0))
    .slice(0, 5);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SectionTitle title={t("robustesse.theil.title")} subtitle={t("robustesse.theil.subtitle")} />
        <div className="mb-4 flex h-9 overflow-hidden rounded-lg">
          <div
            className="flex items-center justify-center text-[11px] font-bold text-white"
            style={{ width: `${th.part_inter_pct}%`, background: SERIES[0], marginRight: 2 }}
          >
            {th.part_inter_pct} %
          </div>
          <div
            className="flex items-center justify-center text-[11px] font-bold text-white"
            style={{ width: `${th.part_intra_pct}%`, background: SERIES[1] }}
          >
            {th.part_intra_pct} %
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 text-[11px] text-mut">
          <LegendDot color={SERIES[0]} label={t("robustesse.theil.inter")} />
          <LegendDot color={SERIES[1]} label={t("robustesse.theil.intra")} />
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-mut">
          {t("robustesse.theil.lecture", { inter: th.part_inter_pct, intra: th.part_intra_pct })}
        </p>
        <div className="eyebrow mb-2">{t("robustesse.theil.fracture")}</div>
        <div className="space-y-1.5">
          {ecartsTries.map((w) => (
            <div key={w.wilaya} className="flex items-center gap-2 text-[11px]">
              <span className="w-32 shrink-0 truncate font-semibold text-fg">{w.wilaya}</span>
              <span className="num text-mut">
                {t("robustesse.theil.urbain")} {w.taux_urbain} %
              </span>
              <span className="text-mut">→</span>
              <span className="num text-mut">
                {t("robustesse.theil.rural")} {w.taux_rural} %
              </span>
              <b className="num ml-auto" style={{ color: SERIES[0] }}>
                +{w.ecart_urbain_rural} pts
              </b>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("robustesse.hoi.title")} subtitle={t("robustesse.hoi.subtitle")} />
        <div className="mb-4 flex items-end gap-6">
          <div>
            <div className="eyebrow">{t("robustesse.hoi.couverture")}</div>
            <div className="font-display text-3xl font-semibold leading-none text-fg">
              {hoi.couverture_pct.toLocaleString("fr-FR")} %
            </div>
          </div>
          <div className="pb-1 text-lg text-mut">→</div>
          <div>
            <div className="eyebrow">{t("robustesse.hoi.hoi")}</div>
            <div className="font-display text-3xl font-semibold leading-none" style={{ color: SERIES[1] }}>
              {hoi.hoi_pct.toLocaleString("fr-FR")} %
            </div>
          </div>
          <div className="pb-1">
            <div className="eyebrow">{t("robustesse.hoi.penalite")}</div>
            <div className="num text-sm font-bold" style={{ color: SERIES[0] }}>
              −{hoi.penalite_inegalite_pts.toLocaleString("fr-FR")} pts
            </div>
          </div>
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-mut">
          {t("robustesse.hoi.lecture", {
            c: hoi.couverture_pct.toLocaleString("fr-FR"),
            h: hoi.hoi_pct.toLocaleString("fr-FR"),
            p: hoi.penalite_inegalite_pts.toLocaleString("fr-FR"),
          })}
        </p>
        <div className="eyebrow mb-2">{t("robustesse.hoi.contributions")}</div>
        <div className="space-y-1.5">
          {hoi.contributions.map((c) => (
            <div key={c.circonstance} className="flex items-center gap-2 text-[11px]">
              <span className="w-40 shrink-0 truncate text-fg">{t(c.circonstance)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(c.part_de_D_pct, 0)}%`,
                    background: SERIES[1],
                  }}
                />
              </span>
              <b className="num w-12 text-right text-fg">{c.part_de_D_pct.toFixed(1)} %</b>
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle title={t("robustesse.offre.title")} subtitle={t("robustesse.offre.subtitle")} />
        <ReactECharts option={courbe} style={{ height: 300 }} />
        <p className="mt-3 text-[11px] leading-relaxed text-mut">
          {t("robustesse.offre.lecture", {
            db: Math.round(ob.dissimilarite_ecoles_besoin * 100),
            de: Math.round(ob.dissimilarite_ecoles_enfants * 100),
          })}
        </p>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------- validation externe */
function ValidationExterne({ data }: { data: import("../lib/types").RobustnessData }) {
  const { t } = useI18n();
  const v = data.validation_externe;
  return (
    <Card>
      <SectionTitle title={t("robustesse.validation.title")} subtitle={t("robustesse.validation.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("robustesse.validation.epcv")} value={`${v.epcv_2019_pct.toLocaleString("fr-FR")} %`} />
        <Stat label={t("robustesse.validation.wdi")} value={v.wdi_2019_pct !== null ? `${v.wdi_2019_pct.toLocaleString("fr-FR")} %` : "—"} />
        <Stat
          label={t("robustesse.validation.ecart")}
          value={v.ecart_pts !== null ? `${v.ecart_pts > 0 ? "+" : ""}${v.ecart_pts.toLocaleString("fr-FR")} pts` : "—"}
          color={SERIES[1]}
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-mut">{t("robustesse.validation.explication")}</p>

      <div
        className="mt-4 rounded-xl border-l-[3px] px-4 py-3"
        style={{ borderColor: SERIES[0], background: "rgba(192,61,58,0.06)" }}
      >
        <div className="mb-1.5 flex flex-wrap items-center gap-3">
          <b className="text-xs text-fg">{t("robustesse.validation.tendance")}</b>
          <span className="num text-[11px] text-mut">
            {t("robustesse.validation.avec")}{" "}
            <b className="text-fg">
              {v.tendance.pente_2008_2024} {t("unit.pt_an")}
            </b>
          </span>
          <span className="num text-[11px] text-mut">
            {t("robustesse.validation.sans")}{" "}
            <b className="text-fg">
              {v.tendance.pente_2008_2020} {t("unit.pt_an")}
            </b>
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-mut">
          {t("robustesse.validation.alerte", {
            p1: v.tendance.pente_2008_2024.toLocaleString("fr-FR"),
            p2: v.tendance.pente_2008_2020.toLocaleString("fr-FR"),
            v2024: v.tendance.point_2024.toLocaleString("fr-FR"),
            v2020: v.tendance.point_2020.toLocaleString("fr-FR"),
          })}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-mut">{t("robustesse.validation.uis")}</p>
    </Card>
  );
}
