"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trophy, Clock, Target, AlertTriangle } from "lucide-react";

interface PartidoJugador {
  partido_id: string;
  estado: string;
  minutos: number;
  posicion: string | null;
  goles: number;
  asistencias_gol: number;
  tarj_amarilla: number;
  tarj_roja: number;
  nota: number | null;
  partido: {
    fecha: string;
    rival: string;
    torneo: string | null;
    resultado: string | null;
    marcador_favor: number;
    marcador_contra: number;
  };
}

interface StatsAcumuladas {
  totalPartidos: number;
  totalMinutos: number;
  totalGoles: number;
  totalAsistencias: number;
  totalAmarillas: number;
  totalRojas: number;
  titular: number;
  suplente: number;
}

interface HijoPartidos {
  nombre: string;
  jugadorId: string;
  partidos: PartidoJugador[];
  stats: StatsAcumuladas;
}

function calcStats(partidos: PartidoJugador[]): StatsAcumuladas {
  return partidos.reduce(
    (acc, p) => ({
      totalPartidos: acc.totalPartidos + 1,
      totalMinutos: acc.totalMinutos + p.minutos,
      totalGoles: acc.totalGoles + p.goles,
      totalAsistencias: acc.totalAsistencias + p.asistencias_gol,
      totalAmarillas: acc.totalAmarillas + p.tarj_amarilla,
      totalRojas: acc.totalRojas + p.tarj_roja,
      titular: acc.titular + (p.estado === "TITULAR" ? 1 : 0),
      suplente: acc.suplente + (p.estado === "SUPLENTE" || p.estado === "INGRESO" ? 1 : 0),
    }),
    { totalPartidos: 0, totalMinutos: 0, totalGoles: 0, totalAsistencias: 0, totalAmarillas: 0, totalRojas: 0, titular: 0, suplente: 0 }
  );
}

function resultadoColor(res: string | null) {
  if (!res) return "bg-muted text-muted-foreground";
  if (res === "VICTORIA") return "bg-emerald-500/20 text-emerald-400";
  if (res === "DERROTA") return "bg-red-500/20 text-red-400";
  return "bg-yellow-500/20 text-yellow-400";
}

export default function ApoderadoPartidosPage() {
  const supabase = createClient();
  const [hijosData, setHijosData] = useState<HijoPartidos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apoderado } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!apoderado) { setLoading(false); return; }

      const { data: relaciones } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id, jugadores(nombre)")
        .eq("apoderado_id", apoderado.id) as { data: any[] | null; error: any };

      if (!relaciones?.length) { setLoading(false); return; }

      const result: HijoPartidos[] = [];

      for (const rel of relaciones) {
        const { data: pjs } = await supabase
          .from("partido_jugador")
          .select("partido_id, estado, minutos, posicion, goles, asistencias_gol, tarj_amarilla, tarj_roja, nota, partidos(fecha, rival, torneo, resultado, marcador_favor, marcador_contra)")
          .eq("jugador_id", rel.jugador_id)
          .order("created_at", { ascending: false }) as { data: any[] | null; error: any };

        const partidos: PartidoJugador[] = (pjs ?? []).map((pj: any) => ({
          ...pj,
          partido: pj.partidos,
        }));

        result.push({
          nombre: rel.jugadores?.nombre ?? "",
          jugadorId: rel.jugador_id,
          partidos,
          stats: calcStats(partidos),
        });
      }

      setHijosData(result);
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

  if (hijosData.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay jugadores asociados a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Partidos</h1>

      {hijosData.map((hijo) => (
        <div key={hijo.jugadorId} className="space-y-4">
          <h2 className="text-lg font-semibold">{hijo.nombre}</h2>

          {/* Stats acumuladas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{hijo.stats.totalPartidos}</p>
                  <p className="text-xs text-muted-foreground">Partidos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{hijo.stats.totalMinutos}'</p>
                  <p className="text-xs text-muted-foreground">Minutos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Target className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold">{hijo.stats.totalGoles}</p>
                  <p className="text-xs text-muted-foreground">Goles</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{hijo.stats.totalAmarillas}/{hijo.stats.totalRojas}</p>
                  <p className="text-xs text-muted-foreground">TA / TR</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle titularidad */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Titular: <strong className="text-foreground">{hijo.stats.titular}</strong></span>
            <span>Suplente/Ingreso: <strong className="text-foreground">{hijo.stats.suplente}</strong></span>
            <span>Asistencias de gol: <strong className="text-foreground">{hijo.stats.totalAsistencias}</strong></span>
          </div>

          {/* Tabla de partidos */}
          {hijo.partidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidos registrados.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Rival</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Min</TableHead>
                        <TableHead className="text-right">Gol</TableHead>
                        <TableHead className="text-right">Asist</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hijo.partidos.map((p) => (
                        <TableRow key={p.partido_id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {p.partido.fecha}
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.partido.rival}
                          </TableCell>
                          <TableCell>
                            <Badge className={resultadoColor(p.partido.resultado)}>
                              {p.partido.marcador_favor}-{p.partido.marcador_contra}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{p.minutos}'</TableCell>
                          <TableCell className="text-right">{p.goles || "-"}</TableCell>
                          <TableCell className="text-right">{p.asistencias_gol || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}
