import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { fmt, pct, useClusters, useConcentration, useDecomposition, useLogit, useMatrice, useScenarios, useSummary, useTrends, useWilayas, parseTrendSeries } from "../lib/api";
import { Logo } from "../components/ui";
import { PAPER, reportBars, reportDonut, reportHbar, reportLine, reportLorenz, reportScatter, reportScenarios } from "../lib/reportCharts";
import type { EChartsOption } from "echarts";

function today() {
 return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
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

  const loading = [summary, wilayas, clusters, dec, conc, logit, scen, mat, trends].some((d) => d.loading);
  const errored = [summary, wilayas, clusters, dec, conc, logit, scen, mat, trends].find((d) => d.error);

  const ready = !loading && !errored;
  const n = ready ? summary.data!.national : null;
  const series = trends.data ? parseTrendSeries(trends.data!.series) : [];
  const horsEcole = series.find((s) => s.code === "SE.PRM.UNER.ZS");
  const nette = series.find((s) => s.code === "SE.PRM.NENR");
  const trendSeries = [
    { name: "Hors école primaire (%)", color: PAPER.gold, yAxisIndex: 0, data: (horsEcole?.points ?? []).filter((p) => p.year >= 2005) },
    { name: "Taux net de scolarisation (%)", color: PAPER.teal, yAxisIndex: 1, data: (nette?.points ?? []).filter((p) => p.year >= 2005) },
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
        label: s.id === "reference" ? "Base" : s.id === "passerelles_25" ? "Passerelles 25 %" : s.id === "passerelles_50" ? "Passerelles 50 %" : "Construction",
        value: s.enfants_hors_ecole_2030,
        color: s.id === "reference" ? PAPER.muted : s.id === "passerelles_25" ? PAPER.gold : s.id === "passerelles_50" ? PAPER.teal : PAPER.red,
      }))
    : [];

 return (
 <div>
 <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
 <div>
 <div className="eyebrow">Rapport · Export PDF</div>
 <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">Rapport d'analyse éducative</h1>
 <p className="mt-1 max-w-xl text-sm text-mut">
            Document A4 prêt à imprimer : synthèse, classement, concentration, typologie, déterminants, scénarios et recommandations, illustrés de graphiques. Astuce : « Enregistrer au format PDF » dans la boîte de dialogue.
 </p>
 </div>
 <button
 onClick={() => window.print()}
 className="rounded-xl bg-gradient-to-r from-accent to-[#e88f3a] px-5 py-2.5 text-sm font-bold text-ink shadow-lg shadow-accent/25 transition-transform hover:scale-[1.02]"
 >
 Télécharger en PDF
 </button>
 </div>

 {errored && (
 <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
 Erreur : {errored.error} vérifiez que l'API tourne sur le port 8000.
 </div>
 )}

 {loading ? (
 <div className="py-16 text-center text-sm text-mut">Assemblage du rapport…</div>
 ) : (
 <div className="sheet font-display text-[#221b12]">
 {/* ================= COUVERTURE ================= */}
 <section className="sheet-page flex flex-col">
 <div className="flex items-center justify-between border-b-2 border-[#15110a]/80 pb-4">
 <div className="flex items-center gap-3">
 <Logo className="h-14 w-14" glow={false} />
 <div>
 <div className="font-display text-2xl font-bold tracking-tight text-[#15110a]">
 EduFocus<span className="text-[#b96a1f]">+</span>
 </div>
 <div className="text-[10px] uppercase tracking-[0.22em] text-[#6b5b3f]">Indice de priorité éducative · Mauritanie</div>
 </div>
 </div>
              <div className="text-right text-[10px] uppercase tracking-[0.18em] text-[#6b5b3f]">
                Rapport n° 2026-01
                <br />
                {today()}
                <br />
                Réalisé par l'équipe DataSphere
              </div>
 </div>

 <div className="flex flex-1 flex-col justify-center py-16">
 <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#1f7a63]">
 Hackathon IndabaX Mauritanie 2026 · Thème « Population & Démographie »
 </div>
 <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-[#15110a]">
 Éduquer là où l'enfance
 <br />
 <span className="italic text-[#b96a1f]">exige</span> l'État.
 </h1>
 <p className="mt-6 max-w-lg font-inter text-sm leading-relaxed text-[#3d3323]">
 Qui sont les 375 566 enfants mauritaniens de 6-14 ans hors de l'école formelle ? Où vivent-ils ? Qu'est-ce qui les
 exclut ? Ce rapport traduit l'enquête EPCV 2019 en priorités d'investissement territorialisées des pourcentages
 aux enfants, des enfants aux décisions.
 </p>
 <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
 <CoverStat value="33,1 %" label="des 6-14 ans hors école formelle" />
 <CoverStat value="72,1 %" label="de l'exclusion dans 5 wilayas" />
 <CoverStat value="2030" label="horizon des scénarios d'investissement" />
 </div>
 </div>

 <div className="border-t-2 border-[#15110a]/20 pt-3 text-[10px] uppercase tracking-[0.16em] text-[#6b5b3f]">
 Sources : EPCV 2019 (ONS) · projections ONS/UNFPA 2022 · Banque mondiale WDI · OSM · MLN · data.gov.mr
 </div>
 </section>

 {/* ================= SYNTHESE ================= */}
 <section className="sheet-page">
 <SectionTitle n="01" title="Synthèse exécutive" />
 <p className="mt-4 font-inter text-sm leading-relaxed text-[#3d3323]">
 La Mauritanie est un pays jeune : <b>4,37 millions</b> d'habitants, dont <b>1 135 657 enfants de 6-14 ans</b> (26 %).
 Parmi eux, <b className="text-[#a3402f]">375 566 sont hors de l'école formelle</b> soit 33,1 %. La moitié de ces
 enfants fréquente une mahadra (traditionnelle ou coranique) ; l'autre moitié n'a <b>aucune instruction</b>. Le
 système formel n'absorbe donc qu'un enfant sur deux de la génération scolarisable.
 </p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              <BoxStat value="4 372 038" label="Population 2022" />
              <BoxStat value="1 135 657" label="Enfants 6-14 ans" />
              <BoxStat value="375 566" label="Hors école formelle" />
              <BoxStat value="199 493" label="En mahadra (trad. + coranique)" />
            </div>
            <div className="mt-6 grid grid-cols-5 gap-6">
              <div className="col-span-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">Répartition des exclus</div>
                <Chart
                  option={reportDonut(
                    [
                      { name: "Mahadra (trad. + coranique)", value: n!.enfants_mahadra, color: PAPER.teal },
                      { name: "Aucune instruction", value: n!.enfants_aucune_instruction, color: PAPER.gold },
                    ],
                    "hors école formelle",
                    fmt(n!.enfants_hors_ecole_formelle)
                  )}
                  h={230}
                />
              </div>
              <div className="col-span-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">Recul national du hors école primaire</div>
                {trendSeries.length ? (
                  <Chart option={reportLine(trendSeries)} h={230} />
                ) : (
                  <p className="py-16 text-center text-xs text-[#6b5b3f]">Séries WDI indisponibles.</p>
                )}
              </div>
            </div>
 <h3 className="mt-8 font-display text-lg font-bold text-[#15110a]">Trois messages structurants</h3>
 <div className="mt-3 space-y-3">
 <Message k="M1" title="L'exclusion est géographique, pas sexuée." text="Filles et garçons sont à parité (32 % vs 34 %). En revanche, le rural double l'urbain (42 % vs 21 %) et 5 wilayas concentrent 72 % du problème." />
 <Message k="M2" title="L'âge de 6-9 ans est le point d'entrée." text="44 % des 6-9 ans sont déjà hors école contre 23 % des 10-14 ans : l'échec se joue à l'entrée dans la scolarité, pas à la sortie." />
 <Message k="M3" title="La mahadra est un pont, pas une impasse." text="La moitié des exclus est scolarisée ailleurs qu'à l'école formelle. Convertir ce vivier est le levier le plus rentable à 2030 (−39 % du hors école en convertissant 50 %)." />
 </div>
 <div className="mt-6 grid grid-cols-3 gap-3">
 <Message k="P1" title="Hodh El Gharbi" text="IPE 92,2 priorité maximale : effort massif, volume et taux élevés." color="text-[#a3402f]" />
 <Message k="P2" title="Hodh Ech Chargui" text="IPE 86,7 premier vivier mahadra du pays (48 740 enfants)." color="text-[#a3402f]" />
 <Message k="P3" title="Assaba" text="IPE 81,6 troisième priorité, profil mixte mahadra + aucune instruction." color="text-[#a3402f]" />
 </div>
 </section>

 {/* ================= CLASSEMENT ================= */}
 <section className="sheet-page">
            <SectionTitle n="02" title="Classement : Indice de Priorité Éducative (IPE)" />
 <p className="mt-4 font-inter text-sm leading-relaxed text-[#3d3323]">
 IPE = 40 % × volume (log enfants hors école) + 35 % × intensité (taux hors école) + 25 % × vulnérabilité
 (75 % pauvreté + 25 % dépendance jeunes). Chaque wilaya est associée à un levier d'action dominant.
 </p>
 <table className="mt-5 w-full border-collapse text-sm">
 <thead>
 <tr className="border-b-2 border-[#15110a]/70 text-left text-[10px] uppercase tracking-[0.14em] text-[#6b5b3f]">
 <th className="py-2 pr-3 font-bold">Rang</th>
 <th className="py-2 pr-3 font-bold">Wilaya</th>
 <th className="py-2 pr-3 text-right font-bold">IPE</th>
 <th className="py-2 pr-3 text-right font-bold">Hors école</th>
 <th className="py-2 pr-3 text-right font-bold">Taux</th>
 <th className="py-2 pr-3 text-right font-bold">Mahadra</th>
 <th className="py-2 pr-3 text-right font-bold">Aucune instr.</th>
 <th className="py-2 text-right font-bold">Levier</th>
 </tr>
 </thead>
 <tbody>
 {wilayas.data!
 .slice()
 .sort((a, b) => a.rang_ipe - b.rang_ipe)
 .map((w, i) => (
 <tr key={w.wilaya} className={`border-b border-[#15110a]/12 ${i % 2 ? "bg-[#15110a]/[0.025]" : ""}`}>
 <td className="py-1.5 pr-3 font-bold text-[#b96a1f]">{w.rang_ipe}</td>
 <td className="py-1.5 pr-3 font-semibold text-[#15110a]">{w.wilaya}</td>
 <td className="num py-1.5 pr-3 text-right font-bold">{w.ipe.toFixed(1)}</td>
 <td className="num py-1.5 pr-3 text-right">{fmt(w.enfants_hors_ecole)}</td>
 <td className="num py-1.5 pr-3 text-right">{w.scol_Hors_ecole_formelle.toFixed(1)} %</td>
 <td className="num py-1.5 pr-3 text-right">{fmt(w.enfants_mahadra)}</td>
 <td className="num py-1.5 pr-3 text-right">{fmt(w.enfants_aucune_instruction)}</td>
                      <td className="py-1.5 text-right text-xs text-[#1f7a63]">{w.levier_action}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="mt-5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">Classement visuel de l'IPE</div>
              <Chart
                option={reportHbar(
                  wilayas.data!
                    .slice()
                    .sort((a, b) => a.rang_ipe - b.rang_ipe)
                    .map((w) => ({ label: w.wilaya, value: w.ipe, top: w.rang_ipe <= 3 })),
                  100
                )}
                h={320}
              />
            </div>
          </section>

          {/* ================= CONCENTRATION ================= */}
          <section className="sheet-page">
            <SectionTitle n="03" title="Concentration territoriale" />
            <p className="mt-4 font-inter text-sm leading-relaxed text-[#3d3323]">
              L'exclusion n'est pas diffuse : <b className="text-[#a3402f]">5 wilayas portent {pct(conc.data!.top5_share)}</b> du
              hors école formelle (top 3 : {conc.data!.top3_share.toFixed(1)} %), et {conc.data!.n_wilayas_pour_50pct} wilayas
              suffisent pour atteindre la moitié. La courbe de Lorenz mesure cette inégalité (Gini : {conc.data!.gini.toFixed(2)}).
            </p>
            <div className="mt-4">
              <Chart option={reportLorenz(conc.data!.lorenz, conc.data!.gini)} h={300} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Message k="Top 1" title={conc.data!.top1} text={`${fmt(conc.data!.classement[0].enfants_hors_ecole)} enfants hors école, soit ${conc.data!.lorenz[0].y.toFixed(1)} % du total.`} color="text-[#a3402f]" />
              <Message k="Top 5" title="72,1 % du problème" text="5 wilayas de l'est et du sud : Guidimakha, Hodh El Gharbi, Hodh Ech Chargui, Assaba, Brakna." />
              <Message k="Cible" title={`${conc.data!.n_wilayas_pour_50pct} wilayas = 50 %`} text="La priorisation géographique permet de concentrer l'effort sur un nombre restreint de territoires." />
            </div>
          </section>

 {/* ================= TYPOLOGIE + DECOMPOSITION ================= */}
 <section className="sheet-page">
            <SectionTitle n="04" title="Typologie des wilayas et décomposition de l'exclusion" />
 <h3 className="mt-5 font-display text-lg font-bold text-[#15110a]">Trois profils régionaux (k-moyennes, k = 3)</h3>
 <div className="mt-3 grid grid-cols-3 gap-4">
 {clusters.data!.profiles.map((p) => (
 <div key={p.cluster} className="rounded-lg border border-[#15110a]/20 bg-[#15110a]/[0.03] p-4">
 <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">Profil C{p.cluster} · {p.taille} wilayas</div>
 <div className="mt-1 font-display text-base font-bold text-[#15110a]">{p.label}</div>
 <div className="mt-1 text-xs leading-relaxed text-[#3d3323]">{p.levier}</div>
 <div className="mt-2 text-xs text-[#6b5b3f]">{p.wilayas.join(" · ")}</div>
 </div>
 ))}
 </div>
            <h3 className="mt-8 font-display text-lg font-bold text-[#15110a]">Décomposition des hors école formelle</h3>
            <div className="mt-3">
              <Chart
                option={reportBars(
                  ["6-9 ans", "10-14 ans", "Rural", "Urbain", "Filles", "Garçons"],
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
 Lecture : parmi les exclus du formel, 50,5 % sont en mahadra et 49,5 % n'ont aucune instruction. Le bas âge et la
 ruralité dominent ; le genre est neutre.
 </p>
 </section>

 {/* ================= DETERMINANTS ================= */}
 <section className="sheet-page">
            <SectionTitle n="05" title="Déterminants individuels : régression logistique (EPCV 2019)" />
 <p className="mt-4 font-inter text-sm leading-relaxed text-[#3d3323]">
 Modèle logistique sur {logit.data!.n_children_6_14.toLocaleString("fr-FR")} enfants 6-14 ans (pseudo-R² de
 Nagelkerke : {logit.data!.pseudo_r2.toFixed(2)}, AIC {logit.data!.aic.toFixed(0)}). Les rapports de cotes (OR)
 mesurent la sur-exposition au risque hors école par rapport à la catégorie de référence.
 </p>
 <table className="mt-5 w-full border-collapse text-sm">
 <thead>
 <tr className="border-b-2 border-[#15110a]/70 text-left text-[10px] uppercase tracking-[0.14em] text-[#6b5b3f]">
 <th className="py-2 pr-3 font-bold">Facteur</th>
 <th className="py-2 pr-3 text-right font-bold">OR</th>
 <th className="py-2 pr-3 text-right font-bold">IC 95 %</th>
 <th className="py-2 pr-3 text-right font-bold">p</th>
 <th className="py-2 text-right font-bold">Lecture</th>
 </tr>
 </thead>
 <tbody>
 {logit.data!.features
 .filter((f) => !f.wilaya)
 .map((f) => (
 <tr key={f.name} className="border-b border-[#15110a]/12">
 <td className="py-1.5 pr-3 font-semibold text-[#15110a]">{f.label}</td>
 <td className="num py-1.5 pr-3 text-right font-bold">{f.odds_ratio.toFixed(2)}</td>
 <td className="num py-1.5 pr-3 text-right">[{f.ci_lo.toFixed(2)} – {f.ci_hi.toFixed(2)}]</td>
 <td className="num py-1.5 pr-3 text-right">{f.pvalue < 0.001 ? "<0.001" : f.pvalue.toFixed(3)}</td>
 <td className="py-1.5 text-right text-xs text-[#1f7a63]">
 {f.odds_ratio >= 1.8 ? "risque très accru" : f.odds_ratio >= 1.3 ? "risque accru" : "effet marginal"}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 <h3 className="mt-7 font-display text-lg font-bold text-[#15110a]">Effets wilayas (réf. : {logit.data!.reference_wilaya})</h3>
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
            <SectionTitle n="06" title="Scénarios 2030 : combien d'enfants, à quel coût" />
 <p className="mt-4 font-inter text-sm leading-relaxed text-[#3d3323]">
 La tendance mondiale du hors école primaire (−0,64 pt/an) appliquée à 2022-2030 laisse ~<b>318 000 enfants</b> hors
 école formelle en 2030. Les scénarios testent des réponses politiques. Hypothèses : population 6-14 constante ;
 1 € ≈ 460 MRO ; coût indicatif de 25 M MRO par école (40 élèves).
 </p>
            <div className="mt-5">
              <Chart option={reportScenarios(scenarioBars, scen.data!.baseline.enfants_hors_ecole_2022)} h={260} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
 {scen.data!.scenarios.map((s) => (
 <div key={s.id} className="rounded-lg border border-[#15110a]/20 bg-[#15110a]/[0.03] p-4">
 <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">{s.id === "reference" ? "Base" : s.id === "passerelles_25" ? "Cible 1" : s.id === "passerelles_50" ? "Cible 2" : "Offre"}</div>
 <div className="mt-1 font-display text-base font-bold text-[#15110a]">{s.label}</div>
 <div className="mt-1 text-xs leading-relaxed text-[#3d3323]">{s.description}</div>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="num font-display text-3xl font-bold text-[#15110a]">{fmt(s.enfants_hors_ecole_2030)}</span>
 <span className="text-xs text-[#6b5b3f]">enfants (taux {s.taux_2030.toFixed(1)} %)</span>
 </div>
 <div className="mt-1 text-xs font-semibold text-[#1f7a63]">
 {s.reduction_enfants_vs_2022 > 0 ? `− ${fmt(s.reduction_enfants_vs_2022)} vs 2022` : "pas de réduction"}
 </div>
 </div>
 ))}
 </div>
 <h3 className="mt-7 font-display text-lg font-bold text-[#15110a]">Besoins de construction d'écoles de proximité (top wilayas)</h3>
 <table className="mt-2 w-full border-collapse text-sm">
 <thead>
 <tr className="border-b-2 border-[#15110a]/70 text-left text-[10px] uppercase tracking-[0.14em] text-[#6b5b3f]">
 <th className="py-2 pr-3 font-bold">Wilaya</th>
 <th className="py-2 pr-3 text-right font-bold">Taux 2022</th>
 <th className="py-2 pr-3 text-right font-bold">Enfants hors école</th>
 <th className="py-2 pr-3 text-right font-bold">Mahadra</th>
 <th className="py-2 pr-3 text-right font-bold">Écoles / 1000</th>
 <th className="py-2 pr-3 text-right font-bold">Écoles à créer</th>
 <th className="py-2 text-right font-bold">Coût (M MRO)</th>
 </tr>
 </thead>
 <tbody>
 {scen.data!.par_wilaya
 .slice()
 .sort((a, b) => b.ecoles_a_creer - a.ecoles_a_creer)
 .slice(0, 6)
 .map((w) => (
 <tr key={w.wilaya} className="border-b border-[#15110a]/12">
 <td className="py-1.5 pr-3 font-semibold text-[#15110a]">{w.wilaya}</td>
 <td className="num py-1.5 pr-3 text-right">{w.taux_2022.toFixed(1)} %</td>
 <td className="num py-1.5 pr-3 text-right">{fmt(w.enfants_hors_ecole)}</td>
 <td className="num py-1.5 pr-3 text-right">{fmt(w.enfants_mahadra)}</td>
 <td className="num py-1.5 pr-3 text-right">{w.ecoles_pour_1000_enfants.toFixed(2)}</td>
 <td className="num py-1.5 pr-3 text-right font-bold">{w.ecoles_a_creer}</td>
 <td className="num py-1.5 text-right">{fmt(Math.round(w.cout_mro / 1e6))}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </section>

 {/* ================= RECOMMANDATIONS ================= */}
 <section className="sheet-page">
            <SectionTitle n="07" title="Recommandations : quatre territoires, quatre stratégies" />
 <div className="mt-5 space-y-4">
 {mat.data!.quadrants.map((q) => (
 <div key={q.id} className="rounded-lg border-l-4 p-4" style={{ borderColor: q.color, background: "#15110a06" }}>
 <div className="flex items-center justify-between">
 <h3 className="font-display text-base font-bold" style={{ color: q.color }}>{q.label}</h3>
 <span className="text-xs font-semibold text-[#6b5b3f]">{fmt(q.enfants_hors_ecole)} enfants · {q.wilayas.length} wilayas</span>
 </div>
 <p className="mt-1 font-inter text-sm leading-relaxed text-[#3d3323]">{q.description}</p>
 <div className="mt-1.5 text-xs font-semibold text-[#6b5b3f]">{q.wilayas.join(" · ")}</div>
 </div>
 ))}
            </div>
            <div className="mt-6">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b96a1f]">Matrice volume × intensité (médianes nationales)</div>
              <Chart
                option={reportScatter(scatterPoints, mat.data!.median_volume_log, mat.data!.median_intensite)}
                h={300}
              />
            </div>
            <h3 className="mt-8 font-display text-lg font-bold text-[#15110a]">Méthodologie & sources</h3>
 <ul className="mt-2 space-y-1.5 font-inter text-xs leading-relaxed text-[#3d3323]">
 <li><b>EPCV 2019 (ONS)</b> 60 600 individus, module éducation (statut scolaire, âge, milieu, pauvreté) pour les modèles individuels (logit) et la décomposition.</li>
 <li><b>Projections ONS/UNFPA 2022</b> populations par wilaya (structure par âge 6-14).</li>
 <li><b>Banque mondiale WDI</b> séries 2000-2024 (SE.PRM.UNER.ZS, SE.PRM.NENR, etc.) pour la tendance des scénarios.</li>
 <li><b>MLN & OSM</b> nombre d'établissements par wilaya ; géométries OpenStreetMap.</li>
 <li><b>Modèles</b> IPE pondéré (volume/intensité/vulnérabilité), k-moyennes (silhouette, k=3), corrélations de Pearson, régression logistique (statsmodels), arbres de décision CART pour les règles d'association (support, confiance, lift).</li>
 <li><b>Limites</b> l'EPCV 2019 est la dernière enquête ménages disponible ; les projections 2022 répartissent le total national ; les coûts d'école sont indicatifs (25 M MRO).</li>
 </ul>
 <div className="mt-8 flex items-end justify-between border-t-2 border-[#15110a]/20 pt-4">
 <div className="flex items-center gap-3">
 <Logo className="h-10 w-10" glow={false} />
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#6b5b3f]">
                  EduFocus+ · IndabaX Mauritanie 2026
                  <br />
                  Réalisé par l'équipe DataSphere
                  <br />
                  Les pourcentages aux enfants, les enfants aux décisions.
                </div>
 </div>
 <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b5b3f]">{today()}</div>
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
 <div className="flex items-center gap-4 border-b-2 border-[#15110a]/70 pb-3">
 <span className="num font-display text-4xl font-bold text-[#b96a1f]/40">{n}</span>
 <h2 className="font-display text-2xl font-bold tracking-tight text-[#15110a]">{title}</h2>
 </div>
 );
}

function BoxStat({ value, label }: { value: string; label: string }) {
 return (
 <div className="rounded-lg bg-[#15110a] p-4 text-center">
 <div className="num font-display text-xl font-bold text-[#f4edde]">{value}</div>
 <div className="mt-1 font-inter text-[10px] uppercase tracking-[0.14em] text-[#a19077]">{label}</div>
 </div>
 );
}

function Message({ k, title, text, color = "text-[#15110a]" }: { k: string; title: string; text: string; color?: string }) {
 return (
 <div className="rounded-lg border border-[#15110a]/15 bg-[#15110a]/[0.03] p-4">
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
