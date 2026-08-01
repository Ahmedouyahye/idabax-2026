import React from "react";
import { fmt, useRules } from "../lib/api";
import type { Rule } from "../lib/types";
import { Card, ErrorBox, Loading, PageHeader } from "../components/ui";

export default function Regles() {
  return (
    <div>
      <PageHeader
        title="Règles d'association"
        subtitle="Datamining sur les 16 451 enfants de 6-14 ans de l'EPCV 2019 : quelles combinaisons de facteurs conduisent le plus sûrement à l'exclusion scolaire ?"
      />
      <RulesContent />
    </div>
  );
}

function RulesContent() {
  const { data, loading, error } = useRules();
  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Loading label="Extraction des règles…" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-4">
        <KpiStat label="Règles extraites" value={`${data.n_rules}`} hint="algorithme Apriori" />
        <KpiStat label="Enfants 6-14 ans analysés" value={fmt(data.n_children_6_14)} hint="microdonnées EPCV 2019" />
        <KpiStat label="Meilleur lift" value={maxLift(data.rules).toFixed(2)} hint="cm_sans_education → hors_ecole" />
        <KpiStat label="Règles à confiance 100 %" value={`${data.rules.filter((r) => r.confidence >= 1).length}`} hint="règles déterministes" />
      </div>

      <RuleSection
        title="Règles générales (top 10 par lift)"
        subtitle="La variable déterminante saute aux yeux : être sans instruction, ou en éducation traditionnelle, conduit systématiquement à l'exclusion formelle (confiance 100 %)."
        accent="accent"
        rules={data.rules}
      />
      <RuleSection
        title="Sans éducation moderne : qui est concerné ?"
        subtitle="Règles sur les enfants sans instruction moderne. Le noyau dur de l'exclusion."
        accent="warn"
        rules={data.sans_cm}
        columns={["Ruralité", "Pauvreté", "Âge"]}
      />
      <RuleSection
        title="Par région"
        subtitle="Les contextes régionaux les plus à risque d'exclusion."
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
  const ants = r.antecedents_str.split(" & ");
  const conds = ants.filter((a) => !(columns ?? []).some((c) => a.startsWith(c.toLowerCase().split(" ")[0])));
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs">
      {ants.map((a) => (
        <Chip key={a} accent={a === "cm_sans_education" || a === "cm_education_traditionnelle" ? accent : "mut"} label={a} />
      ))}
      <span className="font-bold text-mut">⟶</span>
      <Chip accent={accent} label="hors_ecole" />
      <span className="ml-auto flex items-center gap-3 num text-[11px] text-mut">
        <span>
          conf <b className="text-fg">{Math.round(r.confidence * 100)} %</b>
        </span>
        <span>
          lift <b className={accentClass(accent)}>{r.lift.toFixed(2)}</b>
        </span>
        <span>
          supp <b className="text-fg">{(r.support * 100).toFixed(1)} %</b>
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
