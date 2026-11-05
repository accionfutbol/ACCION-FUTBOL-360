"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  AlertTriangle,
  UserX,
  Phone,
  Calendar,
  Shield,
} from "lucide-react";

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}

interface AlertaJugador {
  jugador_id: string;
  nombre: string;
  categoria_nombre: string;
  sede_nombre: string;
  faltas_sin_justificar: number;
  total_sesiones: number;
  telefono_apoderado: string | null;
  telefono_jugador: string | null;
}

export default function AlertasPage() {
  const supabase = createClient();
  const [alertas, setAlertas] = useState<AlertaJugador[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [umbral, setUmbral] = useState(3);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [{ data: sed }, { data: cat }] = await Promise.all([
      supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
      supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
    ]);
    setSedes((sed ?? []) as Sede[]);
    setCategorias((cat ?? []) as Categoria[]);

    // Get active jugadores
    let jugQ = supabase.from("jugadores")
      .select("id, nombre, categoria_id, sede_id, telefono_apoderado, telefono_jugador")
      .in("estado", ["ACTIVO", "FULL", "NEW", "BECADO"]);
    if (sedeId) jugQ = jugQ.eq("sede_id", sedeId);
    if (catId) jugQ = jugQ.eq("categoria_id", catId);

    const { data: jugs } = await jugQ as unknown as { data: any[]; error: any };
    if (!jugs || jugs.length === 0) { setAlertas([]); setLoading(false); return; }

    const jugIds = jugs.map((j: any) => j.id);

    // Get last 30 days of asistencia
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get sesiones in period
    const { data: sesiones } = await supabase
      .from("sesiones_entrenamiento")
      .select("id")
      .gte("fecha", thirtyDaysAgo.toISOString().slice(0, 10)) as { data: any[]; error: any };

    const sesionIds = (sesiones ?? []).map((s: any) => s.id);
    if (sesionIds.length === 0) { setAlertas([]); setLoading(false); return; }

    // Get asistencia records
    const { data: asist } = await supabase
      .from("asistencia")
      .select("jugador_id, marca, sesion_id")
      .in("jugador_id", jugIds)
      .in("sesion_id", sesionIds) as { data: any[]; error: any };

    // Get justificaciones in period
    const { data: justifs } = await supabase
      .from("justificaciones")
      .select("jugador_id, fecha")
      .in("jugador_id", jugIds)
      .gte("fecha", thirtyDaysAgo.toISOString().slice(0, 10)) as { data: any[]; error: any };

    const justifSet = new Set<string>();
    (justifs ?? []).forEach((j: any) => justifSet.add(`${j.jugador_id}_${j.fecha}`));

    // Count per jugador
    const faltasPorJugador = new Map<string, { faltas: number; total: number }>();
    (asist ?? []).forEach((a: any) => {
      if (!faltasPorJugador.has(a.jugador_id)) {
        faltasPorJugador.set(a.jugador_id, { faltas: 0, total: 0 });
      }
      const entry = faltasPorJugador.get(a.jugador_id)!;
      entry.total++;
      if (a.marca === "F") {
        entry.faltas++;
      }
    });

    const sedeMap = new Map((sed ?? []).map((s: any) => [s.id, s.nombre]));
    const catMap = new Map((cat ?? []).map((c: any) => [c.id, c.nombre]));

    const result: AlertaJugador[] = jugs
      .map((j: any) => {
        const stats = faltasPorJugador.get(j.id);
        if (!stats || stats.faltas < umbral) return null;
        return {
          jugador_id: j.id,
          nombre: j.nombre,
          categoria_nombre: catMap.get(j.categoria_id) ?? "—",
          sede_nombre: sedeMap.get(j.sede_id) ?? "—",
          faltas_sin_justificar: stats.faltas,
          total_sesiones: stats.total,
          telefono_apoderado: j.telefono_apoderado,
          telefono_jugador: j.telefono_jugador,
        };
      })
      .filter(Boolean) as AlertaJugador[];

    result.sort((a, b) => b.faltas_sin_justificar - a.faltas_sin_justificar);
    setAlertas(result);
    setLoading(false);
  }, [supabase, sedeId, catId, umbral]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCats = categorias.filter((c) => !sedeId || c.sede_id === sedeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alertas de Inasistencia</h1>
        <Badge variant="outline" className="text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" /> Últimos 30 días
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCatId(""); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todas las sedes">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Todas las sedes"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las sedes</SelectItem>
            {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={catId} onValueChange={(v: string | null) => setCatId(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las categorías">{catId ? filteredCats.find((c) => c.id === catId)?.nombre : "Todas las categorías"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las categorías</SelectItem>
            {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={String(umbral)} onValueChange={(v: string | null) => setUmbral(Number(v ?? "3"))}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Umbral">{`≥ ${umbral} faltas`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2+ faltas</SelectItem>
            <SelectItem value="3">3+ faltas</SelectItem>
            <SelectItem value="5">5+ faltas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Shield className="h-8 w-8" />
          <p>No hay alertas de inasistencia</p>
          <p className="text-xs">Ningún jugador supera el umbral de {umbral} faltas en 30 días</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              {alertas.length} jugador{alertas.length !== 1 ? "es" : ""} con {umbral}+ faltas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">Sesiones</TableHead>
                    <TableHead>Contacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertas.map((a) => (
                    <TableRow key={a.jugador_id}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell className="text-xs">{a.categoria_nombre}</TableCell>
                      <TableCell className="text-xs">{a.sede_nombre}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-500/20 text-red-400">
                          {a.faltas_sin_justificar}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">{a.total_sesiones}</TableCell>
                      <TableCell>
                        {a.telefono_apoderado ? (
                          <a
                            href={`https://wa.me/56${a.telefono_apoderado.replace(/\D/g, "").replace(/^56/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
