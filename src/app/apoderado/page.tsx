"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Loader2,
  Trophy,
  DollarSign,
  Megaphone,
  ChevronRight,
  Timer,
  Goal,
} from "lucide-react";

interface HijoResumen {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
  sede: string;
  sedeId: string;
  categoria: string;
  categoriaId: string;
  asistencia: { ok: number; f: number; j: number; l: number };
}

interface ProximoPartido {
  fecha: string;
  rival: string;
  torneo: string | null;
}

interface ResumenPago {
  pendientes: number;
  atrasados: number;
}

interface UltimoPartidoStats {
  fecha: string;
  rival: string;
  resultado: string;
  jugadorNombre: string;
  minutos: number;
  goles: number;
  asistencias: number;
  estado: string;
}

interface Aviso {
  id: string;
  titulo: string;
  tipo: string;
  created_at: string;
}

export default function ApoderadoDashboard() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoResumen[]>([]);
  const [proximoPartido, setProximoPartido] = useState<ProximoPartido | null>(null);
  const [resumenPagos, setResumenPagos] = useState<ResumenPago>({ pendientes: 0, atrasados: 0 });
  const [ultimoPartido, setUltimoPartido] = useState<UltimoPartidoStats | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
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
        .select("jugador_id")
        .eq("apoderado_id", apoderado.id);

      if (!relaciones || relaciones.length === 0) { setLoading(false); return; }

      const jugadorIds = relaciones.map((r) => r.jugador_id);

      const { data: jugadores } = await supabase
        .from("jugadores")
        .select("id, nombre, rut, estado, sede_id, categoria_id, sedes(nombre), categorias(nombre)")
        .in("id", jugadorIds) as { data: any[] | null; error: any };

      if (!jugadores) { setLoading(false); return; }

      const { data: marcas } = await supabase
        .from("asistencia")
        .select("jugador_id, marca")
        .in("jugador_id", jugadorIds);

      const asistenciaMap: Record<string, { ok: number; f: number; j: number; l: number }> = {};
      marcas?.forEach((m) => {
        if (!asistenciaMap[m.jugador_id]) {
          asistenciaMap[m.jugador_id] = { ok: 0, f: 0, j: 0, l: 0 };
        }
        const key = m.marca.toLowerCase() as "ok" | "f" | "j" | "l";
        if (key in asistenciaMap[m.jugador_id]) {
          asistenciaMap[m.jugador_id][key]++;
        }
      });

      setHijos(
        jugadores.map((j: any) => ({
          id: j.id,
          nombre: j.nombre,
          rut: j.rut,
          estado: j.estado,
          sede: j.sedes?.nombre ?? "",
          sedeId: j.sede_id,
          categoria: j.categorias?.nombre ?? "",
          categoriaId: j.categoria_id,
          asistencia: asistenciaMap[j.id] ?? { ok: 0, f: 0, j: 0, l: 0 },
        }))
      );

      // Próximo partido
      const hoy = new Date().toISOString().slice(0, 10);
      const categoriaIds = jugadores.map((j: any) => j.categoria_id).filter(Boolean);
      if (categoriaIds.length > 0) {
        const { data: partidos } = await supabase
          .from("partidos")
          .select("fecha, rival, torneo")
          .in("categoria_id", categoriaIds)
          .gte("fecha", hoy)
          .order("fecha", { ascending: true })
          .limit(1);
        if (partidos?.length) {
          setProximoPartido(partidos[0] as ProximoPartido);
        }
      }

      // Último partido jugado
      const { data: ultimoPJ } = await supabase
        .from("partido_jugador")
        .select("partido_id, jugador_id, estado, minutos, goles, asistencias_gol")
        .in("jugador_id", jugadorIds)
        .neq("estado", "NO_CITADO")
        .order("created_at", { ascending: false })
        .limit(20) as { data: any[] | null; error: any };

      if (ultimoPJ && ultimoPJ.length > 0) {
        const partidoIds = [...new Set(ultimoPJ.map((p: any) => p.partido_id))];
        const { data: partidosData } = await supabase
          .from("partidos")
          .select("id, fecha, rival, marcador_favor, marcador_contra")
          .in("id", partidoIds)
          .order("fecha", { ascending: false })
          .limit(1);

        if (partidosData?.length) {
          const partido = partidosData[0] as any;
          const pjRecord = ultimoPJ.find((p: any) => p.partido_id === partido.id);
          const jugNombre = jugadores.find((j: any) => j.id === pjRecord?.jugador_id)?.nombre ?? "";
          setUltimoPartido({
            fecha: partido.fecha,
            rival: partido.rival,
            resultado: `${partido.marcador_favor}-${partido.marcador_contra}`,
            jugadorNombre: jugNombre,
            minutos: pjRecord?.minutos ?? 0,
            goles: pjRecord?.goles ?? 0,
            asistencias: pjRecord?.asistencias_gol ?? 0,
            estado: pjRecord?.estado ?? "",
          });
        }
      }

      // Resumen pagos
      const { data: msgs } = await supabase
        .from("mensualidades")
        .select("estado")
        .in("jugador_id", jugadorIds);
      if (msgs) {
        setResumenPagos({
          pendientes: msgs.filter(m => m.estado === "PENDIENTE").length,
          atrasados: msgs.filter(m => m.estado === "ATRASADO").length,
        });
      }

      // Avisos recientes
      const sedeIds = jugadores.map((j: any) => j.sede_id).filter(Boolean);
      const { data: comms } = await supabase
        .from("comunicaciones")
        .select("id, titulo, tipo, created_at")
        .or(`para_todos.eq.true${sedeIds.length ? `,sede_id.in.(${sedeIds.join(",")})` : ""}${categoriaIds.length ? `,categoria_id.in.(${categoriaIds.join(",")})` : ""}`)
        .order("created_at", { ascending: false })
        .limit(5);
      setAvisos((comms ?? []) as Aviso[]);

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

  if (hijos.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay jugadores asociados a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Mi Panel</h1>

      {/* Ficha rápida de cada hijo */}
      {hijos.map((hijo) => {
        const total = hijo.asistencia.ok + hijo.asistencia.f + hijo.asistencia.j + hijo.asistencia.l;
        const pct = total > 0 ? Math.round((hijo.asistencia.ok / total) * 100) : 0;

        return (
          <Card key={hijo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{hijo.nombre}</CardTitle>
                <Badge variant="outline">{hijo.estado}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {hijo.rut} · {hijo.sede} · {hijo.categoria}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex h-2 overflow-hidden rounded-full bg-muted">
                    {total > 0 && (
                      <>
                        <div className="bg-emerald-500" style={{ width: `${(hijo.asistencia.ok / total) * 100}%` }} />
                        <div className="bg-yellow-500" style={{ width: `${(hijo.asistencia.j / total) * 100}%` }} />
                        <div className="bg-blue-500" style={{ width: `${(hijo.asistencia.l / total) * 100}%` }} />
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>OK: {hijo.asistencia.ok}</span>
                    <span>F: {hijo.asistencia.f}</span>
                    <span>J: {hijo.asistencia.j}</span>
                    <span>L: {hijo.asistencia.l}</span>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {pct}%
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Widgets rápidos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Último partido jugado */}
        <Link href="/apoderado/partidos">
          <Card className="group cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Goal className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Último Partido</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent>
              {ultimoPartido ? (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold">vs {ultimoPartido.rival}</p>
                    <Badge variant="outline" className="text-xs">{ultimoPartido.resultado}</Badge>
                  </div>
                  <div className="mt-1.5 flex gap-4 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Timer className="h-3 w-3" /> {ultimoPartido.minutos} min
                    </span>
                    {ultimoPartido.goles > 0 && (
                      <span className="font-semibold text-emerald-400">
                        {ultimoPartido.goles} gol{ultimoPartido.goles > 1 ? "es" : ""}
                      </span>
                    )}
                    {ultimoPartido.asistencias > 0 && (
                      <span className="font-semibold text-blue-400">
                        {ultimoPartido.asistencias} asist.
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {ultimoPartido.fecha} · {ultimoPartido.estado}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin partidos registrados</p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Próximo partido */}
        <Link href="/apoderado/partidos">
          <Card className="group cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Próximo Partido</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent>
              {proximoPartido ? (
                <div>
                  <p className="text-lg font-bold">{proximoPartido.rival}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{proximoPartido.fecha}</span>
                    {proximoPartido.torneo && <span>· {proximoPartido.torneo}</span>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin partidos programados</p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Estado de pagos */}
        <Link href="/apoderado/pagos">
          <Card className="group cursor-pointer transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Pagos</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent>
              {resumenPagos.pendientes === 0 && resumenPagos.atrasados === 0 ? (
                <p className="text-sm font-medium text-emerald-400">Al día</p>
              ) : (
                <div className="flex gap-4">
                  {resumenPagos.pendientes > 0 && (
                    <div>
                      <p className="text-lg font-bold text-yellow-400">{resumenPagos.pendientes}</p>
                      <p className="text-xs text-muted-foreground">Pendientes</p>
                    </div>
                  )}
                  {resumenPagos.atrasados > 0 && (
                    <div>
                      <p className="text-lg font-bold text-red-400">{resumenPagos.atrasados}</p>
                      <p className="text-xs text-muted-foreground">Atrasados</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Avisos recientes */}
      {avisos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Avisos Recientes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {avisos.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded px-2 py-1.5 text-sm odd:bg-muted/30">
                  <div>
                    <p className="font-medium">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{a.tipo}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
