"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  FileText,
  Star,
  LayoutDashboard,
  CalendarDays,
  Trophy,
  Activity,
  DollarSign,
  Home,
  Megaphone,
  Shield,
  MapPin,
  UserCog,
  Send,
  UserPlus,
  IdCard,
  AlertTriangle,
  FileSpreadsheet,
  Shirt,
  Award,
  Camera,
  TrendingDown,
  HeartPulse,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { UserRole } from "@/lib/types";

type NavLink = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; icon: LucideIcon; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const entrenadorNav: NavItem[] = [
  { href: "/entrenador/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Entrenamiento",
    icon: ClipboardList,
    children: [
      { href: "/entrenador/planificador", label: "Planificador", icon: CalendarDays },
      { href: "/entrenador/asistencia", label: "Asistencia", icon: ClipboardList },
      { href: "/entrenador/reporte-entrenamiento", label: "Reporte DT", icon: FileText },
      { href: "/entrenador/reporte", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    label: "Jugadores",
    icon: Users,
    children: [
      { href: "/entrenador/jugadores", label: "Data Jugadores", icon: Users },
      { href: "/entrenador/evaluaciones", label: "Evaluaciones", icon: Star },
      { href: "/entrenador/eval-fisicas", label: "Eval. Físicas", icon: Activity },
      { href: "/entrenador/convocatorias", label: "Convocatorias", icon: Send },
    ],
  },
  {
    label: "Partidos y Torneos",
    icon: Trophy,
    children: [
      { href: "/entrenador/partidos", label: "Partidos", icon: Trophy },
      { href: "/entrenador/torneos", label: "Torneos", icon: Award },
    ],
  },
  {
    label: "Gestión",
    icon: Shirt,
    children: [
      { href: "/entrenador/uniformes", label: "Uniformes", icon: Shirt },
      { href: "/entrenador/certificados", label: "Certificados", icon: FileText },
      { href: "/entrenador/informe-jugador", label: "Informe PDF", icon: FileText },
      { href: "/entrenador/fotos", label: "Fotos", icon: Camera },
    ],
  },
  {
    label: "Alertas y Salud",
    icon: AlertTriangle,
    children: [
      { href: "/entrenador/alertas", label: "Alertas", icon: AlertTriangle },
      { href: "/entrenador/lesiones", label: "Lesiones", icon: HeartPulse },
      { href: "/entrenador/comunicaciones", label: "Avisos", icon: Megaphone },
    ],
  },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Panel Admin", icon: Shield },
  {
    label: "Finanzas",
    icon: DollarSign,
    children: [
      { href: "/admin/pagos", label: "Pagos", icon: DollarSign },
      { href: "/admin/morosidad", label: "Morosidad", icon: TrendingDown },
      { href: "/admin/proyeccion", label: "Proyección $", icon: DollarSign },
    ],
  },
  {
    label: "Personas",
    icon: UserCog,
    children: [
      { href: "/admin/usuarios", label: "Usuarios", icon: UserCog },
      { href: "/admin/entrenadores", label: "Entrenadores", icon: Users },
      { href: "/admin/inscripciones", label: "Inscripciones", icon: UserPlus },
    ],
  },
  {
    label: "Análisis",
    icon: BarChart3,
    children: [
      { href: "/admin/sedes", label: "Sedes", icon: MapPin },
      { href: "/admin/reportes", label: "Reportes", icon: FileSpreadsheet },
      { href: "/admin/retencion", label: "Retención", icon: Activity },
      { href: "/admin/auditoria", label: "Auditoría", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Entrenamiento",
    icon: ClipboardList,
    children: [
      { href: "/entrenador/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/entrenador/asistencia", label: "Asistencia", icon: ClipboardList },
      { href: "/entrenador/reporte", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    label: "Jugadores",
    icon: Users,
    children: [
      { href: "/entrenador/jugadores", label: "Data Jugadores", icon: Users },
      { href: "/entrenador/evaluaciones", label: "Evaluaciones", icon: Star },
      { href: "/entrenador/eval-fisicas", label: "Eval. Físicas", icon: Activity },
      { href: "/entrenador/convocatorias", label: "Convocatorias", icon: Send },
    ],
  },
  {
    label: "Partidos y Torneos",
    icon: Trophy,
    children: [
      { href: "/entrenador/partidos", label: "Partidos", icon: Trophy },
      { href: "/entrenador/torneos", label: "Torneos", icon: Award },
    ],
  },
  {
    label: "Gestión",
    icon: Shirt,
    children: [
      { href: "/entrenador/uniformes", label: "Uniformes", icon: Shirt },
      { href: "/entrenador/certificados", label: "Certificados", icon: FileText },
      { href: "/entrenador/informe-jugador", label: "Informe PDF", icon: FileText },
      { href: "/entrenador/fotos", label: "Fotos", icon: Camera },
      { href: "/entrenador/lesiones", label: "Lesiones", icon: HeartPulse },
      { href: "/entrenador/alertas", label: "Alertas", icon: AlertTriangle },
      { href: "/entrenador/comunicaciones", label: "Avisos", icon: Megaphone },
    ],
  },
];

const apoderadoNav: NavItem[] = [
  { href: "/apoderado", label: "Inicio", icon: Home },
  {
    label: "Mi Hijo",
    icon: Activity,
    children: [
      { href: "/apoderado/asistencia", label: "Asistencia", icon: ClipboardList },
      { href: "/apoderado/planificacion", label: "Planificación", icon: CalendarDays },
      { href: "/apoderado/partidos", label: "Partidos", icon: Trophy },
      { href: "/apoderado/evaluaciones", label: "Evaluaciones", icon: Activity },
    ],
  },
  {
    label: "Pagos y Gestión",
    icon: DollarSign,
    children: [
      { href: "/apoderado/pagos", label: "Pagos", icon: DollarSign },
      { href: "/apoderado/convocatorias", label: "Convocatorias", icon: Trophy },
      { href: "/apoderado/uniformes", label: "Uniformes", icon: Shirt },
      { href: "/apoderado/fotos", label: "Fotos", icon: Camera },
    ],
  },
  {
    label: "Otros",
    icon: IdCard,
    children: [
      { href: "/apoderado/credencial", label: "Credencial", icon: IdCard },
      { href: "/apoderado/justificar", label: "Justificar", icon: Send },
    ],
  },
];

function NavGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasActive = group.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive && !open) setOpen(true);
  }, [hasActive]);

  const GroupIcon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all active:scale-[0.97] ${
          hasActive
            ? "text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <GroupIcon className={`h-[18px] w-[18px] shrink-0 ${hasActive ? "text-primary" : ""}`} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="ml-3 border-l border-border/50 pl-2 py-0.5">
          {group.children.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all active:scale-[0.97] ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-primary" : ""}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ role, nombre }: { role: UserRole; nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    role === "apoderado"
      ? apoderadoNav
      : role === "admin"
      ? adminNav
      : entrenadorNav;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const closeMobile = () => setMobileOpen(false);

  const navContent = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
      {navItems.map((item, i) =>
        isGroup(item) ? (
          <NavGroupItem
            key={item.label}
            group={item}
            pathname={pathname}
            onNavigate={closeMobile}
          />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all active:scale-[0.97] ${
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon
              className={`h-[18px] w-[18px] shrink-0 ${
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  ? "text-primary"
                  : ""
              }`}
            />
            <span>{item.label}</span>
            {(pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))) && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            )}
          </Link>
        )
      )}
    </nav>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <Image
            src="/logo-af.jpg"
            alt="Acción Fútbol"
            width={36}
            height={36}
            className="rounded"
          />
          <span className="text-sm font-bold text-sidebar-foreground">
            Acción Fútbol
          </span>
        </div>

        {navContent}

        <div className="mt-auto border-t border-sidebar-border p-3">
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {nombre}
          </p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile: top bar + drawer ── */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-af.jpg"
            alt="Acción Fútbol"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-sm font-bold">Acción Fútbol</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-af.jpg"
              alt="Acción Fútbol"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="text-sm font-bold text-sidebar-foreground">
              Acción Fútbol
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            className="text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {navContent}

        <div className="mt-auto border-t border-sidebar-border p-3">
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {nombre}
          </p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}

export { Sidebar as Navbar };
