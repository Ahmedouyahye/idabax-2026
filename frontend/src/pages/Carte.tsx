import { PageHeader } from "../components/ui";
import { Choropleth } from "../components/Choropleth";
import { useI18n } from "../lib/i18n";

export default function Carte() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader
        eyebrow={t("carte.eyebrow")}
        title={t("carte.title")}
        subtitle={t("carte.subtitle")}
      />
      <Choropleth height={640} />
    </div>
  );
}
