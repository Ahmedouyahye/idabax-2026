import ReactECharts from "echarts-for-react";
import { useCorrelations, useSimilarite } from "../lib/api";
import { forceGraph } from "../lib/charts";
import { Badge, Card, ErrorBox, Loading, PageHeader } from "../components/ui";

const CLUSTER_COLORS = ["#4ec3a3", "#eeb74f", "#ef6f5f"];

export default function Reseau() {
 const sim = useSimilarite();
 const corr = useCorrelations();

 if (sim.error || corr.error) return <ErrorBox message={sim.error ?? corr.error ?? "erreur"} />;
 if (sim.loading || corr.loading) return <Loading label="Construction des graphes…" />;

 const similarite = sim.data!;
 const correlations = corr.data!;

 const simGraph = forceGraph(
 similarite.nodes.map((n) => ({
 id: n.id,
 label: n.wilaya,
 value: n.enfants_hors_ecole ? Math.min(1, n.enfants_hors_ecole / 70000) : 0.3,
 category: n.cluster,
 })),
 similarite.edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
 [{ name: "C0 Universal" }, { name: "C1 Mahadra" }, { name: "C2 Aucune instruction" }]
 );

 const corrGraph = forceGraph(
 correlations.nodes.map((n) => ({ id: n.id, label: n.label, value: n.taille / 25, category: 0 })),
 correlations.edges.map((e) => ({ source: e.source, target: e.target, weight: Math.abs(e.r) })),
 [{ name: "Indicateurs" }]
 );

 return (
 <div>
 <PageHeader
 eyebrow="Analyse de réseau"
 title="Analyse de réseau"
 subtitle="Deux graphes complémentaires : la similarité entre wilayas (qui se ressemble-t-il) et les corrélations entre indicateurs (ce qui explique l'exclusion)."
 />

 <div className="grid gap-6 lg:grid-cols-2">
 <Card>
 <div className="flex items-center justify-between">
 <h2 className="font-display text-base font-semibold text-fg">Similarité entre wilayas</h2>
 <Badge color="bg-accent/15 text-accent">{similarite.n_communities} communautés</Badge>
 </div>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Chaque wilaya est reliée à ses 2 plus proches voisines (corrélation r ≥ 0.85 sur l'ensemble des indicateurs). La couleur = profil de la typologie.
 </p>
 <ReactECharts option={simGraph} style={{ height: 520 }} />
 </Card>

 <Card>
 <h2 className="font-display text-base font-semibold text-fg">Corrélations entre indicateurs</h2>
 <p className="mt-1 mb-2 text-[11px] text-mut">
 Arêtes |r| ≥ 0.75 entre 12 indicateurs. Le graphe révèle les déterminants structurels de l'exclusion.
 </p>
 <ReactECharts option={corrGraph} style={{ height: 520 }} />
 </Card>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <Card>
 <h3 className="mb-3 font-display text-base font-semibold text-fg">Liens les plus forts entre wilayas</h3>
 <div className="space-y-1.5">
 {[...similarite.edges].sort((a, b) => b.weight - a.weight).map((e, i) => (
 <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
 <span className="font-semibold text-fg">{e.source}</span>
 <span className="text-mut">↔</span>
 <span className="font-semibold text-fg">{e.target}</span>
 <span className="ml-auto num text-mut">r = {e.weight.toFixed(2)}</span>
 </div>
 ))}
 </div>
 <p className="mt-3 text-[11px] leading-relaxed text-mut">
 Le graphe rapproche des wilayas éloignées géographiquement mais identiques scolairement preuve que la géographie n'est pas le facteur.
 </p>
 </Card>

 <Card>
 <h3 className="mb-3 font-display text-base font-semibold text-fg">Lecture des corrélations</h3>
 <div className="space-y-3">
 <Insight
 title="Le genre n'est pas le facteur"
 text="L'écart filles-garçons n'apparaît dans aucune corrélation forte : l'exclusion est territoriale, pas sexuée."
 />
 <Insight
 title="La ruralité pilote tout"
 text="Le taux hors école corrèle à 0.76 avec la dépendance jeunes (elle-même liée à la ruralité) : la cible est la famille rurale, jeune et pauvre."
 />
 <Insight
 title="Pauvreté et tradition ne se recouvrent pas"
 text="Le niveau de pauvreté forme un groupe à part : riche ou pauvre, toutes les wilayas ont une part d'exclusion seul le type change."
 />
 </div>
 </Card>
 </div>
 </div>
 );
}

function Insight({ title, text }: { title: string; text: string }) {
 return (
 <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
 <div className="text-xs font-bold text-accent">{title}</div>
 <div className="mt-1 text-xs leading-relaxed text-mut">{text}</div>
 </div>
 );
}
