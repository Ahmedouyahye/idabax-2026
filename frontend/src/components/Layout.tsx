import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon, SidebarLogo, type IconName } from "./ui";
import { LangSwitcher, useI18n } from "../lib/i18n";

export default function Layout() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  // 19 pages : une barre plate deviendrait illisible, on regroupe par intention
  // de lecture — d'abord ce qui se passe, puis pourquoi, puis quoi faire.
  const SECTIONS: {
    titre: string;
    items: { to: string; label: string; icon: IconName }[];
  }[] = [
    {
      titre: t("nav.section.panorama"),
      items: [
        { to: "/", label: t("nav.dashboard"), icon: "dashboard" },
        { to: "/carte", label: t("nav.carte"), icon: "map" },
        { to: "/wilayas", label: t("nav.wilayas"), icon: "wilayas" },
      ],
    },
    {
      titre: t("nav.section.diagnostic"),
      items: [
        { to: "/clusters", label: t("nav.clusters"), icon: "clusters" },
        { to: "/parcours", label: t("nav.parcours"), icon: "door" },
        { to: "/rendement", label: t("nav.rendement"), icon: "book" },
        { to: "/reseau", label: t("nav.reseau"), icon: "network" },
        { to: "/indicateurs", label: t("nav.indicateurs"), icon: "grid" },
        { to: "/tendances", label: t("nav.tendances"), icon: "trend" },
      ],
    },
    {
      titre: t("nav.section.modeles"),
      items: [
        { to: "/regles", label: t("nav.regles"), icon: "mining" },
        { to: "/modeles", label: t("nav.modeles"), icon: "clusters" },
        { to: "/explorer", label: t("nav.explorer"), icon: "compass" },
      ],
    },
    {
      titre: t("nav.section.decision"),
      items: [
        { to: "/strategies", label: t("nav.strategies"), icon: "target" },
        { to: "/optimisation", label: t("nav.optimisation"), icon: "target" },
        { to: "/projection", label: t("nav.projection"), icon: "users" },
        { to: "/acces", label: t("nav.acces"), icon: "map" },
      ],
    },
    {
      titre: t("nav.section.cadre"),
      items: [
        { to: "/robustesse", label: t("nav.robustesse"), icon: "target" },
        { to: "/methodologie", label: t("nav.methodologie"), icon: "compass" },
        { to: "/rapport", label: t("nav.rapport"), icon: "report" },
      ],
    },
  ];

  const SectionsNav = () => (
    <nav className="flex-1 overflow-y-auto px-3 pb-2">
      {SECTIONS.map((section) => (
        <div key={section.titre} className="mb-3 last:mb-0">
          <div className="px-3 pb-1 pt-2 font-grotesk text-[9px] uppercase tracking-[0.16em] text-mut/70">
            {section.titre}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(181,119,14,0.25)]"
                      : "text-mut hover:bg-ink/[0.05] hover:text-fg"
                  }`
                }
              >
                <Icon name={item.icon} className="h-[16px] w-[16px]" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-full min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-panel/70 backdrop-blur-xl md:flex">
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <SidebarLogo className="h-11 w-11" />
            <div>
              <div className="font-display text-lg font-semibold leading-tight tracking-tight">
                EduFocus<span className="grad-text">🌙</span>
              </div>
              <div className="font-grotesk text-[10px] uppercase tracking-[0.16em] text-mut">{t("layout.subtitle")}</div>
            </div>
          </div>
          <div className="mt-6 h-px bg-line" />
        </div>

        <SectionsNav />

        <div className="px-6 pt-2">
          <LangSwitcher className="w-full justify-center" />
        </div>

        <div className="relative px-6 py-6">
          <div className="pointer-events-none absolute inset-0 bg-ink/[0.04]" />
          <p className="relative font-display text-sm italic leading-snug text-fg/80">{t("layout.quote")}</p>
          <div className="relative mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-mut">
            <Icon name="sun" className="h-3.5 w-3.5 text-accent" />
            {t("layout.team")}
          </div>
        </div>
      </aside>

      {/* Navigation mobile (la barre latérale est masquée sous md) */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-line bg-panel p-3 md:hidden">
            <div className="mb-2 flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2.5">
                <SidebarLogo className="h-9 w-9" />
                <div className="font-display text-base font-semibold leading-tight">
                  EduFocus<span className="grad-text">🌙</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t("layout.close")}
                className="rounded-lg p-1.5 text-mut transition-colors hover:bg-ink/[0.06] hover:text-fg"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <SectionsNav />
            <div className="px-2 pb-3">
              <LangSwitcher className="w-full justify-center" />
            </div>
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-ink/80 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t("layout.menu")}
              className="shrink-0 rounded-lg border border-line bg-panel/70 p-1.5 text-fg transition-colors hover:bg-panel2 md:hidden"
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>
            <span className="font-display truncate font-semibold text-fg">{t("layout.header")}</span>
            <span className="hidden text-mut sm:inline">{t("layout.header.sub")}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-mut md:inline">{t("layout.epcv")}</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent2 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent2" />
            </span>
            <LangSwitcher />
          </div>
        </header>
        <main className="flex-1 px-5 py-7 md:px-8 md:py-9">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Outlet />
          </motion.div>
        </main>
        <footer className="px-5 py-4 text-center font-grotesk text-[10px] uppercase tracking-[0.14em] text-mut md:px-8">
          {t("layout.footer")}
        </footer>
      </div>
    </div>
  );
}
