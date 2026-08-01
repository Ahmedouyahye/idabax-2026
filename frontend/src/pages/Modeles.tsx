import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useMl, usePatterns, useStabilite } from "../lib/api";
import { AXIS_LINE, INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, LEGEND, Meter, NO_ANIM, Note, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { MlData, PatternsData, StabilityData } from "../lib/types";

export default function Modeles() {
  const { t } = useI18n();
  const ml = useMl();
  const pat = usePatterns();
  const sta = useStabilite();

  const error = ml.error || pat.error || sta.error;
  if (error) return <ErrorBox message={error} />;
  if (ml.loading || pat.loading || sta.loading) return <Loading label={t("modeles.loading")} />;

  const m = ml.data!;
  const p = pat.data!;
  const s = sta.data!;
  const gbm = m.modeles["Gradient boosting"];
  const meilleur = p.sous_groupes.sous_groupes[0];
  const ariRetenu = s.bootstrap.par_k.find((d) => d.k === s.k_retenu)!;

  return (
    <div>
      <PageHeader eyebrow={t("modeles.eyebrow")} title={t("modeles.title")} subtitle={t("modeles.subtitle")} />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi icon="target" label={t("modeles.kpi.auc")} value={gbm.auc.toLocaleString("fr-FR")}
               sub={t("modeles.kpi.auc_sub", { n: m.n_test.toLocaleString("fr-FR") })} />
          <Kpi icon="compass" label={t("modeles.kpi.gain")} value={`${m.gain_auc_gbm_vs_logit > 0 ? "+" : ""}${m.gain_auc_gbm_vs_logit.toLocaleString("fr-FR")}`}
               sub={t("modeles.kpi.gain_sub")} />
          <Kpi icon="mining" label={t("modeles.kpi.regles")} value={`${p.regles.n_non_domines}`}
               sub={t("modeles.kpi.regles_sub", { n: String(p.regles.n_significatifs), tot: String(p.regles.n_total) })} />
          <Kpi icon="clusters" label={t("modeles.kpi.ari")} value={ariRetenu.ari_moyen.toLocaleString("fr-FR")}
               sub={t("modeles.kpi.ari_sub", { k: String(s.k_retenu), n: s.bootstrap.n_boot.toLocaleString("fr-FR") })} />
        </div>

        <Validation data={m} />
        <Shap data={m} />
        <SousGroupes data={p} />
        <Stabilite data={s} />
      </div>
    </div>
  );
}

/* ------------------------------------------------- validation hors échantillon */
function Validation({ data }: { data: MlData }) {
  const { t } = useI18n();
  const noms = Object.keys(data.modeles);

  const roc: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", ...TOOLTIP },
    legend: { ...LEGEND, data: noms.map((n) => t(n)) },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: { type: "value", max: 1, ...AXIS, name: t("modeles.roc.fpr"), nameLocation: "middle", nameGap: 26, nameTextStyle: { color: MUT, fontSize: 10 } },
    yAxis: { type: "value", max: 1, ...AXIS },
    series: [
      ...noms.map((n, i) => ({
        name: t(n),
        type: "line" as const,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2, color: SERIES[i] },
        itemStyle: { color: SERIES[i] },
        data: data.modeles[n].roc.map((pt) => [pt.fpr, pt.tpr]),
      })),
      {
        name: "ref",
        type: "line" as const,
        silent: true,
        showSymbol: false,
        lineStyle: { width: 1, type: "dashed" as const, color: AXIS_LINE },
        data: [[0, 0], [1, 1]],
      },
    ],
  };

  const calib: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", ...TOOLTIP },
    grid: { left: 8, right: 16, top: 12, bottom: 30, containLabel: true },
    xAxis: { type: "value", max: 1, ...AXIS, name: t("modeles.calib.predit"), nameLocation: "middle", nameGap: 26, nameTextStyle: { color: MUT, fontSize: 10 } },
    yAxis: { type: "value", max: 1, ...AXIS },
    series: [
      {
        type: "line",
        symbolSize: 8,
        lineStyle: { width: 2, color: SERIES[1] },
        itemStyle: { color: SERIES[1], borderColor: "#fcfcfb", borderWidth: 2 },
        data: data.calibration.map((c) => [c.predit, c.observe]),
      },
      {
        type: "line",
        silent: true,
        showSymbol: false,
        lineStyle: { width: 1, type: "dashed", color: AXIS_LINE },
        data: [[0, 0], [1, 1]],
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("modeles.validation.title")} subtitle={t("modeles.validation.subtitle")} />
      <div className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
              <th className="py-2 pr-3 font-semibold">{t("modeles.tab.modele")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.tab.cv")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.tab.train")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.tab.test")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.tab.pr")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.tab.sens")}</th>
              <th className="py-2 text-right font-semibold">{t("modeles.tab.spec")}</th>
            </tr>
          </thead>
          <tbody>
            {noms.map((n) => {
              const x = data.modeles[n];
              return (
                <tr key={n} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-semibold text-fg">{t(n)}</td>
                  <td className="num py-2 pr-3 text-right text-mut">
                    {x.cv_auc_moyenne.toLocaleString("fr-FR")} ± {x.cv_auc_ecart_type.toLocaleString("fr-FR")}
                  </td>
                  <td className="num py-2 pr-3 text-right text-mut">{x.auc_entrainement.toLocaleString("fr-FR")}</td>
                  <td className="num py-2 pr-3 text-right font-bold text-fg">{x.auc.toLocaleString("fr-FR")}</td>
                  <td className="num py-2 pr-3 text-right text-mut">{x.pr_auc.toLocaleString("fr-FR")}</td>
                  <td className="num py-2 pr-3 text-right text-mut">{x.sensibilite.toLocaleString("fr-FR")}</td>
                  <td className="num py-2 text-right text-mut">{x.specificite.toLocaleString("fr-FR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="eyebrow mb-1">{t("modeles.roc.title")}</div>
          <ReactECharts option={roc} style={{ height: 240 }} />
        </div>
        <div>
          <div className="eyebrow mb-1">{t("modeles.calib.title")}</div>
          <ReactECharts option={calib} style={{ height: 240 }} />
          <p className="mt-1 text-[11px] leading-relaxed text-mut">{t("modeles.calib.note")}</p>
        </div>
      </div>
      <Note>{data.conclusion}</Note>
    </Card>
  );
}

/* ------------------------------------------------------------ interprétation */
function Shap({ data }: { data: MlData }) {
  const { t } = useI18n();
  const maxImp = Math.max(...data.shap_importance.map((f) => f.importance));

  const age: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", ...TOOLTIP },
    grid: { left: 8, right: 16, top: 16, bottom: 30, containLabel: true },
    xAxis: {
      type: "category",
      data: data.effet_age.map((e) => e.age),
      ...AXIS,
      name: t("parcours.pyramide.age"),
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: MUT, fontSize: 10 },
    },
    yAxis: { type: "value", ...AXIS },
    series: [
      {
        type: "bar",
        data: data.effet_age.map((e) => ({
          value: e.effet_shap,
          itemStyle: { color: e.effet_shap >= 0 ? SERIES[0] : SERIES[1], borderRadius: 3 },
        })),
        barWidth: 22,
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("modeles.shap.title")} subtitle={t("modeles.shap.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="eyebrow mb-2">{t("modeles.shap.importance")}</div>
          <div className="space-y-1.5">
            {data.shap_importance.map((f) => (
              <div key={f.feature} className="flex items-center gap-2 text-[11px]">
                <span className="w-40 shrink-0 truncate text-fg">{t(f.label)}</span>
                <Meter value={f.importance} max={maxImp} color={SERIES[1]} suffix="" decimals={3} />
              </div>
            ))}
          </div>
          <div className="eyebrow mb-2 mt-5">{t("modeles.shap.interaction")}</div>
          <div className="space-y-1.5">
            {data.interaction_rural_pauvre.map((c) => (
              <div key={`${c.rural}-${c.pauvre}`} className="flex items-center gap-2 text-[11px]">
                <span className="w-40 shrink-0 truncate text-fg">
                  {t(c.rural ? "robustesse.theil.rural" : "robustesse.theil.urbain")} ·{" "}
                  {t(c.pauvre ? "parcours.survie.pauvre" : "parcours.survie.non_pauvre")}
                </span>
                <Meter value={c.proba_moyenne_pct} color={SERIES[0]} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1">{t("modeles.shap.age")}</div>
          <ReactECharts option={age} style={{ height: 260 }} />
          <p className="mt-1 text-[11px] leading-relaxed text-mut">{t("modeles.shap.age_note")}</p>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------- découverte de sous-groupes */
function SousGroupes({ data }: { data: PatternsData }) {
  const { t } = useI18n();
  const sg = data.sous_groupes;

  return (
    <Card>
      <SectionTitle title={t("modeles.sg.title")} subtitle={t("modeles.sg.subtitle")} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
              <th className="py-2 pr-3 font-semibold">{t("modeles.sg.groupe")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.sg.n")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.sg.taux")}</th>
              <th className="py-2 pr-3 text-right font-semibold">{t("modeles.sg.ecart")}</th>
              <th className="py-2 font-semibold">{t("modeles.sg.couverture")}</th>
            </tr>
          </thead>
          <tbody>
            {sg.sous_groupes.map((g) => (
              <tr key={g.description} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3">
                  <span className="flex flex-wrap gap-1">
                    {g.conditions.map((c) => (
                      <span key={c} className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-semibold text-fg">
                        {t(`item.${c}`)}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="num py-2 pr-3 text-right text-mut">{g.n.toLocaleString("fr-FR")}</td>
                <td className="num py-2 pr-3 text-right font-bold text-fg">{g.taux_hors_ecole_pct.toLocaleString("fr-FR")} %</td>
                <td className="num py-2 pr-3 text-right" style={{ color: SERIES[0] }}>
                  +{g.ecart_vs_national_pts.toLocaleString("fr-FR")}
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <Meter value={g.enfants_concernes_pct_du_total} color={SERIES[2]} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>{sg.methode}</Note>
      <div className="mt-4">
        <div className="eyebrow mb-2">{t("modeles.regles.title")}</div>
        <div className="space-y-1.5">
          {data.regles.regles.slice(0, 8).map((r) => (
            <div key={r.antecedents} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-ink/[0.045] px-3 py-2 text-[11px]">
              {r.antecedents.split(" & ").map((a) => (
                <span key={a} className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 font-semibold text-mut">{t(`item.${a}`)}</span>
              ))}
              <span className="font-bold text-mut">⟶</span>
              <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ background: "rgba(192,61,58,0.15)", color: SERIES[0] }}>
                {t("item.hors_ecole")}
              </span>
              <span className="num ml-auto flex items-center gap-3 text-mut">
                <span>{t("regles.conf")} <b className="text-fg">{Math.round(r.confidence * 100)} %</b></span>
                <span>{t("regles.lift")} <b className="text-fg">{r.lift.toLocaleString("fr-FR")}</b></span>
                <span>n = <b className="text-fg">{r.n_couvert.toLocaleString("fr-FR")}</b></span>
                <span title={`p = ${r.pvalue.toExponential(1)}`}>{r.significatif ? "✓" : "—"}</span>
              </span>
            </div>
          ))}
        </div>
        <Note>{data.regles.methode}</Note>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- stabilité k */
function Stabilite({ data }: { data: StabilityData }) {
  const { t } = useI18n();

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...TOOLTIP },
    legend: { ...LEGEND, data: [t("modeles.stab.ari"), t("modeles.stab.silhouette")] },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: data.bootstrap.par_k.map((d) => `k = ${d.k}`),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontWeight: 600 },
    },
    yAxis: { type: "value", max: 1, ...AXIS },
    series: [
      {
        name: t("modeles.stab.ari"),
        type: "bar",
        data: data.bootstrap.par_k.map((d) => ({
          value: d.ari_moyen,
          itemStyle: { color: d.k === data.k_retenu ? SERIES[1] : "rgba(10,132,104,0.30)", borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: 30,
        label: { show: true, position: "top", color: INK, fontSize: 10, fontWeight: 600 },
      },
      {
        name: t("modeles.stab.silhouette"),
        type: "line",
        symbolSize: 8,
        lineStyle: { width: 2, color: SERIES[2] },
        itemStyle: { color: SERIES[2], borderColor: "#fcfcfb", borderWidth: 2 },
        data: data.bootstrap.par_k.map((d) => d.silhouette),
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("modeles.stab.title")} subtitle={t("modeles.stab.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <ReactECharts option={option} style={{ height: 280 }} />
        <div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Stat label={t("modeles.stab.k_ari")} value={`k = ${data.bootstrap.k_le_plus_stable}`} color={SERIES[1]} />
            <Stat label={t("modeles.stab.k_bic")} value={`k = ${data.melange_gaussien.k_bic_optimal}`} color={SERIES[2]} />
          </div>
          <div className="eyebrow mb-2">{t("modeles.stab.ambigues")}</div>
          <div className="space-y-1.5">
            {data.co_assignation.paires_ambigues.slice(0, 5).map((p) => (
              <div key={`${p.a}|${p.b}`} className="flex items-center gap-2 text-[11px]">
                <span className="flex-1 truncate text-fg">{p.a} ↔ {p.b}</span>
                <Meter value={p.frequence * 100} color={SERIES[2]} width="w-24" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mut">{data.melange_gaussien.avertissement}</p>
        </div>
      </div>
      <Note>{data.verdict}</Note>
    </Card>
  );
}
