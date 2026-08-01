import { PageHeader } from "../components/ui";
import { Choropleth } from "../components/Choropleth";

export default function Carte() {
  return (
    <div>
      <PageHeader
        eyebrow="Géographie de l'exclusion scolaire"
        title="Carte de la priorité éducative"
        subtitle="Explorez chaque wilaya par indicateur : priorité éducative, taux hors école, pauvreté, démographie. Survolez une wilaya pour la fiche synthétique."
      />
      <Choropleth height={640} />
    </div>
  );
}
