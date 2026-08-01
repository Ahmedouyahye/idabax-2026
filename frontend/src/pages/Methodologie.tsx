import { Card, PageHeader } from "../components/ui";

const FORMULE = [
 { part: "Volume", weight: "40 %", def: "Log du nombre d'enfants 6-14 ans hors école formelle (2019) projeté sur la population 2022.", icon: "⊞" },
 { part: "Intensité", weight: "35 %", def: "Part des 6-14 ans hors école formelle (formel exclu, mahadra et aucune instruction incluses).", icon: "∿" },
 { part: "Vulnérabilité", weight: "25 %", def: "0.75 × taux de pauvreté + 0.25 × ratio de dépendance des jeunes (0-14 / 15-64).", icon: "⚠" },
];

const PIPELINE = [
 { n: "01", t: "Microdonnées EPCV 2019", d: "60 600 individus (SPSS) enquête ménages de l'ONS. Codage : situation scolaire, milieu, wilaya, pauvreté, sexe, âge." },
 { n: "02", t: "Projection démographique", d: "Échantillon pondéré et projeté sur la population wilaya par wilaya (2022, HDX / ONS) pour passer des pourcentages aux effectifs." },
 { n: "03", t: "Indice de Priorité Éducative (IPE)", d: "Score 0-100 par wilaya : prioriser là où il y a beaucoup ET une forte proportion d'enfants exclus, dans un contexte vulnérable." },
 { n: "04", t: "Typologie (clustering)", d: "k-moyennes normalisées (k=3) : trois mécanismes d'exclusion distincts, chacun avec son levier d'action." },
 { n: "05", t: "Graphes", d: "Similarité entre wilayas (top-2 voisins, r≥0.85) et réseau de corrélations entre indicateurs (|r|≥0.75)." },
 { n: "06", t: "Règles d'association", d: "Apriori sur les 16 451 enfants 6-14 ans : combinaisons de facteurs menant à l'exclusion (lift > 1.05)." },
];

export default function Methodologie() {
 return (
 <div>
 <PageHeader
 title="Méthodologie"
 subtitle="De la microdonnée SPSS à la décision : un pipeline transparent, reproductible, en open data."
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
 <h2 className="mb-4 text-sm font-bold text-fg">Le pipeline</h2>
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
 <h2 className="mb-3 text-sm font-bold text-fg">Choix méthodologiques</h2>
 <div className="space-y-3 text-xs leading-relaxed text-mut">
 <P k="Un seul type d'école formelle">La catégorie officielle « Coranique » (C4N=2) est agrégée à la mahadra conforme au référentiel EduFocus. Un enfant en mahadra est « hors école formelle » mais instruit : l'effort porte sur les passerelles, pas l'alphabétisation.</P>
 <P k="Pondération 2019 → 2022">Les parts de l'EPCV 2019 sont appliquées aux pyramides 2022 par wilaya : les pourcentages deviennent des effectifs budgétables.</P>
 <P k="Normalisation min-max">Chaque composante de l'IPE est normalisée 0-100 avant pondération, pour rendre les trois dimensions comparables.</P>
 <P k="Clusters interprétables">k retenu par silhouette (k=3 : 0.331) pour un équilibre entre lisibilité statistique et richesse des profils.</P>
 </div>
 </Card>
 <Card>
 <h2 className="mb-3 text-sm font-bold text-fg">Sources des données</h2>
 <div className="space-y-3">
 <Src name="EPCV 2019" org="ONS Mauritanie Enquête Permanente sur les Conditions de Vie" type="microdonnées ménages (SPSS)" link="catalog ANADRIM RGPH5" />
 <Src name="Population 2022 par wilaya" org="ONS / HDX (COD-PS Mauritanie)" type="projections démographiques" link="HDX : b228e130-8703-4126-8dfd-547124dca6fc" />
 <Src name="Découpage administratif" org="HDX COD-AB" type="GeoJSON des 15 wilayas" link="HDX Mauritania admin" />
 <Src name="Établissements scolaires" org="OpenStreetMap (HOTOSM)" type="646 points éducation" link="geo.osm.org" />
 <Src name="Indicateurs nationaux" org="Banque mondiale (WDI)" type="23 indicateurs, 1990-2023" link="data.worldbank.org" />
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
