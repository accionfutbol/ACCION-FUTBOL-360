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
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/lib/types";

const entrenadorLinks = [
  { href: "/entrenador/asistencia", label: "Asistencia", icon: ClipboardList },
  { href: "/entrenador/reporte", label: "Reportes", icon: BarChart3 },
  { href: "/entrenador/jugadores", label: "Jugadores", icon: Users },
];

const apoderadoLinks = [
  { href: "/apoderado", label: "Inicio", icon: ClipboardList },
  { href: "/apoderado/asistencia", label: "Asistencia", icon: BarChart3 },
];

export function Navbar({ role, nombre }: { role: UserRole; nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = role === "apoderado" ? apoderadoLinks : entrenadorLinks;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-af.jpg"
            alt="Acción Fútbol"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="hidden text-sm font-medium sm:inline">
            Acción Fútbol
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {nombre}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="hidden md:inline-flex"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="flex flex-col p-2">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
