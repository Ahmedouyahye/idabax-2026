import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const langs: { code: Lang; label: string; name: string }[] = [
    { code: "fr", label: "FR", name: "Français" },
    { code: "en", label: "EN", name: "English" },
    { code: "ar", label: "ع", name: "العربية" },
  ];
  const current = langs.find((l) => l.code === lang) ?? langs[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-line bg-panel/80 px-3 py-1.5 text-[11px] font-semibold text-fg transition-colors hover:bg-panel2"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-mut" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {current.label}
        <svg viewBox="0 0 24 24" className={`h-3 w-3 text-mut transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-line bg-panel shadow-xl shadow-ink/10">
          {langs.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={lang === l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                lang === l.code ? "bg-accent/10 text-accent" : "text-fg hover:bg-ink/[0.05]"
              }`}
            >
              <span className="font-semibold">{l.label}</span>
              <span className="truncate text-[10px] text-mut">{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
