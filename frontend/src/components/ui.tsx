import type { ReactNode } from "react";
import { motion } from "framer-motion";
import logo from "../assets/logo.svg";
import logoSidebar from "../assets/logo-sidebar.svg";
import { useI18n } from "../lib/i18n";

export function Logo({
 className = "h-12 w-12",
 glow = true,
}: {
 className?: string;
 glow?: boolean;
}) {
 const { t } = useI18n();
 return (
 <img
 src={logo}
 alt={t("logo.alt")}
 className={className}
 style={{ filter: glow ? "drop-shadow(0 6px 18px rgba(232,143,58,0.35))" : undefined }}
 />
 );
}

export function SidebarLogo({ className = "h-11 w-11" }: { className?: string }) {
 const { t } = useI18n();
 return (
 <img
 src={logoSidebar}
 alt={t("logo.sidebar")}
 className={className}
 style={{ filter: "drop-shadow(0 6px 16px rgba(34,48,58,0.28))" }}
 />
 );
}

export type IconName =
 | "dashboard"
 | "map"
 | "wilayas"
 | "clusters"
 | "network"
 | "mining"
 | "compass"
 | "users"
 | "child"
 | "door"
 | "book"
 | "sun"
 | "trend"
 | "target"
  | "grid"
  | "report"
  | "menu"
  | "close";

const ICONS: Record<IconName, ReactNode> = {
 dashboard: (
 <>
 <rect x="3" y="3" width="7" height="7" rx="1.5" />
 <rect x="14" y="3" width="7" height="7" rx="1.5" />
 <rect x="14" y="14" width="7" height="7" rx="1.5" />
 <rect x="3" y="14" width="7" height="7" rx="1.5" />
 </>
 ),
 map: (
 <>
 <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
 <circle cx="12" cy="10" r="3" />
 </>
 ),
 wilayas: (
 <>
 <line x1="18" y1="20" x2="18" y2="10" />
 <line x1="12" y1="20" x2="12" y2="4" />
 <line x1="6" y1="20" x2="6" y2="14" />
 </>
 ),
 clusters: (
 <>
 <circle cx="12" cy="12" r="9" />
 <circle cx="12" cy="12" r="5" />
 <circle cx="12" cy="12" r="1.4" />
 </>
 ),
 network: (
 <>
 <circle cx="18" cy="5" r="3" />
 <circle cx="6" cy="12" r="3" />
 <circle cx="18" cy="19" r="3" />
 <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
 <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
 </>
 ),
 mining: <polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3" />,
 compass: (
 <>
 <circle cx="12" cy="12" r="10" />
 <polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" />
 </>
 ),
 users: (
 <>
 <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
 <circle cx="9" cy="7" r="4" />
 <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
 <path d="M16 3.13a4 4 0 0 1 0 7.75" />
 </>
 ),
 child: (
 <>
 <circle cx="12" cy="7" r="3.4" />
 <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
 <circle cx="12" cy="16.5" r="1.2" />
 </>
 ),
 door: (
 <>
 <path d="M7 21V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21" />
 <path d="M3.5 21h17" />
 <circle cx="13.8" cy="13" r="1.1" />
 </>
 ),
 book: (
 <>
 <path d="M2 3.5h6a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H2z" />
 <path d="M22 3.5h-6a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h7z" />
 </>
 ),
 sun: (
 <>
 <circle cx="12" cy="12" r="4.6" />
 <line x1="12" y1="1.6" x2="12" y2="3.6" />
 <line x1="12" y1="20.4" x2="12" y2="22.4" />
 <line x1="4.3" y1="4.3" x2="5.7" y2="5.7" />
 <line x1="18.3" y1="18.3" x2="19.7" y2="19.7" />
 <line x1="1.6" y1="12" x2="3.6" y2="12" />
 <line x1="20.4" y1="12" x2="22.4" y2="12" />
 <line x1="4.3" y1="19.7" x2="5.7" y2="18.3" />
 <line x1="18.3" y1="5.7" x2="19.7" y2="4.3" />
 </>
 ),
 trend: (
 <>
 <polyline points="3 17 9 11 13 15 21 7" />
 <polyline points="15 7 21 7 21 13" />
 </>
 ),
 target: (
 <>
 <circle cx="12" cy="12" r="9" />
 <circle cx="12" cy="12" r="5" />
 <circle cx="12" cy="12" r="1.2" />
 </>
 ),
 grid: (
 <>
 <rect x="3" y="3" width="7" height="7" rx="1" />
 <rect x="14" y="3" width="7" height="7" rx="1" />
 <rect x="3" y="14" width="7" height="7" rx="1" />
 <rect x="14" y="14" width="7" height="7" rx="1" />
 <line x1="9.2" y1="9.2" x2="14.8" y2="14.8" />
 </>
 ),
  report: (
  <>
  <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
  <polyline points="14 2 14 7 19 7" />
  <line x1="9" y1="12" x2="15" y2="12" />
  <line x1="9" y1="16" x2="15" y2="16" />
  </>
  ),
  menu: (
  <>
  <line x1="4" y1="6" x2="20" y2="6" />
  <line x1="4" y1="12" x2="20" y2="12" />
  <line x1="4" y1="18" x2="20" y2="18" />
  </>
  ),
  close: (
  <>
  <line x1="5" y1="5" x2="19" y2="19" />
  <line x1="19" y1="5" x2="5" y2="19" />
  </>
  ),
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
 return (
 <svg
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={1.8}
 strokeLinecap="round"
 strokeLinejoin="round"
 className={className}
 aria-hidden
 >
 {ICONS[name]}
 </svg>
 );
}

export function PageHeader({
 eyebrow,
 title,
 subtitle,
 children,
}: {
 eyebrow?: string;
 title: ReactNode;
 subtitle?: ReactNode;
 children?: ReactNode;
}) {
 return (
 <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
 <div>
 {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
 <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-fg">{title}</h1>
 {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mut">{subtitle}</p>}
 </div>
 {children}
 </div>
 );
}

export function Card({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, delay }}
 className={`glass rounded-2xl p-5 transition-colors ${className}`}
 >
 {children}
 </motion.div>
 );
}

export function Kpi({
 icon,
 label,
 value,
 sub,
 accent = "text-accent",
}: {
 icon: IconName;
 label: string;
 value: string;
 sub?: string;
 accent?: string;
}) {
 return (
 <Card className="relative overflow-hidden">
 <div className="pointer-events-none absolute -right-7 -top-9 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
 <div className="relative flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="eyebrow">{label}</div>
 {/* dir="ltr" + isolation bidi : sans cela l'algorithme bidirectionnel renvoie
 l'unité de l'autre côté du nombre en arabe (« % 60,9 » au lieu de « 60,9 % »). */}
 <div
 dir="ltr"
 style={{ unicodeBidi: "isolate" }}
 className={`font-display mt-1.5 text-3xl font-semibold leading-none tracking-tight ${accent}`}
 >
 {value}
 </div>
 {sub && <div className="mt-1.5 text-[11px] leading-snug text-mut">{sub}</div>}
 </div>
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
 <Icon name={icon} className="h-[18px] w-[18px]" />
 </div>
 </div>
 </Card>
 );
}

export function Badge({ children, color = "bg-accent/15 text-accent" }: { children: ReactNode; color?: string }) {
 return (
 <span className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold ${color}`}>
 {children}
 </span>
 );
}

export function Loading({ label }: { label?: string }) {
 const { t } = useI18n();
 const text = label ?? t("app.loading");
 return (
 <div className="flex flex-col items-center justify-center gap-4 py-20 text-mut">
 <div className="relative h-9 w-9">
 <div className="absolute inset-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
 <div className="absolute inset-[10px] rounded-full bg-accent/20 blur-sm" />
 </div>
 <span className="font-display text-sm italic">{text}</span>
 </div>
 );
}

export function ErrorBox({ message }: { message: string }) {
 const { t } = useI18n();
 return (
 <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-center">
 <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-danger/15 text-danger">
 <Icon name="sun" className="h-5 w-5" />
 </div>
 <div className="mt-3 text-sm text-danger">{t("app.error.prefix", { msg: message })}</div>
 <div className="mt-1 text-xs text-mut">{t("app.error.api")}</div>
 </div>
 );
}
