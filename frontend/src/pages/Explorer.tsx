import { useState } from "react";
import { useBriefs, useCube, useData, useQualite, useWilayas } from "../lib/api";
import { SERIES } from "../lib/charts";
import { Card, ErrorBox, Loading, PageHeader } from "../components/ui";
import { Meter, Note, SectionTitle } from "../components/viz";
import { useI18n } from "../lib/i18n";
import type { AskData } from "../lib/types";

const DIMENSIONS = ["wilaya", "milieu", "sexe", "tranche_age", "est_pauvre"] as const;
const MESURES = ["hors_ecole", "traditionnel", "enfants"] as const;

export default function Explorer() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader eyebrow={t("explorer.eyebrow")} title={t("explorer.title")} subtitle={t("explorer.subtitle")} />
      <div className="space-y-6">
        <Cube />
        <Ask />
        <Briefs />
        <Qualite />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- cube */
function Cube() {
  const { t } = useI18n();
  const [dims, setDims] = useState<string[]>(["wilaya", "milieu"]);
  const [mesure, setMesure] = useState<string>("hors_ecole");
  const { data, loading, error } = useCube(dims.join(","), mesure);

  const bascule = (d: string) =>
    setDims((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : [...cur, d]));

  return (
    <Card>
      <SectionTitle title={t("explorer.cube.title")} subtitle={t("explorer.cube.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-1">{t("explorer.cube.dimensions")}</span>
          {DIMENSIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => bascule(d)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors"
              style={
                dims.includes(d)
                  ? { background: "rgba(10,132,104,0.16)", color: SERIES[1] }
                  : { background: "rgba(37,50,58,0.06)", color: "#66737d" }
              }
            >
              {t(`explorer.dim.${d}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-1">{t("explorer.cube.mesure")}</span>
          {MESURES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMesure(m)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors"
              style={
                mesure === m
                  ? { background: "rgba(181,119,14,0.16)", color: SERIES[2] }
                  : { background: "rgba(37,50,58,0.06)", color: "#66737d" }
              }
            >
              {t(`explorer.mesure.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <Loading label={t("explorer.cube.loading")} />}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
                {data.dimensions.map((d) => (
                  <th key={d} className="py-2 pr-3 font-semibold">{t(`explorer.dim.${d}`)}</th>
                ))}
                <th className="py-2 pr-3 text-right font-semibold">{t("explorer.cube.enfants")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t(`explorer.mesure.${data.mesure}`)}</th>
                <th className="py-2 font-semibold">{t("explorer.cube.part")}</th>
              </tr>
            </thead>
            <tbody>
              {data.cellules.slice(0, 40).map((c, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  {data.dimensions.map((d) => (
                    <td key={d} className="py-1.5 pr-3 font-semibold text-fg">
                      {typeof c[d] === "boolean" ? t(c[d] ? "explorer.oui" : "explorer.non") : String(c[d] ?? "—")}
                    </td>
                  ))}
                  <td className="num py-1.5 pr-3 text-right text-mut">{Number(c.n_enfants).toLocaleString("fr-FR")}</td>
                  <td className="num py-1.5 pr-3 text-right font-bold text-fg">{Number(c.mesure).toLocaleString("fr-FR")}</td>
                  <td className="py-1.5">
                    <span className="flex items-center gap-2">
                      <Meter value={Number(c.pct)} color={SERIES[0]} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.cellules.length > 40 && (
            <p className="mt-2 text-[11px] text-mut">
              {t("explorer.cube.tronque", { n: String(data.cellules.length) })}
            </p>
          )}
        </div>
      )}
      <Note>{t("explorer.cube.note")}</Note>
    </Card>
  );
}

/* -------------------------------------------------------------- texte→SQL */
interface AskStatique extends AskData {
  exemples?: { question: string; sql: string }[];
}

function Ask() {
  const { t } = useI18n();
  const { data, loading, error } = useData<AskStatique>("/data/ask.json");

  return (
    <Card>
      <SectionTitle title={t("explorer.ask.title")} subtitle={t("explorer.ask.subtitle")} />
      {error && <ErrorBox message={error} />}
      {loading && <Loading label={t("explorer.ask.loading")} />}
      {data && (
        <div className="space-y-4">
          {(data.statut === "statique" || data.statut === "sans_cle") && data.message && (
            <div className="rounded-xl px-4 py-3 text-[11px] leading-relaxed text-mut" style={{ background: "rgba(181,119,14,0.08)" }}>
              {data.message}
            </div>
          )}
          {data.exemples && data.exemples.length > 0 && (
            <div>
              <div className="eyebrow mb-2">{t("explorer.ask.exemples")}</div>
              <div className="space-y-2">
                {data.exemples.map((ex, i) => (
                  <div key={i} className="rounded-xl border border-line bg-panel/60 p-3">
                    <div className="text-xs font-semibold text-fg">{ex.question}</div>
                    <pre dir="ltr" className="mt-1.5 overflow-x-auto rounded-lg bg-ink/[0.06] px-3 py-2 text-[11px] leading-relaxed text-fg">
                      {ex.sql}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.schema && (
            <div>
              <div className="eyebrow mb-2">{t("explorer.ask.schema")}</div>
              <pre dir="ltr" className="max-h-64 overflow-auto rounded-xl bg-ink/[0.06] px-3 py-2 text-[11px] leading-relaxed text-fg">
                {data.schema}
              </pre>
            </div>
          )}
          {data.sql && (
            <div>
              <div className="eyebrow mb-1">{t("explorer.ask.sql")}</div>
              <pre dir="ltr" className="overflow-x-auto rounded-xl bg-ink/[0.06] px-3 py-2 text-[11px] leading-relaxed text-fg">
                {data.sql}
              </pre>
            </div>
          )}
          {(data.statut === "rejete" || data.statut === "erreur_sql") && (
            <div className="rounded-xl px-4 py-3 text-[11px] text-mut" style={{ background: "rgba(192,61,58,0.08)" }}>
              <b style={{ color: SERIES[0] }}>{t(`explorer.ask.${data.statut}`)}</b> — {data.motif ?? data.detail}
            </div>
          )}
          {data.resultat && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-mut">
                    {data.resultat.colonnes.map((c) => (
                      <th key={c} className="py-2 pr-3 font-semibold">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.resultat.lignes.map((r, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      {r.map((v, j) => (
                        <td key={j} className="num py-1.5 pr-3 text-fg">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <Note>{t("explorer.ask.garde_fous")}</Note>
    </Card>
  );
}

/* ----------------------------------------------------------------- briefs */
function Briefs() {
  const { t, lang } = useI18n();
  const { data, loading, error } = useBriefs();
  const wilayas = useWilayas();
  const [choisie, setChoisie] = useState<string | null>(null);

  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Loading label={t("explorer.briefs.loading")} />;

  const liste = (wilayas.data ?? []).map((w) => w.wilaya);
  const active: string | undefined = choisie ?? liste[0];
  const note = active ? data.briefs?.[active]?.[lang] : undefined;

  return (
    <Card>
      <SectionTitle title={t("explorer.briefs.title")} subtitle={t("explorer.briefs.subtitle")} />
      {!data.disponible ? (
        <div className="rounded-xl px-4 py-3 text-[11px] leading-relaxed text-mut" style={{ background: "rgba(181,119,14,0.08)" }}>
          {data.note}
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {liste.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setChoisie(w)}
                className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors"
                style={
                  w === active
                    ? { background: "rgba(10,132,104,0.16)", color: SERIES[1] }
                    : { background: "rgba(37,50,58,0.06)", color: "#66737d" }
                }
              >
                {w}
              </button>
            ))}
          </div>
          {note?.texte ? (
            <>
              <p className="whitespace-pre-line text-xs leading-relaxed text-fg">{note.texte}</p>
              {note.verification && (
                <p className="mt-3 text-[11px] text-mut">
                  {note.verification.verifie
                    ? t("explorer.briefs.verifie", { n: String(note.verification.n_nombres_cites) })
                    : t("explorer.briefs.non_verifie", {
                        liste: note.verification.nombres_non_sources.join(", "),
                      })}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-mut">{t("explorer.briefs.absente")}</p>
          )}
        </>
      )}
      {data.methode && <Note>{data.methode}</Note>}
    </Card>
  );
}

/* ---------------------------------------------------------------- qualité */
function Qualite() {
  const { t } = useI18n();
  const { data, loading, error } = useQualite();
  if (error) return <ErrorBox message={error} />;
  if (loading || !data) return <Loading label={t("explorer.qualite.loading")} />;

  return (
    <Card>
      <SectionTitle
        title={t("explorer.qualite.title")}
        subtitle={t("explorer.qualite.subtitle", { ok: String(data.n_ok), n: String(data.n_controles) })}
      />
      <div className="space-y-1.5">
        {data.resultats.map((r) => (
          <div key={r.controle} className="flex items-start gap-2 text-[11px]">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: r.statut === "ok" ? SERIES[1] : SERIES[0] }}
            >
              {r.statut === "ok" ? "✓" : "✗"}
            </span>
            <span className="w-56 shrink-0 font-semibold text-fg">{t(`qualite.${r.controle}`)}</span>
            <span className="flex-1 text-mut">{r.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
