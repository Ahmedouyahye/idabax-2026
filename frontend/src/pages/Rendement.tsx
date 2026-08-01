import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useRendement } from "../lib/api";
import { INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, Meter, NO_ANIM, Note, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { RendementData } from "../lib/types";

export default function Rendement() {
  const { t } = useI18n();
  const { data, loading, error } = useRendement();
  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Loading label={t("rendement.loading")} />;

  const e = data.ecart_formel;
  const sup = data.niveaux.find((n) => n.niveau === "Universitaire");
  const jamais = data.niveaux.find((n) => n.niveau === "Jamais scolarisé");

  return (
    <div>
      <PageHeader
        eyebrow={t("rendement.eyebrow")}
        title={t("rendement.title")}
        subtitle={t("rendement.subtitle")}
      />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi
            icon="users"
            label={t("rendement.kpi.pauvrete")}
            value={`${e.pauvrete_non_formel_pct.toLocaleString("fr-FR")} → ${e.pauvrete_formel_pct.toLocaleString("fr-FR")} %`}
            sub={t("rendement.kpi.pauvrete_sub", { n: e.ecart_pauvrete_pts.toLocaleString("fr-FR") })}
          />
          <Kpi
            icon="target"
            label={t("rendement.kpi.structure")}
            value={`${data.oaxaca.structure_pct?.toLocaleString("fr-FR")} %`}
            sub={t("rendement.kpi.structure_sub")}
          />
          <Kpi
            icon="trend"
            label={t("rendement.kpi.chomage")}
            value={`${jamais?.chomage_pct.toLocaleString("fr-FR")} → ${sup?.chomage_pct.toLocaleString("fr-FR")} %`}
            sub={t("rendement.kpi.chomage_sub")}
          />
          <Kpi
            icon="book"
            label={t("rendement.kpi.or")}
            value={`× ${data.logit_pauvrete.niveaux[data.logit_pauvrete.niveaux.length - 1].odds_ratio.toLocaleString("fr-FR")}`}
            sub={t("rendement.kpi.or_sub")}
          />
        </div>

        <Gradient data={data} />
        <Oaxaca data={data} />
        <LogitPauvrete data={data} />
      </div>
    </div>
  );
}

/* --------------------------------- gradient : deux graphiques, jamais deux axes */
function Gradient({ data }: { data: RendementData }) {
  const { t } = useI18n();
  const niveaux = data.niveaux;
  const labels = niveaux.map((n) => t(n.niveau));

  const build = (key: "pauvrete_pct" | "chomage_pct", color: string, max: number): EChartsOption => ({
    ...NO_ANIM,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...TOOLTIP },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 10, interval: 0, rotate: 30 },
    },
    yAxis: { type: "value", max, ...AXIS, axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" } },
    series: [
      {
        type: "bar",
        data: niveaux.map((n) => n[key]),
        barWidth: 26,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top",
          color: INK,
          fontSize: 10,
          fontWeight: 600,
          formatter: "{c} %",
        },
      },
    ],
  });

  return (
    <Card>
      <SectionTitle title={t("rendement.gradient.title")} subtitle={t("rendement.gradient.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="eyebrow mb-1">{t("rendement.gradient.pauvrete")}</div>
          <ReactECharts option={build("pauvrete_pct", SERIES[0], 50)} style={{ height: 240 }} />
        </div>
        <div>
          <div className="eyebrow mb-1">{t("rendement.gradient.chomage")}</div>
          <ReactECharts option={build("chomage_pct", SERIES[2], 15)} style={{ height: 240 }} />
        </div>
      </div>
      <div className="mt-3 rounded-xl border-l-[3px] px-4 py-3" style={{ borderColor: SERIES[2], background: "rgba(181,119,14,0.06)" }}>
        <b className="text-xs text-fg">{t("rendement.paradoxe.title")}</b>
        <p className="mt-1 text-[11px] leading-relaxed text-mut">{t("rendement.paradoxe.text")}</p>
      </div>
      <Note>{data.avertissement}</Note>
    </Card>
  );
}

/* ------------------------------------------------------ décomposition Oaxaca */
function Oaxaca({ data }: { data: RendementData }) {
  const { t } = useI18n();
  const o = data.oaxaca;
  const compo = Math.max(o.composition_pct ?? 0, 0);
  const struct = Math.max(o.structure_pct ?? 0, 0);

  return (
    <Card>
      <SectionTitle title={t("rendement.oaxaca.title")} subtitle={t("rendement.oaxaca.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Stat label={t("rendement.oaxaca.total")} value={`${o.ecart_total_pts.toLocaleString("fr-FR")} pts`} />
            <Stat label={t("rendement.oaxaca.composition")} value={`${o.composition_pts.toLocaleString("fr-FR")} pts`} color={SERIES[2]} />
            <Stat label={t("rendement.oaxaca.structure")} value={`${o.structure_pts.toLocaleString("fr-FR")} pts`} color={SERIES[1]} />
          </div>
          <div className="mb-2 flex h-9 overflow-hidden rounded-lg">
            <div
              className="flex items-center justify-center text-[11px] font-bold text-white"
              style={{ width: `${compo}%`, background: SERIES[2], marginRight: 2 }}
            >
              {compo.toFixed(0)} %
            </div>
            <div
              className="flex items-center justify-center text-[11px] font-bold text-white"
              style={{ width: `${struct}%`, background: SERIES[1] }}
            >
              {struct.toFixed(0)} %
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-mut">{t("rendement.oaxaca.lecture_cle")}</p>
        </div>
        <div>
          <div className="eyebrow mb-2">{t("rendement.oaxaca.detail")}</div>
          <div className="space-y-1.5">
            {o.detail_composition.map((d) => (
              <div key={d.variable} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 shrink-0 truncate text-fg">{t(`rendement.var.${d.variable}`)}</span>
                <span className="relative h-1.5 flex-1 rounded-full bg-ink/[0.08]">
                  <span
                    className="absolute top-0 block h-full rounded-full"
                    style={{
                      left: d.contribution_pts >= 0 ? "50%" : undefined,
                      right: d.contribution_pts < 0 ? "50%" : undefined,
                      width: `${Math.min(Math.abs(d.contribution_pts) / 10, 1) * 50}%`,
                      background: d.contribution_pts >= 0 ? SERIES[2] : SERIES[1],
                    }}
                  />
                </span>
                <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-16 text-right text-fg">
                  {d.contribution_pts > 0 ? "+" : ""}
                  {d.contribution_pts.toLocaleString("fr-FR")}
                </b>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mut">{t("rendement.oaxaca.detail_note")}</p>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- odds-ratios logit */
function LogitPauvrete({ data }: { data: RendementData }) {
  const { t } = useI18n();
  const lp = data.logit_pauvrete;
  return (
    <Card>
      <SectionTitle
        title={t("rendement.logit.title")}
        subtitle={t("rendement.logit.subtitle", { ref: t(lp.reference), controles: lp.controles })}
      />
      <div className="space-y-2">
        {lp.niveaux.map((n) => (
          <div key={n.niveau} className="flex items-center gap-3 text-[11px]">
            <span className="w-28 shrink-0 truncate font-semibold text-fg">{t(n.niveau)}</span>
            <span className="relative h-6 flex-1">
              {/* échelle 0 → 1 : plus la barre est courte, plus le risque de pauvreté baisse */}
              <span className="absolute inset-y-0 left-0 w-full rounded bg-ink/[0.05]" />
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${n.odds_ratio * 100}%`, background: SERIES[1] }}
              />
              <span className="absolute inset-y-0 border-l border-dashed border-ink/25" style={{ left: "100%" }} />
            </span>
            <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-32 shrink-0 text-right text-mut">
              <b className="text-fg">{n.odds_ratio.toLocaleString("fr-FR")}</b> [{n.ci_lo.toLocaleString("fr-FR")} – {n.ci_hi.toLocaleString("fr-FR")}]
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-mut">
        {t("rendement.logit.lecture", { n: lp.n.toLocaleString("fr-FR"), r2: lp.pseudo_r2.toLocaleString("fr-FR") })}
      </p>
    </Card>
  );
}
