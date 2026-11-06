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
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/lib/types";

const entrenadorLinks = [
  { href: "/entrenador/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entrenador/planificador", label: "Planificador", icon: CalendarDays },
  { href: "/entrenador/asistencia", label: "Asistencia", icon: ClipboardList },
  { href: "/entrenador/reporte-entrenamiento", label: "Reporte DT", icon: FileText },
  { href: "/entrenador/reporte", label: "Reportes", icon: BarChart3 },
  { href: "/entrenador/partidos", label: "Partidos", icon: Trophy },
  { href: "/entrenador/evaluaciones", label: "Evaluaciones", icon: Star },
  { href: "/entrenador/eval-fisicas", label: "Eval. Físicas", icon: Activity },
  { href: "/entrenador/jugadores", label: "Data Jugadores", icon: Users },
  { href: "/entrenador/convocatorias", label: "Convocatorias", icon: Send },
  { href: "/entrenador/uniformes", label: "Uniformes", icon: Shirt },
  { href: "/entrenador/torneos", label: "Torneos", icon: Award },
  { href: "/entrenador/alertas", label: "Alertas", icon: AlertTriangle },
  { href: "/entrenador/comunicaciones", label: "Avisos", icon: Megaphone },
];

const adminLinks = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/pagos", label: "Pagos", icon: DollarSign },
  { href: "/admin/sedes", label: "Sedes", icon: MapPin },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/admin/inscripciones", label: "Inscripciones", icon: UserPlus },
  { href: "/admin/reportes", label: "Reportes", icon: FileSpreadsheet },
  { href: "/entrenador/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entrenador/asistencia", label: "Asistencia", icon: ClipboardList },
  { href: "/entrenador/reporte", label: "Reportes", icon: BarChart3 },
  { href: "/entrenador/partidos", label: "Partidos", icon: Trophy },
  { href: "/entrenador/evaluaciones", label: "Evaluaciones", icon: Star },
  { href: "/entrenador/eval-fisicas", label: "Eval. Físicas", icon: Activity },
  { href: "/entrenador/jugadores", label: "Data Jugadores", icon: Users },
  { href: "/entrenador/convocatorias", label: "Convocatorias", icon: Send },
  { href: "/entrenador/uniformes", label: "Uniformes", icon: Shirt },
  { href: "/entrenador/torneos", label: "Torneos", icon: Award },
  { href: "/entrenador/alertas", label: "Alertas", icon: AlertTriangle },
  { href: "/entrenador/comunicaciones", label: "Avisos", icon: Megaphone },
];

const apoderadoLinks = [
  { href: "/apoderado", label: "Inicio", icon: Home },
  { href: "/apoderado/asistencia", label: "Asistencia", icon: ClipboardList },
  { href: "/apoderado/planificacion", label: "Planificación", icon: CalendarDays },
  { href: "/apoderado/partidos", label: "Partidos", icon: Trophy },
  { href: "/apoderado/evaluaciones", label: "Evaluaciones", icon: Activity },
  { href: "/apoderado/pagos", label: "Pagos", icon: DollarSign },
  { href: "/apoderado/convocatorias", label: "Convocatorias", icon: Trophy },
  { href: "/apoderado/credencial", label: "Credencial", icon: IdCard },
  { href: "/apoderado/justificar", label: "Justificar", icon: Send },
];

export function Sidebar({ role, nombre }: { role: UserRole; nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = role === "apoderado" ? apoderadoLinks : role === "admin" ? adminLinks : entrenadorLinks;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navContent = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all active:scale-[0.97] ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : ""}`} />
            <span>{link.label}</span>
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            )}
          </Link>
        );
      })}
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
          onClick={() => setMobileOpen(false)}
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
            onClick={() => setMobileOpen(false)}
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
