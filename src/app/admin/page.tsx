"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Loader2,
  Users,
  DollarSign,
  AlertCircle,
  Trophy,
  ChevronRight,
} from "lucide-react";

interface Stats {
  totalJugadores: number;
  activos: number;
  morosos: number;
  partidosMes: number;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({ totalJugadores: 0, activos: 0, morosos: 0, partidosMes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [jugRes, morosRes, partRes] = await Promise.all([
        supabase.from("jugadores").select("id, estado", { count: "exact", head: false }),
        supabase.from("mensualidades").select("id", { count: "exact", head: true }).eq("estado", "ATRASADO"),
        supabase.from("partidos").select("id", { count: "exact", head: true })
          .gte("fecha", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
      ]);

      const jugadores = jugRes.data ?? [];
      const activos = jugadores.filter((j: any) => j.estado === "ACTIVO" || j.estado === "FULL" || j.estado === "NEW" || j.estado === "BECADO").length;

      setStats({
        totalJugadores: jugRes.count ?? jugadores.length,
        activos,
        morosos: morosRes.count ?? 0,
        partidosMes: partRes.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Panel Admin</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalJugadores}</p>
              <p className="text-xs text-muted-foreground">Jugadores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{stats.activos}</p>
              <p className="text-xs text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{stats.morosos}</p>
              <p className="text-xs text-muted-foreground">Pagos atrasados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{stats.partidosMes}</p>
              <p className="text-xs text-muted-foreground">Partidos este mes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/pagos">
          <Card className="group cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Gestión de Pagos</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Registrar pagos, ver morosos, filtrar por sede y categoría
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/entrenador/jugadores">
          <Card className="group cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Data Jugadores</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Buscar jugadores, ver fichas completas, estados
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
