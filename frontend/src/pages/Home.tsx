import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useConcentration, useLogit, useSimilarite, useSummary, useWilayas, fmt, pct } from "../lib/api";
import { barRanking, ACCENT } from "../lib/charts";
import { Badge, Card, ErrorBox, Kpi, Loading, Logo } from "../components/ui";
import { Choropleth } from "../components/Choropleth";
import { useI18n } from "../lib/i18n";

export default function Home() {
 const { t } = useI18n();
 const summary = useSummary();
 const wilayas = useWilayas();
 const sim = useSimilarite();
 const conc = useConcentration();
 const logit = useLogit();

 if (summary.error || wilayas.error || sim.error || conc.error || logit.error)
 return <ErrorBox message={summary.error ?? wilayas.error ?? sim.error ?? conc.error ?? logit.error ?? t("home.error")} />;
 if (summary.loading || wilayas.loading || sim.loading || conc.loading || logit.loading)
 return <Loading label={t("home.loading")} />;

 const n = summary.data!.national;
 const ranked = wilayas.data!
 .slice()
 .sort((a, b) => a.rang_ipe - b.rang_ipe)
 .map((w) => ({ wilaya: w.wilaya, value: w.ipe, rang: w.rang_ipe }));

 const determinants = logit.data!.features
 .filter((f) => !f.wilaya)
 .sort((a, b) => b.odds_ratio - a.odds_ratio);

 return (
 <div className="space-y-7">
  {/* Hero */}
  <section className="relative overflow-hidden rounded-3xl border border-line bg-panel/70 p-6 md:p-9">
   <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.05] via-transparent to-accent2/[0.04]" />
   <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
    <div>
     <div className="eyebrow mb-3">{t("home.eyebrow")}</div>
     <h1 className="font-display text-3xl font-semibold leading-[1.12] text-fg md:text-[2.6rem] [unicode-bidi:plaintext]">
      {t("home.title.p1")} <em className="grad-text italic">{t("home.title.p2")}</em> {t("home.title.p3")}
     </h1>
     <p className="mt-3 max-w-xl text-sm leading-relaxed text-mut">
      {t("home.subtitle", { taux: pct(n.taux_hors_ecole_national_pct) })}
     </p>
     <div className="mt-5 flex flex-wrap gap-2">
      <Link to="/carte"><Badge color="bg-accent2/15 text-accent2 hover:bg-accent2/25">{t("home.hero.cta_carte")} →</Badge></Link>
      <Link to="/strategies"><Badge color="bg-accent/15 text-accent hover:bg-accent/25">{t("home.hero.cta_strategies")} →</Badge></Link>
      <Link to="/rapport"><Badge color="bg-ink/[0.06] text-mut hover:text-fg">{t("home.hero.cta_rapport")} →</Badge></Link>
     </div>
     <div className="mt-5 flex flex-wrap items-center gap-2">
      <Badge color="bg-accent2/15 text-accent2">{t("layout.team")}</Badge>
      <Badge color="bg-accent/15 text-accent">{t("home.badgeWilayas")}</Badge>
     </div>
    </div>
    <div className="flex items-center justify-start gap-4 lg:justify-end">
     <div className="hidden sm:block">
      <Logo className="h-20 w-20" />
     </div>
     <div className="grid grid-cols-2 gap-3">
      <HeroStat value={fmt(n.enfants_hors_ecole_formelle)} label={t("Hors école formelle")} accent="text-danger" />
      <HeroStat value={pct(n.taux_hors_ecole_national_pct)} label={t("home.hero.stat_taux")} accent="text-accent" />
      <HeroStat value={String(n.wilayas)} label={t("home.hero.stat_wilayas")} accent="text-accent2" />
      <HeroStat value="2030" label={t("home.hero.stat_horizon")} accent="text-warn" />
     </div>
    </div>
   </div>
  </section>

  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 <Kpi icon="users" label={t("Population 2022")} value={fmt(n.population_totale_2022)} sub={t("home.kpi.popSub")} />
 <Kpi icon="child" label={t("Enfants 6-14 ans")} value={fmt(n.population_6_14_2022)} sub={t("home.kpi.childrenSub")} />
 <Kpi icon="door" label={t("Hors école formelle")} value={fmt(n.enfants_hors_ecole_formelle)} sub={t("home.kpi.horsEcoleSub", { taux: pct(n.taux_hors_ecole_national_pct) })} accent="text-warn" />
 <Kpi icon="book" label={t("Aucune instruction")} value={fmt(n.enfants_aucune_instruction)} sub={t("home.kpi.instruitSub", { n: fmt(n.enfants_mahadra) })} accent="text-danger" />
 </div>

 <Card className="relative overflow-hidden" delay={0.02}>
 <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/[0.05] via-transparent to-accent2/[0.05]" />
 <div className="relative grid gap-6 md:grid-cols-3">
 <Fact
 k={t("home.fact1.k")}
 title={t("home.fact1.title")}
 text={t("home.fact1.text", { part: pct(conc.data!.top5_share), total: fmt(conc.data!.total_enfants_hors_ecole), gini: conc.data!.gini.toFixed(2), n: conc.data!.n_wilayas_pour_50pct })}
 />
 <Fact
 k={t("home.fact2.k")}
 title={t("home.fact2.title")}
 text={t("home.fact2.text", { or1: determinants[0].odds_ratio.toFixed(1), or2: determinants[0].odds_ratio.toFixed(2), p: determinants[0].pvalue.toFixed(4) })}
 />
 <Fact
 k={t("home.fact3.k")}
 title={t("home.fact3.title")}
 text={t("home.fact3.text", { or1: determinants[1]?.odds_ratio.toFixed(2) ?? "", or2: determinants[2]?.odds_ratio.toFixed(2) ?? "" })}
 />
 </div>
 <div className="relative mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
 <Link to="/strategies"><Badge color="bg-accent2/15 text-accent2 hover:bg-accent2/25">{t("home.link.strategies")} →</Badge></Link>
 <Link to="/tendances"><Badge color="bg-accent2/15 text-accent2 hover:bg-accent2/25">{t("nav.tendances")} →</Badge></Link>
 <Link to="/rapport"><Badge color="bg-accent2/15 text-accent2 hover:bg-accent2/25">{t("nav.rapport")} →</Badge></Link>
 </div>
 </Card>

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
 <Card className="xl:col-span-3" delay={0.05}>
 <div className="mb-3 flex items-center justify-between">
 <h2 className="font-display text-base font-semibold text-fg">{t("home.mapTitle")}</h2>
 <Link to="/carte" className="font-grotesk text-xs font-medium text-accent hover:underline">
 {t("home.fullscreen")} →
 </Link>
 </div>
 <Choropleth height={420} />
 </Card>

 <Card className="xl:col-span-2" delay={0.1}>
 <h2 className="font-display text-base font-semibold text-fg">{t("home.ipeTitle")}</h2>
 <ReactECharts
 option={barRanking(ranked, ACCENT)}
 style={{ height: 420 }}
 opts={{ renderer: "canvas" }}
 />
 <p className="mt-3 text-[11px] leading-relaxed text-mut">
 {t("home.ipeFormula1")}
 <Link to="/methodologie" className="text-accent hover:underline">{t("nav.methodologie")}</Link>
 {t("home.ipeFormula2")}
 </p>
 </Card>
 </div>

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
 <Card className="xl:col-span-2" delay={0.15}>
 <h2 className="mb-4 font-display text-base font-semibold text-fg">{t("home.priorityTitle")}</h2>
 <div className="space-y-3">
 {summary.data!.top3_priorite.map((w, i) => (
 <Link key={w.wilaya} to={`/wilayas?w=${encodeURIComponent(w.wilaya)}`} className="block">
 <div className="group flex items-center gap-3 rounded-xl border border-line bg-panel/60 p-3 transition-all hover:border-accent/40 hover:bg-panel2/60">
 <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent2/20 text-sm font-bold text-accent">
 {i + 1}
 </div>
 <div className="min-w-0 flex-1">
 <div className="truncate text-sm font-semibold text-fg">{w.wilaya}</div>
 <div className="text-[11px] text-mut">
 {t("home.top3.text", { n: fmt(w.enfants_hors_ecole), pct: pct(w.scol_Hors_ecole_formelle) })}
 </div>
 </div>
 <Badge color="bg-warn/15 text-warn group-hover:bg-warn/20">{t(w.levier_action)}</Badge>
 </div>
 </Link>
 ))}
 </div>
 </Card>

 <Card className="xl:col-span-3" delay={0.2}>
 <h2 className="mb-4 font-display text-base font-semibold text-fg">{t("home.profilsTitle")}</h2>
 <div className="grid gap-3 sm:grid-cols-3">
 {summary.data!.profils.map((p, i) => (
 <div
 key={p.cluster}
 className={`rounded-xl border p-4 ${
 i === 0
 ? "border-accent2/25 bg-accent2/5"
 : i === 1
 ? "border-accent/25 bg-accent/5"
 : "border-danger/25 bg-danger/5"
 }`}
 >
 <div className="eyebrow">
 {t("home.profil.label", { cluster: p.cluster, taille: p.taille })}
 </div>
 <div className="font-display mt-1.5 text-sm font-semibold leading-snug text-fg">{t(p.label)}</div>
 <div className="mt-2 text-[11px] leading-relaxed text-mut">{t(p.levier)}</div>
 </div>
 ))}
 </div>
 <div className="mt-4 flex flex-wrap gap-2">
 {sim.data!.nodes
 .sort((a, b) => b.enfants_hors_ecole - a.enfants_hors_ecole)
 .slice(0, 8)
 .map((nd) => (
 <Link key={nd.id} to={`/wilayas?w=${encodeURIComponent(nd.wilaya)}`}>
 <Badge color="bg-ink/[0.05] text-mut hover:text-accent">{nd.wilaya}</Badge>
 </Link>
 ))}
  </div>
  </Card>
  </div>

  {/* Download */}
  <section className="relative overflow-hidden rounded-3xl border border-line bg-panel/70 p-6 md:p-8">
   <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-accent2/[0.06] via-transparent to-accent/[0.04]" />
   <div className="relative">
    <div className="mb-4 flex items-center gap-3">
     <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
     </svg>
     <h2 className="font-display text-lg font-semibold text-fg">{t("home.download.title")}</h2>
    </div>
    <p className="mb-5 max-w-lg text-sm leading-relaxed text-mut">
     {t("home.download.subtitle")}
    </p>
    <div className="flex flex-wrap gap-4">
     <a
      href="/downloads/EduFocus_Rapport_Analytique.pdf"
      download
      className="group flex items-center gap-3.5 rounded-xl border border-line bg-panel p-4 transition-all hover:border-accent2/40 hover:bg-panel2"
     >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent2/10 text-accent2">
       <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
       </svg>
      </div>
      <div className="min-w-0">
       <div className="text-sm font-semibold text-fg group-hover:text-accent2">{t("home.download.report")}</div>
       <div className="text-[11px] text-mut">{t("home.download.report_sub")}</div>
      </div>
      <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 shrink-0 text-mut transition-transform group-hover:translate-y-0.5 group-hover:text-accent2" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
       <polyline points="7 10 12 15 17 10" />
       <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
     </a>
     <a
      href="/downloads/EduFocus_Donnees_Source.zip"
      download
      className="group flex items-center gap-3.5 rounded-xl border border-line bg-panel p-4 transition-all hover:border-accent/40 hover:bg-panel2"
     >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
       <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
       </svg>
      </div>
      <div className="min-w-0">
       <div className="text-sm font-semibold text-fg group-hover:text-accent">{t("home.download.data")}</div>
       <div className="text-[11px] text-mut">{t("home.download.data_sub")}</div>
      </div>
      <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 shrink-0 text-mut transition-transform group-hover:translate-y-0.5 group-hover:text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
       <polyline points="7 10 12 15 17 10" />
       <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
     </a>
    </div>
   </div>
  </section>
  </div>
 );
}

function Fact({ k, title, text }: { k: string; title: string; text: string }) {
 return (
 <div className="rounded-xl border border-line bg-panel/50 p-4">
 <div className="eyebrow !text-[10px]">{k}</div>
 <div className="mt-1 font-display text-sm font-semibold leading-snug text-fg">{title}</div>
 <p className="mt-1.5 text-xs leading-relaxed text-mut">{text}</p>
 </div>
 );
}

function HeroStat({ value, label, accent }: { value: string; label: string; accent: string }) {
 return (
 <div className="min-w-[104px] rounded-xl border border-line bg-panel p-3">
 <div
  dir="ltr"
  style={{ unicodeBidi: "isolate" }}
  className={`num font-display text-xl font-bold leading-none ${accent}`}
 >
  {value}
 </div>
 <div className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-mut">{label}</div>
 </div>
 );
}
