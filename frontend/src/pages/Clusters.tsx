import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useClusters, pct } from "../lib/api";
import type { EChartsOption } from "echarts";
import { Badge, Card, ErrorBox, Loading, PageHeader } from "../components/ui";

const COLORS = ["#4ec3a3", "#eeb74f", "#ef6f5f"];

export default function Clusters() {
 const clusters = useClusters();

 if (clusters.error) return <ErrorBox message={clusters.error} />;
 if (clusters.loading || !clusters.data) return <Loading label="Typologie des wilayas…" />;

 const profiles = clusters.data.profiles;
 const wl = clusters.data.wilayas;

 const bar: EChartsOption = {
 tooltip: { trigger: "axis", backgroundColor: "#101a30", borderColor: "rgba(148,163,184,0.25)", textStyle: { color: "#e2e8f0" } },
 legend: { textStyle: { color: "#8ea0bd", fontSize: 11 }, top: 0 },
 grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
 xAxis: { type: "category", axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } }, axisLabel: { color: "#8ea0bd", fontSize: 11 } },
 yAxis: { type: "value", axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } }, axisLabel: { color: "#8ea0bd", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } },
 series: [
 {
 name: "Hors école",
 type: "bar",
 barWidth: 14,
 data: profiles.map((p, i) => ({ value: +p.hors_ecole_moyen_pct.toFixed(1), itemStyle: { color: COLORS[i] } })),
 },
 {
 name: "Mahadra / coranique",
 type: "bar",
 barWidth: 14,
 data: profiles.map((p, i) => ({ value: +p.mahadra_moyen_pct.toFixed(1), itemStyle: { color: COLORS[i], opacity: 0.5 } })),
 },
 {
 name: "Aucune instruction",
 type: "bar",
 barWidth: 14,
 data: profiles.map((p, i) => ({ value: +p.aucune_instruction_moyen_pct.toFixed(1), itemStyle: { color: COLORS[i], opacity: 0.22 } })),
 },
 {
 name: "Hors école total",
 type: "bar",
 barWidth: 14,
 data: profiles.map((p, i) => ({ value: +p.hors_ecole_moyen_pct.toFixed(1), itemStyle: { color: COLORS[i], opacity: 0.8 } })),
 },
 ],
 };

 return (
 <div>
 <PageHeader
 eyebrow="Typologie des wilayas"
 title="Typologie : 3 Mauritanie scolaires"
 subtitle={`Classification ascendante hiérarchique (k-moyennes, k=${clusters.data.k}) sur 13 wilayas. Les wilayas se regroupent non par géographie, mais par mécanisme d'exclusion.`}
 />

 <div className="mb-6 grid gap-6 lg:grid-cols-3">
 {profiles.map((p, i) => (
 <Card key={p.cluster} className="relative overflow-hidden">
 <div className="absolute inset-x-0 top-0 h-1" style={{ background: COLORS[i] }} />
 <div className="flex items-center justify-between">
 <Badge color={`text-${["accent", "warn", "danger"][i]}`}>Profil C{p.cluster}</Badge>
 <span className="text-[11px] text-mut">{p.taille} wilayas</span>
 </div>
 <h3 className="mt-3 text-base font-extrabold text-fg">{p.label}</h3>
 <p className="mt-2 text-xs leading-relaxed text-mut">
 {i === 0 &&
 "Exclusion résiduelle et urbaine : le formel est la norme, il ne reste qu'à consolider et suivre."}
 {i === 1 &&
 "L'exclusion passe d'abord par l'éducation traditionnelle (mahadra) : le problème n'est pas un manque d'école mais l'absence de passerelle vers le formel."}
 {i === 2 &&
 "L'exclusion massive des enfants 'sans aucune instruction' appelle une construction d'écoles de proximité."}
 </p>
 <div className="mt-4 grid grid-cols-2 gap-2 text-center">
 <MStat label="Hors école" v={pct(p.hors_ecole_moyen_pct)} />
 <MStat label="Pauvreté" v={pct(p.pauvrete_moyen_pct)} />
 <MStat label="Ruralité" v={pct(p.ruralite_moyen_pct)} />
 <MStat label="Dépendance jeunes" v={`${p.dependance_jeunes_moyen} /100`} />
 </div>
 <div className="mt-4 rounded-xl bg-accent/10 p-3">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">Levier recommandé</div>
 <div className="mt-0.5 text-sm font-bold text-fg">{p.levier}</div>
 </div>
 <div className="mt-3 flex flex-wrap gap-1.5">
 {p.wilayas.map((w) => (
 <span key={w} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-fg">
 {w}
 </span>
 ))}
 </div>
 </Card>
 ))}
 </div>

 <div className="grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="mb-1 font-display text-base font-semibold text-fg">Signature de chaque profil</h2>
 <p className="mb-3 text-[11px] text-mut">Part moyenne de la population 6-14 ans selon le type d'instruction.</p>
 <ReactECharts option={bar} style={{ height: 320 }} />
 </Card>
 <Card>
 <h2 className="mb-1 font-display text-base font-semibold text-fg">Qualité de la partition</h2>
 <p className="mb-3 text-[11px] text-mut">Silhouette moyenne des k-moyennes.</p>
 <div className="flex items-center gap-4">
 <div className="num text-5xl font-black grad-text">{clusters.data.silhouette.toFixed(2)}</div>
 <div className="max-w-56 text-xs leading-relaxed text-mut">
 {clusters.data.silhouette >= 0.33 ? "Structure lisible" : "Structure partielle"}{" "}
 les profils se distinguent nettement sur le type d'exclusion mais restent poreux sur la pauvreté, présente dans tous les groupes.
 </div>
 </div>
 <h3 className="mt-6 mb-2 font-display text-base font-semibold text-fg">Affectation détaillée</h3>
 <div className="space-y-1.5">
 {[...wl].sort((a, b) => a.cluster - b.cluster || a.rang_ipe - b.rang_ipe).map((w) => (
 <div key={w.wilaya} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
 <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[w.cluster] }} />
 <span className="font-semibold text-fg">{w.wilaya}</span>
 <span className="ml-auto text-mut">
 IPE <span className="num">{w.ipe.toLocaleString("fr-FR")}</span> · rang{" "}
 <span className="num">#{w.rang_ipe}</span>
 </span>
 </div>
 ))}
 </div>
 </Card>
 </div>
 </div>
 );
}

function MStat({ label, v }: { label: string; v: string }) {
 return (
 <div className="rounded-xl bg-white/[0.03] p-2.5">
 <div className="text-[10px] uppercase tracking-wider text-mut">{label}</div>
 <div className="num mt-0.5 text-sm font-bold text-fg">{v}</div>
 </div>
 );
}
