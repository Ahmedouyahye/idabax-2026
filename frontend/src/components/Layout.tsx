import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon, Logo, type IconName } from "./ui";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Tableau de bord", icon: "dashboard" },
  { to: "/carte", label: "Carte", icon: "map" },
  { to: "/wilayas", label: "Wilayas", icon: "wilayas" },
  { to: "/clusters", label: "Typologies", icon: "clusters" },
  { to: "/tendances", label: "Tendances", icon: "trend" },
  { to: "/strategies", label: "Stratégies", icon: "target" },
  { to: "/reseau", label: "Réseau", icon: "network" },
  { to: "/indicateurs", label: "Indicateurs", icon: "grid" },
  { to: "/regles", label: "Data mining", icon: "mining" },
  { to: "/methodologie", label: "Méthodologie", icon: "compass" },
  { to: "/rapport", label: "Rapport PDF", icon: "report" },
];

export default function Layout() {
  return (
    <div className="flex h-full min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-panel/70 backdrop-blur-xl md:flex">
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <div>
              <div className="font-display text-lg font-semibold leading-tight tracking-tight">
                EduFocus<span className="grad-text">+</span>
              </div>
              <div className="font-grotesk text-[10px] uppercase tracking-[0.16em] text-mut">IndabaX · Mauritanie</div>
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

        <div className="relative px-6 py-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-accent/[0.05] to-transparent" />
          <p className="relative font-display text-sm italic leading-snug text-fg/80">
            « Des pourcentages aux enfants,
            <br />
            des enfants aux décisions. »
          </p>
          <div className="relative mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-mut">
            <Icon name="sun" className="h-3.5 w-3.5 text-accent" />
            Équipe DataSphere
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/80 px-5 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display font-semibold text-fg">Démographie → Décision</span>
            <span className="hidden text-mut sm:inline">· Où investir dans l'éducation</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-mut">
            <span className="hidden sm:inline">EPCV 2019 · 60 600 individus</span>
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
          EduFocus+ · Hackathon IndabaX Mauritanie 2026 · Réalisé par l'équipe DataSphere
        </footer>
      </div>
    </div>
  );
}
