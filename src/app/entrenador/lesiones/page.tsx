"use client";

import { useEffect, useState } from "react";
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
import { Loader2, AlertTriangle, HeartPulse, Shield } from "lucide-react";

interface LesionRecurrente {
  jugador_id: string;
  nombre: string;
  zona: string;
  cantidad: number;
  fechas: string[];
  sede_nombre: string;
  categoria_nombre: string;
}

export default function LesionesPage() {
  const supabase = createClient();
  const [alertas, setAlertas] = useState<LesionRecurrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedeId, setSedeId] = useState("");
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [{ data: les }, { data: jugs }, { data: sed }, { data: cats }] = (await Promise.all([
        supabase.from("lesiones").select("jugador_id, zona_cuerpo, fecha_inicio"),
        supabase.from("jugadores").select("id, nombre, sede_id, categoria_id").in("estado", ["ACTIVO", "FULL", "LESIONADO", "NEW"]),
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre"),
      ])) as { data: any[] | null; error: any }[];

      setSedes((sed ?? []) as { id: string; nombre: string }[]);

      const sedeMap = new Map<string, string>((sed ?? []).map((s: any) => [s.id, s.nombre]));
      const catMap = new Map<string, string>((cats ?? []).map((c: any) => [c.id, c.nombre]));
      const jugMap = new Map<string, any>((jugs ?? []).map((j: any) => [j.id, j]));

      const porJugadorZona = new Map<string, { fechas: string[] }>();

      (les ?? []).forEach((l: any) => {
        if (!l.zona_cuerpo || !jugMap.has(l.jugador_id)) return;
        const jug = jugMap.get(l.jugador_id);
        if (sedeId && jug.sede_id !== sedeId) return;

        const key = `${l.jugador_id}__${l.zona_cuerpo.toLowerCase().trim()}`;
        if (!porJugadorZona.has(key)) {
          porJugadorZona.set(key, { fechas: [] });
        }
        porJugadorZona.get(key)!.fechas.push(l.fecha_inicio);
      });

      const result: LesionRecurrente[] = [];
      porJugadorZona.forEach((val, key) => {
        if (val.fechas.length < 2) return;
        const [jugId, zona] = key.split("__");
        const jug = jugMap.get(jugId);
        if (!jug) return;

        result.push({
          jugador_id: jugId,
          nombre: jug.nombre,
          zona,
          cantidad: val.fechas.length,
          fechas: val.fechas.sort(),
          sede_nombre: sedeMap.get(jug.sede_id) ?? "",
          categoria_nombre: catMap.get(jug.categoria_id) ?? "",
        });
      });

      result.sort((a, b) => b.cantidad - a.cantidad);
      setAlertas(result);
      setLoading(false);
    }
    load();
  }, [supabase, sedeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Lesiones Recurrentes</h1>
        <Badge variant="outline" className="text-xs">
          <HeartPulse className="mr-1 h-3 w-3" /> 2+ misma zona
        </Badge>
      </div>

      <div className="flex gap-3">
        <Select value={sedeId} onValueChange={(v: string | null) => setSedeId(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las sedes">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Todas las sedes"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las sedes</SelectItem>
            {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
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
          <p>Sin lesiones recurrentes detectadas</p>
          <p className="text-xs">Ningún jugador tiene 2+ lesiones en la misma zona</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              {alertas.length} jugador{alertas.length !== 1 ? "es" : ""} con lesiones recurrentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead className="text-center">Veces</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fechas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <p className="text-sm font-medium">{a.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">{a.sede_nombre}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-500/20 text-orange-400 capitalize">
                        {a.zona}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        a.cantidad >= 3
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }>
                        {a.cantidad}x
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.categoria_nombre}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground max-w-[120px]">
                      {a.fechas.map((f) =>
                        new Date(f + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
                      ).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
