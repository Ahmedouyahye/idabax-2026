import React from "react";
import { fmt, useRules } from "../lib/api";
import type { Rule } from "../lib/types";
import { Card, ErrorBox, Loading, PageHeader } from "../components/ui";
import { useI18n } from "../lib/i18n";

export default function Regles() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader
        title={t("regles.title")}
        subtitle={t("regles.subtitle")}
      />
      <RulesContent />
    </div>
  );
}

function RulesContent() {
  const { t } = useI18n();
  const { data, loading, error } = useRules();
  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Loading label={t("regles.loading")} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-4">
        <KpiStat label={t("regles.regles_extraites")} value={`${data.n_rules}`} hint={t("regles.algo_apriori")} />
        <KpiStat label={t("regles.enfants_analyses")} value={fmt(data.n_children_6_14)} hint={t("regles.microdonnees")} />
        <KpiStat label={t("regles.meilleur_lift")} value={maxLift(data.rules).toFixed(2)} hint={t("regles.hint_lift")} />
        <KpiStat label={t("regles.regles_confiance_100")} value={`${data.rules.filter((r) => r.confidence >= 1).length}`} hint={t("regles.regles_deterministes")} />
      </div>

      <RuleSection
        title={t("regles.generales.title")}
        subtitle={t("regles.generales.subtitle")}
        accent="accent"
        rules={data.rules}
      />
      <RuleSection
        title={t("regles.sans_cm.title")}
        subtitle={t("regles.sans_cm.subtitle")}
        accent="warn"
        rules={data.sans_cm}
        columns={["Ruralité", "Pauvreté", "Âge"]}
      />
      <RuleSection
        title={t("regles.par_region.title")}
        subtitle={t("regles.par_region.subtitle")}
        accent="danger"
        rules={data.par_region}
        columns={["Région"]}
      />
    </div>
  );
}

function RuleSection({ title, subtitle, accent, rules, columns }: { title: string; subtitle: string; accent: string; rules: Rule[]; columns?: string[] }) {  return (
    <Card>
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      <p className="mt-1 mb-4 text-[11px] text-mut">{subtitle}</p>
      <div className="space-y-2">
        {rules.map((r, i) => (
          <RuleRow key={i} r={r} accent={accent} columns={columns} />
        ))}
      </div>
    </Card>
  );
}

function RuleRow({ r, accent, columns }: { r: Rule; accent: string; columns?: string[] }) {
  const { t } = useI18n();
  const ants = r.antecedents_str.split(" & ");
  const conds = ants.filter((a) => !(columns ?? []).some((c) => a.startsWith(c.toLowerCase().split(" ")[0])));
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs">
      {ants.map((a) => (
        <Chip key={a} accent={a === "cm_sans_education" || a === "cm_education_traditionnelle" ? accent : "mut"} label={t(a)} />
      ))}
      <span className="font-bold text-mut">⟶</span>
      <Chip accent={accent} label={t("hors_ecole")} />
      <span className="ml-auto flex items-center gap-3 num text-[11px] text-mut">
        <span>
          {t("regles.conf")} <b className="text-fg">{Math.round(r.confidence * 100)} %</b>
        </span>
        <span>
          {t("regles.lift")} <b className={accentClass(accent)}>{r.lift.toFixed(2)}</b>
        </span>
        <span>
          {t("regles.supp")} <b className="text-fg">{(r.support * 100).toFixed(1)} %</b>
        </span>
      </span>
    </div>
  );
}

function Chip({ label, accent }: { label: string; accent: string }) {
  const map: Record<string, string> = {
    accent: "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(45,212,191,0.3)]",
    warn: "bg-warn/15 text-warn shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)]",
    danger: "bg-danger/15 text-danger shadow-[inset_0_0_0_1px_rgba(248,113,113,0.3)]",
    mut: "bg-white/5 text-mut",
  };
  return <span className={`rounded-md px-2 py-0.5 font-semibold ${map[accent] ?? map.mut}`}>{label}</span>;
}

function accentClass(accent: string) {
  return { accent: "text-accent", warn: "text-warn", danger: "text-danger" }[accent] ?? "text-fg";
}

function KpiStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-mut">{label}</div>
      <div className="num mt-1 text-2xl font-black grad-text">{value}</div>
      <div className="mt-1 text-[10px] text-mut">{hint}</div>
    </div>
  );
}

function maxLift(rules: Rule[]) {
  return Math.max(...rules.map((r) => r.lift));
}
