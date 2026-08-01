import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useCohortes, useParcours } from "../lib/api";
import { INK, MUT, SERIES } from "../lib/charts";
import { Card, ErrorBox, Kpi, Loading, PageHeader } from "../components/ui";
import { AXIS, LEGEND, LegendDot, Meter, NO_ANIM, Note, SectionTitle, Stat, TOOLTIP } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { CohortesData, ParcoursData } from "../lib/types";

export default function Parcours() {
  const { t } = useI18n();
  const par = useParcours();
  const coh = useCohortes();

  const error = par.error || coh.error;
  if (error) return <ErrorBox message={error} />;
  if (par.loading || coh.loading) return <Loading label={t("parcours.loading")} />;

  const p = par.data!;
  const c = coh.data!;
  const college = p.survie.etapes.find((e) => e.palier === "Collège")!;

  return (
    <div>
      <PageHeader
        eyebrow={t("parcours.eyebrow")}
        title={t("parcours.title")}
        subtitle={t("parcours.subtitle")}
      />

      <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <Kpi
            icon="child"
            label={t("parcours.kpi.retard")}
            value={`${p.retard.retard_national_pct.toLocaleString("fr-FR")} %`}
            sub={t("parcours.kpi.retard_sub", { n: p.retard.n_ages_concernes.toLocaleString("fr-FR") })}
          />
          <Kpi
            icon="door"
            label={t("parcours.kpi.college")}
            value={`${college.part_cohorte_pct.toLocaleString("fr-FR")} %`}
            sub={t("parcours.kpi.college_sub")}
          />
          <Kpi
            icon="book"
            label={t("parcours.kpi.superieur")}
            value={`${p.survie.etapes[3].part_cohorte_pct.toLocaleString("fr-FR")} %`}
            sub={t("parcours.kpi.superieur_sub")}
          />
          <Kpi
            icon="users"
            label={t("parcours.kpi.generations")}
            value={`+${c.nationale.gain_formel_pts.toLocaleString("fr-FR")} ${t("unit.pts")}`}
            sub={t("parcours.kpi.generations_sub")}
          />
        </div>

        <Retard data={p.retard} />
        <Survie data={p.survie} />
        <Pyramide data={p.pyramide} />
        <Cohortes data={c} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ retard scolaire */
function Retard({ data }: { data: ParcoursData["retard"] }) {
  const { t } = useI18n();
  const ages = data.par_age.filter((a) => a.en_retard_pct !== null);

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...TOOLTIP },
    legend: { ...LEGEND, data: [t("parcours.retard.primaire"), t("parcours.retard.college")] },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: ages.map((a) => t("parcours.retard.ans", { n: a.age })),
      ...AXIS,
    },
    yAxis: { type: "value", ...AXIS },
    series: [
      {
        name: t("parcours.retard.primaire"),
        type: "bar",
        stack: "n",
        data: ages.map((a) => a.primaire),
        itemStyle: { color: SERIES[0], borderRadius: [0, 0, 4, 4] },
      },
      {
        name: t("parcours.retard.college"),
        type: "bar",
        stack: "n",
        data: ages.map((a) => a.college),
        // 2 px de surface entre les deux segments empilés
        itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0], borderColor: "#fcfcfb", borderWidth: 2 },
        label: {
          show: true,
          position: "top",
          color: INK,
          fontSize: 11,
          fontWeight: 700,
          formatter: (p: any) => `${ages[p.dataIndex].en_retard_pct} %`,
        },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("parcours.retard.title")} subtitle={t("parcours.retard.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <ReactECharts option={option} style={{ height: 280 }} />
          <p className="mt-2 text-[11px] leading-relaxed text-mut">{t("parcours.retard.definition")}</p>
        </div>
        <div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Stat label={t("parcours.retard.rural")} value={`${data.retard_rural_pct} %`} color={SERIES[0]} />
            <Stat label={t("parcours.retard.urbain")} value={`${data.retard_urbain_pct} %`} color={SERIES[1]} />
          </div>
          <div className="eyebrow mb-2">{t("parcours.retard.par_wilaya")}</div>
          <div className="space-y-1.5">
            {data.par_wilaya.slice(0, 8).map((w) => (
              <div key={w.wilaya} className="flex items-center gap-2 text-[11px]">
                <span className="w-32 shrink-0 truncate text-fg">{w.wilaya}</span>
                <Meter value={w.retard_pct} color={SERIES[0]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------- survie éducative */
function Survie({ data }: { data: ParcoursData["survie"] }) {
  const { t } = useI18n();
  const ec = data.ecarts_college;

  return (
    <Card>
      <SectionTitle title={t("parcours.survie.title")} subtitle={t("parcours.survie.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-2">
          {data.etapes.map((e, i) => (
            <div key={e.palier} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-semibold text-fg">{t(e.palier)}</span>
              <span className="relative h-8 flex-1 overflow-hidden rounded-lg bg-ink/[0.06]">
                <span
                  className="flex h-full items-center justify-end rounded-lg px-2 text-[11px] font-bold text-white"
                  style={{ width: `${e.part_cohorte_pct}%`, background: SERIES[1], opacity: 1 - i * 0.15 }}
                >
                  {e.part_cohorte_pct >= 12 && `${e.part_cohorte_pct.toLocaleString("fr-FR")} %`}
                </span>
                {e.part_cohorte_pct < 12 && (
                  <span className="num absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-fg">
                    {e.part_cohorte_pct.toLocaleString("fr-FR")} %
                  </span>
                )}
              </span>
              <span className="num w-24 shrink-0 text-right text-[11px] text-mut">
                {e.perte_pts !== undefined && (
                  <>
                    −{e.perte_pts.toLocaleString("fr-FR")} {t("unit.pts")}
                  </>
                )}
              </span>
            </div>
          ))}
          <Note>{data.note}</Note>
        </div>

        <div>
          <div className="eyebrow mb-2">{t("parcours.survie.ecarts")}</div>
          <div className="space-y-2.5">
            <Comparaison label={t("parcours.survie.milieu")} a={ec.urbain} b={ec.rural} labelA={t("robustesse.theil.urbain")} labelB={t("robustesse.theil.rural")} />
            <Comparaison label={t("parcours.survie.pauvrete")} a={ec.non_pauvre} b={ec.pauvre} labelA={t("parcours.survie.non_pauvre")} labelB={t("parcours.survie.pauvre")} />
            <Comparaison label={t("parcours.survie.genre")} a={ec.garcons} b={ec.filles} labelA={t("parcours.survie.garcons")} labelB={t("parcours.survie.filles")} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mut">
            {t("parcours.survie.lecture", {
              milieu: (ec.urbain - ec.rural).toFixed(1),
              genre: Math.abs(ec.garcons - ec.filles).toFixed(1),
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Comparaison({ label, a, b, labelA, labelB }: { label: string; a: number; b: number; labelA: string; labelB: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="font-semibold text-fg">{label}</span>
        <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="num text-mut">
          {(a - b).toFixed(1)} pts
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-20 shrink-0 truncate text-mut">{labelA}</span>
        <Meter value={a} color={SERIES[1]} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px]">
        <span className="w-20 shrink-0 truncate text-mut">{labelB}</span>
        <Meter value={b} color={SERIES[0]} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- pyramide (heatmap) */
function Pyramide({ data }: { data: ParcoursData["pyramide"] }) {
  const { t } = useI18n();
  const ordre = data.ordre;

  const cells: [number, number, number][] = [];
  data.par_age.forEach((row, i) => {
    ordre.forEach((p, j) => {
      cells.push([i, j, (row as any)[p] as number]);
    });
  });

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: {
      position: "top",
      ...TOOLTIP,
      formatter: (p: any) =>
        `<b>${t(ordre[p.data[1]])}</b><br/>${t("parcours.retard.ans", {
          n: data.par_age[p.data[0]].age,
        })} : ${p.data[2]} %`,
    },
    grid: { left: 120, right: 16, top: 8, bottom: 56, containLabel: false },
    xAxis: {
      type: "category",
      data: data.par_age.map((r) => r.age),
      ...AXIS,
      name: t("parcours.pyramide.age"),
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: MUT, fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: ordre.map((p) => t(p)),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 10, fontWeight: 600 },
      splitLine: { show: false },
    },
    visualMap: {
      min: 0,
      max: 70,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      // séquentiel : une seule teinte, du clair au foncé
      inRange: { color: ["#f6f3ec", "#d7bb86", "#b5770e", "#6d4708"] },
      textStyle: { color: MUT, fontSize: 10 },
    },
    series: [
      {
        type: "heatmap",
        data: cells,
        itemStyle: { borderColor: "#fcfcfb", borderWidth: 2 },
      },
    ],
  };

  return (
    <Card>
      <SectionTitle title={t("parcours.pyramide.title")} subtitle={t("parcours.pyramide.subtitle")} />
      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          <ReactECharts option={option} style={{ height: 300 }} />
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ cohortes */
function Cohortes({ data }: { data: CohortesData }) {
  const { t } = useI18n();
  const gens = data.nationale.generations;
  const ra = data.rattrapage;

  const option: EChartsOption = {
    ...NO_ANIM,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...TOOLTIP },
    legend: {
      ...LEGEND,
      data: [t("Jamais scolarisé"), t("Traditionnel"), t("Formel")],
    },
    grid: { left: 8, right: 16, top: 12, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: gens.map((g) => t(g.generation)),
      ...AXIS,
      axisLabel: { ...AXIS.axisLabel, fontSize: 11, fontWeight: 600 },
    },
    yAxis: { type: "value", max: 100, ...AXIS, axisLabel: { ...AXIS.axisLabel, formatter: "{value} %" } },
    series: [
      { key: "jamais_scolarise_pct", name: t("Jamais scolarisé"), color: SERIES[0] },
      { key: "traditionnel_pct", name: t("Traditionnel"), color: SERIES[2] },
      { key: "formel_pct", name: t("Formel"), color: SERIES[1] },
    ].map((s, i, arr) => ({
      name: s.name,
      type: "bar" as const,
      stack: "g",
      data: gens.map((g) => (g as any)[s.key] as number),
      itemStyle: {
        color: s.color,
        borderColor: "#fcfcfb",
        borderWidth: 2,
        borderRadius: i === arr.length - 1 ? ([4, 4, 0, 0] as [number, number, number, number]) : 0,
      },
      label: { show: true, color: "#ffffff", fontSize: 10, fontWeight: 700, formatter: "{c} %" },
    })),
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SectionTitle title={t("parcours.cohortes.title")} subtitle={t("parcours.cohortes.subtitle")} />
        <ReactECharts option={option} style={{ height: 280 }} />
        <p className="mt-3 text-[11px] leading-relaxed text-mut">
          {t("parcours.cohortes.lecture", {
            a: gens[0].formel_pct.toLocaleString("fr-FR"),
            b: gens[gens.length - 1].formel_pct.toLocaleString("fr-FR"),
            g: data.nationale.resorption_genre_pts.toLocaleString("fr-FR"),
          })}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-mut">
          {gens.map((g) => (
            <span key={g.generation}>
              <b className="text-fg">{t(g.generation)}</b> · {t("parcours.cohortes.ecart_gf")}{" "}
              <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num text-fg">
                {g.ecart_genre_pts.toLocaleString("fr-FR")} {t("unit.pts")}
              </b>
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("parcours.rattrapage.title")} subtitle={t("parcours.rattrapage.subtitle")} />
        <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-mut">
          <LegendDot color={SERIES[0]} label={t("parcours.rattrapage.insuffisant")} />
          <LegendDot color={SERIES[1]} label={t("parcours.rattrapage.ok")} />
        </div>
        <div className="space-y-1.5">
          {ra.wilayas.map((w) => (
            <div key={w.wilaya} className="flex items-center gap-2 text-[11px]">
              <span className="w-32 shrink-0 truncate font-semibold text-fg">{w.wilaya}</span>
              <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-28 shrink-0 text-mut">
                {w.formel_25_59_pct.toLocaleString("fr-FR")} % → {w.formel_15_24_pct.toLocaleString("fr-FR")} %
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${w.formel_15_24_pct}%`,
                    background: w.rattrapage_insuffisant ? SERIES[0] : SERIES[1],
                  }}
                />
              </span>
              <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-14 text-right text-fg">
                +{w.gain_pts.toLocaleString("fr-FR")}
              </b>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-mut">
          {t("parcours.rattrapage.lecture", {
            n: String(ra.rattrapage_insuffisant.length),
            liste: ra.rattrapage_insuffisant.join(", ") || "—",
            nat: ra.national_15_24_pct.toLocaleString("fr-FR"),
            med: ra.gain_median_pts.toLocaleString("fr-FR"),
          })}
        </p>
      </Card>
    </div>
  );
}
