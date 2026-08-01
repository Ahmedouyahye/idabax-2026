import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fr, en, ar, type Dict, type Lang } from "./translations";

const LS_KEY = "edufocus_lang";

const DICTS: Record<Lang, Dict> = { fr, en, ar };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function lookup(d: Dict, key: string, vars?: Record<string, string | number>): string {
  let s = d[key] ?? fr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

let activeT: (key: string, vars?: Record<string, string | number>) => string = (k) => k;

export function getT() {
  return activeT;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const url = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("lang") : null;
    if (url === "en" || url === "ar" || url === "fr") return url;
    const saved = typeof localStorage !== "undefined" ? (localStorage.getItem(LS_KEY) as Lang | null) : null;
    return saved === "en" || saved === "ar" || saved === "fr" ? saved : "fr";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(LS_KEY, lang);
    } catch {
      /* stockage indisponible */
    }
  }, [lang]);

  const t = (key: string, vars?: Record<string, string | number>) => lookup(DICTS[lang], key, vars);
  activeT = t;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const langs: { code: Lang; label: string }[] = [
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
    { code: "ar", label: "ع" },
  ];
  return (
    <div className={`flex items-center rounded-full border border-line bg-ink/60 p-0.5 text-[10px] font-semibold ${className}`}>
      {langs.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-label={l.code.toUpperCase()}
          className={`rounded-full px-2 py-1 transition-colors ${
            lang === l.code ? "bg-accent/20 text-accent" : "text-mut hover:text-fg"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
