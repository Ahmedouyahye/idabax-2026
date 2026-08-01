/**
 * Primitives partagées par les pages analytiques.
 *
 * Regroupe ce que chaque page redéfinissait sinon : le style d'infobulle et
 * d'axe ECharts (accordé au thème clair du tableau de bord) et quelques briques
 * de mise en page. La palette catégorielle validée vit dans `lib/charts.ts`
 * (constante SERIES) — ne pas en introduire d'autre ici.
 */
import type { ReactNode } from "react";
import { AXIS_LINE, INK, MUT, SPLIT_LINE } from "../lib/charts";

export const TOOLTIP = {
  backgroundColor: "#ffffff",
  borderColor: "rgba(37,50,58,0.12)",
  borderWidth: 1,
  textStyle: { color: INK },
  extraCssText: "border-radius:12px;box-shadow:0 12px 32px -14px rgba(32,44,52,0.28);",
};

export const AXIS = {
  axisLine: { lineStyle: { color: AXIS_LINE } },
  axisLabel: { color: MUT, fontSize: 11 },
  splitLine: { lineStyle: { color: SPLIT_LINE } },
};

/**
 * Les graphiques de ces pages sont rendus sans animation d'entrée.
 *
 * Motif : imbriquée dans la carte animée par framer-motion, l'animation d'entrée
 * d'ECharts s'interrompt avant la fin et laisse les barres figées à une fraction
 * de leur hauteur — les valeurs affichées deviennent alors fausses à l'œil, ce qui
 * est inacceptable sur des graphiques de décision. Les données sont correctes dans
 * les deux cas ; seule l'interpolation échoue. On la désactive donc plutôt que de
 * dépendre de son bon achèvement.
 */
export const NO_ANIM = { animation: false as const };

export const LEGEND = {
  bottom: 0,
  icon: "roundRect",
  itemWidth: 10,
  itemHeight: 10,
  textStyle: { color: MUT, fontSize: 11 },
};

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      {subtitle && <p className="mt-1 text-[11px] leading-relaxed text-mut">{subtitle}</p>}
    </div>
  );
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-ink/[0.04] px-4 py-3">
      <div className="eyebrow">{label}</div>
      {/* dir="ltr" : sans isolation bidi, l'unité passe de l'autre côté du nombre en arabe. */}
      <div dir="ltr" style={{ unicodeBidi: "isolate", ...(color ? { color } : { color: INK }) }} className="num mt-1 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

/** Barre de proportion horizontale, avec valeur alignée à droite. */
export function Meter({
  value,
  max = 100,
  color,
  suffix = "%",
  width = "flex-1",
  decimals = 1,
}: {
  value: number;
  max?: number;
  color: string;
  suffix?: string;
  width?: string;
  decimals?: number;
}) {
  return (
    <>
      <span className={`h-1.5 overflow-hidden rounded-full bg-ink/[0.08] ${width}`}>
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(Math.max(value, 0) / max, 1) * 100}%`, background: color }}
        />
      </span>
      <b dir="ltr" style={{ unicodeBidi: "isolate" }} className="num w-14 text-right text-fg">
        {value.toLocaleString("fr-FR", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}{suffix && ` ${suffix}`}
      </b>
    </>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-ink/[0.04] px-4 py-3 text-[11px] leading-relaxed text-mut">
      {children}
    </p>
  );
}
