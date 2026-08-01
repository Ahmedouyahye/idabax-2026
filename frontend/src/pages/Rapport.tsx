import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { fmt, pct, useClusters, useConcentration, useDecomposition, useLogit, useMatrice, useScenarios, useSummary, useTrends, useWilayas, parseTrendSeries } from "../lib/api";
import { Logo } from "../components/ui";
import { PAPER, reportBars, reportDonut, reportHbar, reportLine, reportLorenz, reportScatter, reportScenarios } from "../lib/reportCharts";
import { useI18n } from "../lib/i18n";
import type { EChartsOption } from "echarts";

const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", ar: "ar-MA" };

function today(lang: string) {
  return new Date().toLocaleDateString(LOCALES[lang] ?? "fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function Rapport() {
 const summary = useSummary();
 const wilayas = useWilayas();
 const clusters = useClusters();
 const dec = useDecomposition();
 const conc = useConcentration();
 const logit = useLogit();
  const scen = useScenarios();
  const mat = useMatrice();
  const trends = useTrends();
  const { t, lang } = useI18n();

  const loading = [summary, wilayas, clusters, dec, conc, logit, scen, mat, trends].some((d) => d.loading);
  const errored = [summary, wilayas, clusters, dec, conc, logit, scen, mat, trends].find((d) => d.error);

  const ready = !loading && !errored;
  const n = ready ? summary.data!.national : null;
  const series = trends.data ? parseTrendSeries(trends.data!.series) : [];
  const horsEcole = series.find((s) => s.code === "SE.PRM.UNER.ZS");
  const nette = series.find((s) => s.code === "SE.PRM.NENR");
  const trendSeries = [
    { name: t("rapport.s1.series_hors_ecole"), color: PAPER.gold, yAxisIndex: 0, data: (horsEcole?.points ?? []).filter((p) => p.year >= 2005) },
    { name: t("rapport.s1.series_nette"), color: PAPER.teal, yAxisIndex: 1, data: (nette?.points ?? []).filter((p) => p.year >= 2005) },
  ].filter((s) => s.data.length > 0);

  const quadrantColors: Record<string, string> = {
    effort: PAPER.red,
    viviers: PAPER.teal,
    vigilance: PAPER.muted,
    intensif: PAPER.gold,
  };
  const maxChildren = ready ? Math.max(...mat.data!.scatter.map((p) => p.enfants_hors_ecole)) : 0;
  const scatterPoints = ready
    ? mat.data!.scatter.map((p) => ({
        name: p.wilaya,
        value: [p.volume_log, p.scol_Hors_ecole_formelle] as [number, number],
        size: 9 + (p.enfants_hors_ecole / maxChildren) * 24,
        color: quadrantColors[p.quadrant_id] ?? PAPER.muted,
      }))
    : [];
  const scenarioBars = ready
    ? scen.data!.scenarios.map((s) => ({
        label: t(s.id === "reference" ? "Base" : s.id === "passerelles_25" ? "Passerelles 25 %" : s.id === "passerelles_50" ? "Passerelles 50 %" : "Construction"),
        value: s.enfants_hors_ecole_2030,
        color: s.id === "reference" ? PAPER.muted : s.id === "passerelles_25" ? PAPER.gold : s.id === "passerelles_50" ? PAPER.teal : PAPER.red,
      }))
    : [];

 return (
 <div>
 <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
 <div>
  <div className="eyebrow">{t("rapport.export_badge")}</div>
  <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">{t("rapport.title")}</h1>
  <p className="mt-1 max-w-xl text-sm text-mut">
    {t("rapport.intro")}
  </p>
 </div>
 <button
 onClick={() => window.print()}
 className="rounded-xl bg-gradient-to-r from-accent to-[#e88f3a] px-5 py-2.5 text-sm font-bold text-ink shadow-lg shadow-accent/25 transition-transform hover:scale-[1.02]"
 >
  {t("rapport.download_pdf")}
 </button>
 </div>

 {errored && (
 <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
  {t("app.error.prefix", { msg: errored.error ?? "" })} {t("app.error.api")}
 </div>
 )}

 {loading ? (
  <div className="py-16 text-center text-sm text-mut">{t("rapport.assembling")}</div>
 ) : (
 <div className="sheet font-display text-[#221b12]">
 {/* ================= COUVERTURE ================= */}
 <section className="sheet-page flex flex-col">
 <div className="flex items-center justify-between border-b-2 border-[#15110a]/80 pb-4">
 <div className="flex items-center gap-3">
 <Logo className="h-14 w-14" glow={false} />
 <div>
 <div className="font-display text-2xl font-bold tracking-tight text-[#15110a]">
  EduFocus<span className="text-[#b96a1f]">🌙</span>
 </div>
  <div className="text-[10px] uppercase tracking-[0.22em] text-[#6b5b3f]">{t("rapport.cover.subtitle")}</div>
 </div>
 </div>
              <div className="text-right text-[10px] uppercase tracking-[0.18em] text-[#6b5b3f]">
                {t("rapport.cover.no", { n: "2026-01" })}
                <br />
                {today(lang)}
                <br />
                {t("rapport.cover.team")}
              </div>
 </div>

 <div className="flex flex-1 flex-col justify-center py-16">
  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#1f7a63]">
    {t("rapport.cover.theme")}
  </div>
  <h1 className="font-display text-5xl font-bold leading-[1.1] text-[#15110a] [unicode-bidi:plaintext]">
    {t("home.title.p1")} <br />
    <span className="italic text-[#b96a1f]">{t("home.title.p2")}</span> {t("home.title.p3")}.
  </h1>
  <p className="mt-6 max-w-lg font-inter text-sm leading-relaxed text-[#3d3323]">
    {t("rapport.cover.lead", { n: "375 566" })}
  </p>
 <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
  <CoverStat value="33,1 %" label={t("rapport.cover.stat1")} />
  <CoverStat value="72,1 %" label={t("rapport.cover.stat2")} />
  <CoverStat value="2030" label={t("rapport.cover.stat3")} />
 </div>
 </div>

 <div className="border-t-2 border-[#15110a]/20 pt-3 text-[10px] uppercase tracking-[0.16em] text-[#6b5b3f]">
  {t("rapport.cover.sources")}
 </div>
 </section>

 {/* ================= SYNTHESE ================= */}
 <section className="sheet-page">
  <SectionTitle n="01" title={t("rapport.s1.title")} />
  <p className="mt-3 font-inter text-sm leading-relaxed text-[#3d3323]">
    {t("rapport.s1.lead1")} <b>4,37 millions</b> {t("rapport.s1.lead2")} <b>1 135 657 {t("Enfants 6-14 ans")}</b>{" "}
    {t("rapport.s1.lead3")} <b className="text-[#a3402f]">375 566 {t("Hors école formelle")}</b>{" "}
    {t("rapport.s1.lead4")} <b>{t("Aucune instruction")}</b>
    {t("rapport.s1.lead5")}
  </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <BoxStat value="4 372 038" label={t("Population 2022")} />
              <BoxStat value="1 135 657" label={t("Enfants 6-14 ans")} />
              <BoxStat value="375 566" label={t("Hors école formelle")} />
              <BoxStat value="199 493" label={t("rapport.s1.box_mahadra")} />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-5">
              <div className="col-span-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{t("rapport.s1.donut_title")}</div>
                <Chart
                  option={reportDonut(
                    [
                      { name: "Mahadra (trad. + coranique)", value: n!.enfants_mahadra, color: PAPER.teal },
                      { name: "Aucune instruction", value: n!.enfants_aucune_instruction, color: PAPER.gold },
                    ],
                    t("Hors école formelle"),
                    fmt(n!.enfants_hors_ecole_formelle)
                  )}
                  h={195}
                />
              </div>
              <div className="col-span-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{t("rapport.s1.line_title")}</div>
                {trendSeries.length ? (
                  <Chart option={reportLine(trendSeries)} h={195} />
                ) : (
                  <p className="py-16 text-center text-xs text-[#6b5b3f]">{t("rapport.s1.wdi_unavailable")}</p>
                )}
              </div>
            </div>
  <h3 className="mt-5 font-display text-lg font-bold text-[#15110a]">{t("rapport.s1.messages_title")}</h3>
  <div className="mt-2 space-y-2">
  <Message k="M1" title={t("rapport.s1.m1.title")} text={t("rapport.s1.m1.text")} />
  <Message k="M2" title={t("rapport.s1.m2.title")} text={t("rapport.s1.m2.text")} />
  <Message k="M3" title={t("rapport.s1.m3.title")} text={t("rapport.s1.m3.text")} />
 </div>
  <div className="mt-4 grid grid-cols-3 gap-3">
  <Message k="P1" title="Hodh El Gharbi" text={t("rapport.s1.p1.text", { ipe: "92,2" })} color="text-[#a3402f]" />
  <Message k="P2" title="Hodh Ech Chargui" text={t("rapport.s1.p2.text", { ipe: "86,7", n: "48 740" })} color="text-[#a3402f]" />
  <Message k="P3" title="Assaba" text={t("rapport.s1.p3.text", { ipe: "81,6" })} color="text-[#a3402f]" />
 </div>
 </section>

 {/* ================= CLASSEMENT ================= */}
 <section className="sheet-page">
            <SectionTitle n="02" title={t("rapport.s2.title")} />
  <p className="mt-3 font-inter text-sm leading-relaxed text-[#3d3323]">
    {t("rapport.s2.lead")}
  </p>
  <table className="mt-4 w-full border-collapse text-xs">
  <thead>
  <tr className="border-b-2 border-[#15110a]/70 text-left text-[10px] uppercase tracking-[0.14em] text-[#6b5b3f]">
  <th className="py-1 pr-2 font-bold">{t("rapport.s2.th_rang")}</th>
  <th className="py-1 pr-2 font-bold">{t("strategies.thWilaya")}</th>
  <th className="py-1 pr-2 text-right font-bold">IPE</th>
  <th className="py-1 pr-2 text-right font-bold">{t("strategies.thHorsEcole")}</th>
  <th className="py-1 pr-2 text-right font-bold">{t("rapport.s2.th_taux")}</th>
  <th className="py-1 pr-2 text-right font-bold">{t("strategies.thMahadra")}</th>
  <th className="py-1 pr-2 text-right font-bold">{t("rapport.s2.th_aucune")}</th>
  <th className="py-1.5 text-right font-bold">{t("rapport.s2.th_levier")}</th>
 </tr>
 </thead>
 <tbody>
 {wilayas.data!
 .slice()
 .sort((a, b) => a.rang_ipe - b.rang_ipe)
 .map((w, i) => (
 <tr key={w.wilaya} className={`border-b border-[#15110a]/12 ${i % 2 ? "bg-[#15110a]/[0.025]" : ""}`}>
 <td className="py-0.5 pr-2 font-bold text-[#b96a1f]">{w.rang_ipe}</td>
 <td className="py-0.5 pr-2 font-semibold text-[#15110a]">{w.wilaya}</td>
 <td className="num py-0.5 pr-2 text-right font-bold">{w.ipe.toFixed(1)}</td>
 <td className="num py-0.5 pr-2 text-right">{fmt(w.enfants_hors_ecole)}</td>
 <td className="num py-0.5 pr-2 text-right">{w.scol_Hors_ecole_formelle.toFixed(1)} %</td>
 <td className="num py-0.5 pr-2 text-right">{fmt(w.enfants_mahadra)}</td>
 <td className="num py-0.5 pr-2 text-right">{fmt(w.enfants_aucune_instruction)}</td>
                      <td className="py-0.5 text-right text-xs text-[#1f7a63]">{t(w.levier_action)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="mt-5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{t("rapport.s2.hbar_title")}</div>
              <Chart
                option={reportHbar(
                  wilayas.data!
                    .slice()
                    .sort((a, b) => a.rang_ipe - b.rang_ipe)
                    .map((w) => ({ label: w.wilaya, value: w.ipe, top: w.rang_ipe <= 3 })),
                  100
                )}
                h={195}
              />
            </div>
          </section>

          {/* ================= CONCENTRATION ================= */}
          <section className="sheet-page">
            <SectionTitle n="03" title={t("rapport.s3.title")} />
            <p className="mt-4 font-inter text-sm leading-relaxed text-[#3d3323]">
              {t("rapport.s3.lead1")}{" "}
              <b className="text-[#a3402f]">{t("rapport.s3.lead_bold", { part: pct(conc.data!.top5_share) })}</b>{" "}
              {t("rapport.s3.lead2", { top3: conc.data!.top3_share.toFixed(1), n: conc.data!.n_wilayas_pour_50pct, gini: conc.data!.gini.toFixed(2) })}
            </p>
            <div className="mt-4">
              <Chart option={reportLorenz(conc.data!.lorenz, conc.data!.gini)} h={300} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Message k="Top 1" title={conc.data!.top1} text={t("rapport.s3.top1.text", { n: fmt(conc.data!.classement[0].enfants_hors_ecole), pct: conc.data!.lorenz[0].y.toFixed(1) })} color="text-[#a3402f]" />
              <Message k="Top 5" title={t("rapport.s3.top5.title")} text={t("rapport.s3.top5.text")} />
              <Message k={t("rapport.s3.cible.badge")} title={t("rapport.s3.cible.title", { n: conc.data!.n_wilayas_pour_50pct })} text={t("rapport.s3.cible.text")} />
            </div>
          </section>

 {/* ================= TYPOLOGIE + DECOMPOSITION ================= */}
 <section className="sheet-page">
            <SectionTitle n="04" title={t("rapport.s4.title")} />
  <h3 className="mt-5 font-display text-lg font-bold text-[#15110a]">{t("rapport.s4.profiles_title")}</h3>
 <div className="mt-3 grid grid-cols-3 gap-4">
 {clusters.data!.profiles.map((p) => (
  <div key={p.cluster} className="rounded-lg border border-[#15110a]/20 bg-[#15110a]/[0.03] p-3">
  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{t("home.profil.label", { cluster: p.cluster, taille: p.taille })}</div>
  <div className="mt-1 font-display text-base font-bold text-[#15110a]">{t(p.label)}</div>
  <div className="mt-1 text-xs leading-relaxed text-[#3d3323]">{t(p.levier)}</div>
 <div className="mt-2 text-xs text-[#6b5b3f]">{p.wilayas.join(" · ")}</div>
 </div>
 ))}
 </div>
            <h3 className="mt-8 font-display text-lg font-bold text-[#15110a]">{t("rapport.s4.decomp_title")}</h3>
            <div className="mt-3">
              <Chart
                option={reportBars(
                  [t("rapport.s4.cat_6_9"), t("rapport.s4.cat_10_14"), t("rapport.s4.cat_rural"), t("rapport.s4.cat_urbain"), t("rapport.s4.cat_filles"), t("rapport.s4.cat_garcons")],
                  [
                    { value: dec.data!.national.age_6_9_hors_ecole, color: PAPER.gold },
                    { value: dec.data!.national.age_10_14_hors_ecole, color: "rgba(185,106,31,0.4)" },
                    { value: dec.data!.national.rural_hors_ecole, color: PAPER.teal },
                    { value: dec.data!.national.urbain_hors_ecole, color: "rgba(31,122,99,0.4)" },
                    { value: dec.data!.national.filles_hors_ecole, color: PAPER.red },
                    { value: dec.data!.national.garcons_hors_ecole, color: "rgba(163,64,47,0.4)" },
                  ],
                  33.1
                )}
                h={240}
              />
            </div>
 <p className="mt-4 font-inter text-xs leading-relaxed text-[#6b5b3f]">
    {t("rapport.s4.note")}
 </p>
 </section>

 {/* ================= DETERMINANTS ================= */}
 <section className="sheet-page">
            <SectionTitle n="05" title={t("rapport.s5.title")} />
  <p className="mt-3 font-inter text-sm leading-relaxed text-[#3d3323]">
    {t("rapport.s5.lead", { n: logit.data!.n_children_6_14.toLocaleString("fr-FR"), r2: logit.data!.pseudo_r2.toFixed(2), aic: logit.data!.aic.toFixed(0) })}
  </p>
 <table className="mt-5 w-full border-collapse text-sm">
 <thead>
 <tr className="border-b-2 border-[#15110a]/70 text-left text-[10px] uppercase tracking-[0.14em] text-[#6b5b3f]">
  <th className="py-1 pr-2 font-bold">{t("rapport.s5.th_facteur")}</th>
  <th className="py-1 pr-2 text-right font-bold">OR</th>
  <th className="py-1 pr-2 text-right font-bold">{t("rapport.s5.th_ic")}</th>
  <th className="py-1 pr-2 text-right font-bold">p</th>
  <th className="py-1.5 text-right font-bold">{t("rapport.s5.th_lecture")}</th>
 </tr>
 </thead>
 <tbody>
 {logit.data!.features
 .filter((f) => !f.wilaya)
 .map((f) => (
 <tr key={f.name} className="border-b border-[#15110a]/12">
  <td className="py-0.5 pr-2 font-semibold text-[#15110a]">{t(f.label)}</td>
 <td className="num py-0.5 pr-2 text-right font-bold">{f.odds_ratio.toFixed(2)}</td>
 <td className="num py-0.5 pr-2 text-right">[{f.ci_lo.toFixed(2)} – {f.ci_hi.toFixed(2)}]</td>
 <td className="num py-0.5 pr-2 text-right">{f.pvalue < 0.001 ? "<0.001" : f.pvalue.toFixed(3)}</td>
 <td className="py-0.5 text-right text-xs text-[#1f7a63]">
  {f.odds_ratio >= 1.8 ? t("rapport.s5.risk_high") : f.odds_ratio >= 1.3 ? t("rapport.s5.risk_medium") : t("rapport.s5.risk_low")}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
  <h3 className="mt-7 font-display text-lg font-bold text-[#15110a]">{t("rapport.s5.wilaya_effects", { ref: logit.data!.reference_wilaya })}</h3>
 <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
 {logit.data!.wilayas
 .slice()
 .sort((a, b) => b.odds_ratio - a.odds_ratio)
 .slice(0, 6)
 .map((f) => (
 <div key={f.name} className="rounded-md border border-[#15110a]/15 px-3 py-2">
 <div className="font-bold text-[#15110a]">{f.label}</div>
 <div className="text-[#6b5b3f]">OR {f.odds_ratio.toFixed(2)} · p {f.pvalue < 0.001 ? "<0.001" : f.pvalue.toFixed(3)}</div>
 </div>
 ))}
 </div>
 </section>

 {/* ================= SCENARIOS ================= */}
 <section className="sheet-page">
            <SectionTitle n="06" title={t("rapport.s6.title")} />
  <p className="mt-3 font-inter text-sm leading-relaxed text-[#3d3323]">
    {t("rapport.s6.lead1")} ~<b>{t("rapport.s6.lead_bold", { n: "318 000" })}</b>{" "}
    {t("rapport.s6.lead2")}
  </p>
            <div className="mt-5">
              <Chart option={reportScenarios(scenarioBars, scen.data!.baseline.enfants_hors_ecole_2022)} h={185} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
 {scen.data!.scenarios.map((s) => (
  <div key={s.id} className="rounded-lg border border-[#15110a]/20 bg-[#15110a]/[0.03] p-3">
  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{s.id === "reference" ? t("rapport.s6.card_base") : s.id === "passerelles_25" ? t("rapport.s6.card_cible1") : s.id === "passerelles_50" ? t("rapport.s6.card_cible2") : t("rapport.s6.card_offre")}</div>
  <div className="mt-1 font-display text-base font-bold text-[#15110a]">{t(s.label)}</div>
  <div className="mt-1 text-xs leading-relaxed text-[#3d3323]">{t(s.description)}</div>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="num font-display text-2xl font-bold text-[#15110a]">{fmt(s.enfants_hors_ecole_2030)}</span>
  <span className="text-xs text-[#6b5b3f]">{t("rapport.s6.enfants_taux", { taux: s.taux_2030.toFixed(1) })}</span>
 </div>
 <div className="mt-1 text-xs font-semibold text-[#1f7a63]">
  {s.reduction_enfants_vs_2022 > 0 ? t("rapport.s6.reduction", { n: fmt(s.reduction_enfants_vs_2022) }) : t("rapport.s6.no_reduction")}
 </div>
 </div>
 ))}
 </div>
   <h3 className="mt-4 font-display text-lg font-bold text-[#15110a]">{t("rapport.s6.construction_title")}</h3>
  <table className="mt-2 w-full border-collapse text-xs">
  <thead>
  <tr className="border-b-2 border-[#15110a]/70 text-left text-[10px] uppercase tracking-[0.14em] text-[#6b5b3f]">
   <th className="py-0.5 pr-2 font-bold">{t("strategies.thWilaya")}</th>
   <th className="py-0.5 pr-2 text-right font-bold">{t("strategies.thTaux")}</th>
   <th className="py-0.5 pr-2 text-right font-bold">{t("strategies.thHorsEcole")}</th>
   <th className="py-0.5 pr-2 text-right font-bold">{t("strategies.thMahadra")}</th>
   <th className="py-0.5 pr-2 text-right font-bold">{t("strategies.thEcoles")}</th>
   <th className="py-0.5 pr-2 text-right font-bold">{t("strategies.thEcolesCreer")}</th>
   <th className="py-1 text-right font-bold">{t("rapport.s6.th_cout")}</th>
 </tr>
 </thead>
 <tbody>
 {scen.data!.par_wilaya
 .slice()
 .sort((a, b) => b.ecoles_a_creer - a.ecoles_a_creer)
 .slice(0, 6)
 .map((w) => (
 <tr key={w.wilaya} className="border-b border-[#15110a]/12">
 <td className="py-0.5 pr-2 font-semibold text-[#15110a]">{w.wilaya}</td>
 <td className="num py-0.5 pr-2 text-right">{w.taux_2022.toFixed(1)} %</td>
 <td className="num py-0.5 pr-2 text-right">{fmt(w.enfants_hors_ecole)}</td>
 <td className="num py-0.5 pr-2 text-right">{fmt(w.enfants_mahadra)}</td>
 <td className="num py-0.5 pr-2 text-right">{w.ecoles_pour_1000_enfants.toFixed(2)}</td>
 <td className="num py-0.5 pr-2 text-right font-bold">{w.ecoles_a_creer}</td>
 <td className="num py-0.5 text-right">{fmt(Math.round(w.cout_mro / 1e6))}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </section>

 {/* ================= RECOMMANDATIONS ================= */}
 <section className="sheet-page">
            <SectionTitle n="07" title={t("rapport.s7.title")} />
  <div className="mt-3 space-y-1.5">
  {mat.data!.quadrants.map((q) => (
  <div key={q.id} className="rounded-lg border-l-4 py-2 pl-3 pr-3" style={{ borderColor: q.color, background: "#15110a06" }}>
 <div className="flex items-center justify-between">
  <h3 className="font-display text-base font-bold" style={{ color: q.color }}>{t(q.label)}</h3>
  <span className="text-xs font-semibold text-[#6b5b3f]">{t("rapport.s7.quadrant_meta", { n: fmt(q.enfants_hors_ecole), taille: q.wilayas.length })}</span>
 </div>
  <p className="mt-1 font-inter text-xs leading-relaxed text-[#3d3323]">{t(q.description)}</p>
 <div className="mt-1.5 text-xs font-semibold text-[#6b5b3f]">{q.wilayas.join(" · ")}</div>
 </div>
 ))}
            </div>
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{t("rapport.s7.matrix_title")}</div>
              <Chart
                option={reportScatter(scatterPoints, mat.data!.median_volume_log, mat.data!.median_intensite)}
                h={160}
              />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold text-[#15110a]">{t("rapport.s7.method_title")}</h3>
  <ul className="mt-1 space-y-0 font-inter text-[11px] leading-snug text-[#3d3323]">
  <li><b>EPCV 2019 (ONS)</b> {t("rapport.s7.src1_text")}</li>
  <li><b>Projections ONS/UNFPA 2022</b> {t("rapport.s7.src2_text")}</li>
  <li><b>Banque mondiale WDI</b> {t("rapport.s7.src3_text")}</li>
  <li><b>MLN & OSM</b> {t("rapport.s7.src4_text")}</li>
  <li><b>{t("rapport.s7.src5_name")}</b> {t("rapport.s7.src5_text")}</li>
  <li><b>{t("rapport.s7.src6_name")}</b> {t("rapport.s7.src6_text")}</li>
 </ul>
  <div className="mt-2.5 flex items-end justify-between border-t-2 border-[#15110a]/20 pt-1">
 <div className="flex items-center gap-3">
 <Logo className="h-10 w-10" glow={false} />
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#6b5b3f]">
                  EduFocus🌙 · IndabaX Mauritanie 2026
                  <br />
                  {t("rapport.cover.team")}
                  <br />
                  {t("rapport.footer.tagline")}
                </div>
 </div>
  <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b5b3f]">{today(lang)}</div>
 </div>
 </section>
 </div>
 )}
 </div>
 );
}

function CoverStat({ value, label }: { value: string; label: string }) {
 return (
 <div className="rounded-lg border border-[#15110a]/20 bg-[#15110a]/[0.03] p-4">
 <div className="num font-display text-2xl font-bold text-[#b96a1f]">{value}</div>
 <div className="mt-1 font-inter text-[11px] leading-snug text-[#6b5b3f]">{label}</div>
 </div>
 );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
 return (
 <div className="flex items-center gap-4 border-b-2 border-[#15110a]/70 pb-2">
 <span className="num font-display text-3xl font-bold text-[#b96a1f]/40">{n}</span>
 <h2 className="font-display text-xl font-bold tracking-tight text-[#15110a]">{title}</h2>
 </div>
 );
}

function BoxStat({ value, label }: { value: string; label: string }) {
 return (
 <div className="rounded-lg bg-[#15110a] p-3 text-center">
 <div className="num font-display text-lg font-bold text-[#f4edde]">{value}</div>
 <div className="mt-1 font-inter text-[10px] uppercase tracking-[0.14em] text-[#a19077]">{label}</div>
 </div>
 );
}

function Message({ k, title, text, color = "text-[#15110a]" }: { k: string; title: string; text: string; color?: string }) {
 return (
 <div className="rounded-lg border border-[#15110a]/15 bg-[#15110a]/[0.03] p-3">
 <div className="flex items-baseline gap-3">
 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b96a1f]">{k}</span>
 <span className={`font-display text-base font-bold ${color}`}>{title}</span>
 </div>
 <p className="mt-1 font-inter text-xs leading-relaxed text-[#3d3323]">{text}</p>
 </div>
 );
}

function Chart({ option, h = 240 }: { option: EChartsOption; h?: number }) {
  return (
    <div className="chart-print">
      <ReactECharts option={option} style={{ height: h, width: "100%" }} notMerge />
    </div>
  );
}
