import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { useClusters, useWilayas, fmt, pct } from "../lib/api";
import { donut, radar } from "../lib/charts";
import { Badge, Card, ErrorBox, Loading, PageHeader } from "../components/ui";

const EDU_COLORS: Record<string, string> = {
 Formel: "#4ec3a3",
 "Mahadra / Coranique": "#eeb74f",
 "Aucune instruction": "#ef6f5f",
};

export default function Wilayas() {
 const { t } = useI18n();
 const wilayas = useWilayas();
 const clusters = useClusters();
 const [params, setParams] = useSearchParams();
 const selected = params.get("w") ?? "";

 const sorted = useMemo(
 () => (wilayas.data ? [...wilayas.data].sort((a, b) => a.rang_ipe - b.rang_ipe) : []),
 [wilayas.data]
 );

 const w = useMemo(() => wilayas.data?.find((x) => x.wilaya === selected) ?? null, [wilayas.data, selected]);
 const clusterInfo = clusters.data?.profiles.find((c) => c.cluster === w?.cluster);

 useEffect(() => {
 if (!selected && sorted.length > 0) setParams({ w: sorted[0].wilaya }, { replace: true });
 }, [selected, sorted, setParams]);

 if (wilayas.error || clusters.error) return <ErrorBox message={wilayas.error ?? clusters.error ?? t("wilayas.erreur")} />;
 if (wilayas.loading || clusters.loading) return <Loading label={t("wilayas.loading")} />;

 return (
 <div>
 <PageHeader
 eyebrow={t("wilayas.eyebrow")}
 title={t("wilayas.title")}
 subtitle={t("wilayas.subtitle")}
 />

 <div className="mb-5 flex flex-wrap gap-2">
 {sorted.map((x) => (
 <button
 key={x.wilaya}
 onClick={() => setParams({ w: x.wilaya })}
 className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
 selected === x.wilaya
 ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(45,212,191,0.3)]"
 : "bg-white/5 text-mut hover:bg-white/10 hover:text-fg"
 }`}
 >
 <span className="num mr-1.5 text-[10px] opacity-70">#{x.rang_ipe}</span>
 {x.wilaya}
 </button>
 ))}
 </div>

 {w ? (
 <div className="space-y-6">
 <div className="grid gap-6 lg:grid-cols-3">
 <Card className="lg:col-span-1">
 <div className="flex items-start justify-between">
 <div>
 <div className="text-[11px] font-semibold uppercase tracking-wider text-mut">{t("wilayas.rang_ipe")}</div>
 <div className="num mt-1 text-4xl font-black grad-text">#{w.rang_ipe}</div>
 <div className="num mt-1 text-sm text-mut">{t("wilayas.ipe")} {w.ipe.toLocaleString("fr-FR")}</div>
 </div>
 <Badge color={w.rang_ipe <= 5 ? "bg-danger/15 text-danger" : w.rang_ipe <= 8 ? "bg-warn/15 text-warn" : "bg-accent2/15 text-accent2"}>
 {w.rang_ipe <= 5 ? t("wilayas.priorite_haute") : w.rang_ipe <= 8 ? t("wilayas.priorite_moyenne") : t("wilayas.priorite_maitrisee")}
 </Badge>
 </div>
 <div className="mt-4 space-y-2 text-sm">
 <Row k={t("wilayas.pop")} v={fmt(w.population_2022)} />
 <Row k={t("wilayas.enfants_6_14")} v={fmt(w.pop_6_14_2022)} />
 <Row k={t("wilayas.hors_ecole_formelle")} v={`${fmt(w.enfants_hors_ecole)} ${t("wilayas.enfants")}`} strong />
 <Row k={t("wilayas.pauvrete")} v={pct(w.taux_pauvrete)} />
 <Row k={t("wilayas.milieu_rural")} v={pct(w.part_rurale)} />
 <Row k={t("wilayas.dependance_jeunes")} v={`${w.ratio_dependance_jeunes} / 100 ${t("wilayas.actifs")}`} />
 <Row k={t("wilayas.etablissements")} v={`${w.nb_etablissements} (${w.ecoles_pour_1000_enfants}/1000 ${t("wilayas.enf_abbr")})`} />
 </div>
 <div className="mt-4 rounded-xl border border-warn/25 bg-warn/10 p-3">
 <div className="text-[11px] font-semibold uppercase tracking-wider text-warn">{t("wilayas.levier_action")}</div>
 <div className="mt-1 text-sm font-bold text-fg">{t(w.levier_action)}</div>
 </div>
 {clusterInfo && (
 <div className="mt-3 rounded-xl border border-accent/25 bg-accent/10 p-3">
 <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
 {t("wilayas.profil")} C{w.cluster} · {clusterInfo.taille} {t("wilayas.wilayas")}
 </div>
 <div className="mt-1 text-sm font-bold text-fg">{t(clusterInfo.label)}</div>
 </div>
 )}
 </Card>

 <Card className="lg:col-span-1">
 <h2 className="mb-1 font-display text-base font-semibold text-fg">{t("wilayas.situation_scolaire")}</h2>
 <p className="mb-2 text-[11px] text-mut">
 {t("wilayas.situation_desc")}
 </p>
 <ReactECharts
 option={donut(
 [
 { name: t("Formel"), value: w.scol_Formel, color: EDU_COLORS.Formel },
 { name: t("Mahadra / Coranique"), value: w.scol_Mahadra_trad, color: EDU_COLORS["Mahadra / Coranique"] },
 { name: t("Aucune instruction"), value: w["scol_Aucune instruction"], color: EDU_COLORS["Aucune instruction"] },
 ],
 t("wilayas.hors_formel"),
 pct(w.scol_Hors_ecole_formelle)
 )}
 style={{ height: 300 }}
 />
 <div className="mt-2 space-y-1.5">
 {(
 [
 ["Formel", w.scol_Formel],
 ["Mahadra / Coranique", w.scol_Mahadra_trad],
 ["Aucune instruction", w["scol_Aucune instruction"]],
 ] as [string, number][]
 ).map(([k, v]) => (
 <div key={k} className="flex items-center gap-2 text-xs">
 <span className="h-2.5 w-2.5 rounded-full" style={{ background: EDU_COLORS[k] }} />
 <span className="text-mut">{t(k)}</span>
 <span className="num ml-auto font-semibold">{pct(v)}</span>
 </div>
 ))}
 </div>
 </Card>

 <Card className="lg:col-span-1">
 <h2 className="mb-1 font-display text-base font-semibold text-fg">{t("wilayas.profil_multidim")}</h2>
 <p className="mb-2 text-[11px] text-mut">{t("wilayas.profil_desc")}</p>
 <ReactECharts
 option={radar(
 [
 { name: t("wilayas.radar_hors_ecole"), max: 100 },
 { name: t("wilayas.radar_pauvrete"), max: 100 },
 { name: t("wilayas.radar_ruralite"), max: 100 },
 { name: t("wilayas.radar_dependance"), max: 130 },
 { name: t("wilayas.radar_ecart_genre"), max: 40 },
 ],
 [
 w.scol_Hors_ecole_formelle,
 w.taux_pauvrete,
 w.part_rurale,
 w.ratio_dependance_jeunes,
 Math.abs(w.ecart_genre_hors_ecole),
 ],
 "#eeb74f"
 )}
 style={{ height: 300 }}
 />
 <div className="mt-2 rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed text-mut">
 {t("wilayas.ecart_genre")}{" "}
 <span className={w.ecart_genre_hors_ecole > 0 ? "font-semibold text-accent" : "font-semibold text-warn"}>
 {w.ecart_genre_hors_ecole > 0 ? t("wilayas.garcons_exclus") : t("wilayas.filles_exclues")} {t("wilayas.de_pts", { n: Math.abs(w.ecart_genre_hors_ecole) })}
 </span>
 {t("wilayas.fracture")}
 </div>
 </Card>
 </div>

 <div className="grid gap-6 lg:grid-cols-3">
 <Card>
 <h2 className="mb-3 font-display text-base font-semibold text-fg">{t("wilayas.ipe_composition")}</h2>
 <div className="space-y-4">
 <BarPart label={t("wilayas.volume")} value={w.volume_norm} color="#eeb74f" hint={t("wilayas.volume_hint")} />
 <BarPart label={t("wilayas.intensite")} value={w.intensite_norm} color="#ef9460" hint={t("wilayas.intensite_hint")} />
 <BarPart label={t("wilayas.vulnerabilite")} value={w.vulnerabilite_norm} color="#4ec3a3" hint={t("wilayas.vulnerabilite_hint")} />
 </div>
 </Card>
 <Card>
 <h2 className="mb-3 font-display text-base font-semibold text-fg">{t("wilayas.composition_urbain_rural")}</h2>
 <div className="grid grid-cols-2 gap-3 text-center">
 <MiniStat label={t("wilayas.formel_urbain")} value={pct(w.scol_urbain_Formel)} />
 <MiniStat label={t("wilayas.formel_rural")} value={pct(w.scol_rural_Formel)} />
 <MiniStat label={t("wilayas.hors_ecole_urbain")} value={pct(w.scol_urbain_Hors_ecole_formelle)} accent="text-warn" />
 <MiniStat label={t("wilayas.hors_ecole_rural")} value={pct(w.scol_rural_Hors_ecole_formelle)} accent="text-danger" />
 </div>
 <p className="mt-3 text-[11px] leading-relaxed text-mut">
 {t("wilayas.ecart_urbain_rural")}
 </p>
 </Card>
 <Card>
 <h2 className="mb-3 font-display text-base font-semibold text-fg">{t("wilayas.effectifs")}</h2>
 <div className="space-y-2">
 <Row k={t("wilayas.enfants_hors_ecole_formelle")} v={fmt(w.enfants_hors_ecole)} strong />
 <Row k={t("wilayas.dont_mahadra")} v={fmt(w.enfants_mahadra)} />
 <Row k={t("wilayas.dont_aucune")} v={fmt(w.enfants_aucune_instruction)} />
 <Row k={t("wilayas.pop_couverte")} v={fmt(Math.round((w.scol_Formel / 100) * w.pop_6_14_2022))} />
 </div>
 <p className="mt-3 rounded-xl bg-accent/10 p-3 text-[11px] leading-relaxed text-accent">
 {t("wilayas.quote_effectifs")}
 </p>
 </Card>
 </div>
 </div>
 ) : (
 <Loading label={t("wilayas.select")} />
 )}
 </div>
 );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
 return (
 <div className="flex items-center justify-between border-b border-line/60 pb-1.5 last:border-0">
 <span className="text-xs text-mut">{k}</span>
 <span className={`num text-xs font-semibold ${strong ? "text-warn" : "text-fg"}`}>{v}</span>
 </div>
 );
}

function BarPart({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
 return (
 <div>
 <div className="mb-1 flex items-baseline justify-between">
 <span className="text-xs font-semibold text-fg">{label}</span>
 <span className="num text-xs" style={{ color }}>{value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>
 </div>
 <div className="h-2 overflow-hidden rounded-full bg-white/5">
 <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, opacity: 0.85 }} />
 </div>
 <div className="mt-0.5 text-[10px] text-mut">{hint}</div>
 </div>
 );
}

function MiniStat({ label, value, accent = "text-fg" }: { label: string; value: string; accent?: string }) {
 return (
 <div className="rounded-xl bg-white/[0.03] p-3">
 <div className="text-[10px] uppercase tracking-wider text-mut">{label}</div>
 <div className={`num mt-1 text-lg font-bold ${accent}`}>{value}</div>
 </div>
 );
}
