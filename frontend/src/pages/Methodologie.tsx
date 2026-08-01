import { Card, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";

export default function Methodologie() {
 const { t } = useI18n();

 const FORMULE = [
  { part: t("methodologie.volume"), weight: "40 %", def: t("methodologie.volume.def"), icon: "⊞" },
  { part: t("methodologie.intensite"), weight: "35 %", def: t("methodologie.intensite.def"), icon: "∿" },
  { part: t("methodologie.vulnerabilite"), weight: "25 %", def: t("methodologie.vulnerabilite.def"), icon: "⚠" },
 ];

 const PIPELINE = [
  { n: "01", t: t("methodologie.step1.t"), d: t("methodologie.step1.d") },
  { n: "02", t: t("methodologie.step2.t"), d: t("methodologie.step2.d") },
  { n: "03", t: t("methodologie.step3.t"), d: t("methodologie.step3.d") },
  { n: "04", t: t("methodologie.step4.t"), d: t("methodologie.step4.d") },
  { n: "05", t: t("methodologie.step5.t"), d: t("methodologie.step5.d") },
  { n: "06", t: t("methodologie.step6.t"), d: t("methodologie.step6.d") },
 ];

 return (
 <div>
 <PageHeader
 title={t("methodologie.title")}
 subtitle={t("methodologie.subtitle")}
 />

 <div className="mb-6 grid gap-3 lg:grid-cols-3">
 {FORMULE.map((f) => (
 <Card key={f.part}>
 <div className="flex items-center justify-between">
 <span className="text-2xl font-black grad-text">{f.icon}</span>
 <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent">{f.weight}</span>
 </div>
 <h3 className="mt-3 text-sm font-bold text-fg">{f.part}</h3>
 <p className="mt-1 text-xs leading-relaxed text-mut">{f.def}</p>
 </Card>
 ))}
 </div>

 <div className="mb-6">
 <h2 className="mb-4 text-sm font-bold text-fg">{t("methodologie.pipeline")}</h2>
 <div className="space-y-3">
 {PIPELINE.map((s, i) => (
 <div key={s.n} className="relative flex gap-4 rounded-2xl border border-line bg-panel p-4">
 {i < PIPELINE.length - 1 && <span className="absolute left-[34px] top-full h-3 w-px bg-line" />}
 <div className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-sm font-black text-accent">{s.n}</div>
 <div>
 <h3 className="text-sm font-bold text-fg">{s.t}</h3>
 <p className="mt-1 text-xs leading-relaxed text-mut">{s.d}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="grid gap-6 lg:grid-cols-2">
 <Card>
 <h2 className="mb-3 text-sm font-bold text-fg">{t("methodologie.choix")}</h2>
 <div className="space-y-3 text-xs leading-relaxed text-mut">
 <P k={t("methodologie.choix1.k")}>{t("methodologie.choix1.text")}</P>
 <P k={t("methodologie.choix2.k")}>{t("methodologie.choix2.text")}</P>
 <P k={t("methodologie.choix3.k")}>{t("methodologie.choix3.text")}</P>
 <P k={t("methodologie.choix4.k")}>{t("methodologie.choix4.text")}</P>
 </div>
 </Card>
 <Card>
 <h2 className="mb-3 text-sm font-bold text-fg">{t("methodologie.sources")}</h2>
 <div className="space-y-3">
 <Src name="EPCV 2019" org={t("methodologie.src_epcv.org")} type={t("methodologie.src_epcv.type")} link="catalog ANADRIM RGPH5" />
 <Src name={t("methodologie.src_pop.title")} org="ONS / HDX (COD-PS Mauritanie)" type={t("methodologie.src_pop.type")} link="HDX : b228e130-8703-4126-8dfd-547124dca6fc" />
 <Src name={t("methodologie.src_admin.title")} org="HDX COD-AB" type={t("methodologie.src_admin.type")} link="HDX Mauritania admin" />
 <Src name={t("methodologie.src_etab.title")} org="OpenStreetMap (HOTOSM)" type={t("methodologie.src_etab.type")} link="geo.osm.org" />
 <Src name={t("methodologie.src_wdi.title")} org={t("methodologie.src_wdi.org")} type={t("methodologie.src_wdi.type")} link="data.worldbank.org" />
 </div>
 </Card>
 </div>
 </div>
 );
}

function P({ k, children }: { k: string; children: React.ReactNode }) {
 return (
 <div className="rounded-xl bg-white/[0.03] p-3">
 <div className="text-xs font-bold text-accent">{k}</div>
 <div className="mt-1 text-xs leading-relaxed text-mut">{children}</div>
 </div>
 );
}

function Src({ name, org, type, link }: { name: string; org: string; type: string; link: string }) {
 return (
 <div className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] p-3">
 <div>
 <div className="text-xs font-bold text-fg">{name}</div>
 <div className="text-[11px] text-mut">{org}</div>
 <div className="text-[10px] text-mut">{type}</div>
 </div>
 <span className="num shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] text-accent">{link}</span>
 </div>
 );
}
