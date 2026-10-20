"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ReporteJugador {
  nombre: string;
  rut: string;
  ok: number;
  f: number;
  j: number;
  l: number;
  total: number;
  porcentaje: number;
}

export default function ReportePage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<
    { id: string; nombre: string; sede_id: string }[]
  >([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split("T")[0]);
  const [reporte, setReporte] = useState<ReporteJugador[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase
        .from("sedes")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");
      const { data: c } = await supabase
        .from("categorias")
        .select("id, nombre, sede_id")
        .eq("activa", true)
        .order("nombre");
      if (s) setSedes(s);
      if (c) setCategorias(c);
    }
    load();
  }, [supabase]);

  const catsFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const generarReporte = useCallback(async () => {
    if (!categoriaId || !desde || !hasta) return;
    setLoading(true);

    const { data: sesiones } = await supabase
      .from("sesiones_entrenamiento")
      .select("id")
      .eq("categoria_id", categoriaId)
      .gte("fecha", desde)
      .lte("fecha", hasta);

    if (!sesiones || sesiones.length === 0) {
      setReporte([]);
      setLoading(false);
      return;
    }

    const sesionIds = sesiones.map((s) => s.id);

    const { data: marcas } = await supabase
      .from("asistencia")
      .select("jugador_id, marca, jugadores(nombre, rut)")
      .in("sesion_id", sesionIds);

    if (!marcas) {
      setReporte([]);
      setLoading(false);
      return;
    }

    const agrupado: Record<
      string,
      ReporteJugador
    > = {};

    marcas.forEach((m: any) => {
      const jid = m.jugador_id;
      if (!agrupado[jid]) {
        agrupado[jid] = {
          nombre: m.jugadores?.nombre ?? "",
          rut: m.jugadores?.rut ?? "",
          ok: 0,
          f: 0,
          j: 0,
          l: 0,
          total: 0,
          porcentaje: 0,
        };
      }
      agrupado[jid].total++;
      if (m.marca === "OK") agrupado[jid].ok++;
      else if (m.marca === "F") agrupado[jid].f++;
      else if (m.marca === "J") agrupado[jid].j++;
      else if (m.marca === "L") agrupado[jid].l++;
    });

    const resultado = Object.values(agrupado)
      .map((j) => ({
        ...j,
        porcentaje: j.total > 0 ? Math.round((j.ok / j.total) * 100) : 0,
      }))
      .sort((a, b) => a.porcentaje - b.porcentaje);

    setReporte(resultado);
    setLoading(false);
  }, [categoriaId, desde, hasta, supabase]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reporte de Asistencia</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select
            value={sedeId}
            onValueChange={(v: string | null) => {
              setSedeId(v ?? "");
              setCategoriaId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select
            value={categoriaId}
            onValueChange={(v: string | null) => setCategoriaId(v ?? "")}
            disabled={!sedeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {catsFiltered.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Desde</Label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={generarReporte} disabled={!categoriaId || loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Generar Reporte
      </Button>

      {reporte.length > 0 && (
        <div className="space-y-2">
          {reporte.map((j) => (
            <div
              key={j.rut}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{j.nombre}</p>
                <p className="text-xs text-muted-foreground">{j.rut}</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400"
                >
                  {j.ok}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-red-500/30 text-red-400"
                >
                  {j.f}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 text-yellow-400"
                >
                  {j.j}
                </Badge>
              </div>

              <div
                className={`w-14 text-right text-sm font-bold ${
                  j.porcentaje >= 80
                    ? "text-emerald-400"
                    : j.porcentaje >= 50
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {j.porcentaje}%
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && reporte.length === 0 && categoriaId && (
        <p className="py-8 text-center text-muted-foreground">
          Sin datos para el rango seleccionado.
        </p>
      )}
    </div>
  );
}
