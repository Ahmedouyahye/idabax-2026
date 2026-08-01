import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon, Logo, type IconName } from "./ui";
import { LangSwitcher, useI18n } from "../lib/i18n";

export default function Layout() {
  const { t } = useI18n();
  const NAV: { to: string; label: string; icon: IconName }[] = [
    { to: "/", label: t("nav.dashboard"), icon: "dashboard" },
    { to: "/carte", label: t("nav.carte"), icon: "map" },
    { to: "/wilayas", label: t("nav.wilayas"), icon: "wilayas" },
    { to: "/clusters", label: t("nav.clusters"), icon: "clusters" },
    { to: "/tendances", label: t("nav.tendances"), icon: "trend" },
    { to: "/strategies", label: t("nav.strategies"), icon: "target" },
    { to: "/reseau", label: t("nav.reseau"), icon: "network" },
    { to: "/indicateurs", label: t("nav.indicateurs"), icon: "grid" },
    { to: "/regles", label: t("nav.regles"), icon: "mining" },
    { to: "/methodologie", label: t("nav.methodologie"), icon: "compass" },
    { to: "/rapport", label: t("nav.rapport"), icon: "report" },
  ];

  return (
    <div className="flex h-full min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-panel/70 backdrop-blur-xl md:flex">
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <div>
              <div className="font-display text-lg font-semibold leading-tight tracking-tight">
                EduFocus<span className="grad-text">🌙</span>
              </div>
              <div className="font-grotesk text-[10px] uppercase tracking-[0.16em] text-mut">{t("layout.subtitle")}</div>
            </div>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-accent/40 via-line to-transparent" />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(238,183,79,0.22)]"
                    : "text-mut hover:bg-white/5 hover:text-fg"
                }`
              }
            >
              <Icon name={item.icon} className="h-[17px] w-[17px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 pt-2">
          <LangSwitcher className="w-full justify-center" />
        </div>

        <div className="relative px-6 py-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-accent/[0.05] to-transparent" />
          <p className="relative font-display text-sm italic leading-snug text-fg/80">{t("layout.quote")}</p>
          <div className="relative mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-mut">
            <Icon name="sun" className="h-3.5 w-3.5 text-accent" />
            {t("layout.team")}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/80 px-5 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display font-semibold text-fg">{t("layout.header")}</span>
            <span className="hidden text-mut sm:inline">{t("layout.header.sub")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-mut">
            <span className="hidden sm:inline">{t("layout.epcv")}</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent2 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent2" />
            </span>
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
