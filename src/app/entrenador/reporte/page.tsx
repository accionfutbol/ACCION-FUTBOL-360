"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Users, CalendarDays, TrendingUp, AlertTriangle, CalendarIcon } from "lucide-react";
import { es } from "react-day-picker/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

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

interface SesionDetalle {
  fecha: string;
  ok: number;
  f: number;
  j: number;
  l: number;
  total: number;
}

const COLORS_MARCA = {
  OK: "#10b981",
  F: "#ef4444",
  J: "#eab308",
  L: "#3b82f6",
};

function colorPorcentaje(p: number) {
  if (p >= 80) return "#10b981";
  if (p >= 50) return "#eab308";
  return "#ef4444";
}

function parseDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatFecha(iso: string) {
  const d = parseDate(iso);
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
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
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split("T")[0]);
  const [reporte, setReporte] = useState<ReporteJugador[]>([]);
  const [sesiones, setSesiones] = useState<SesionDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdmin = profile?.role === "admin";

      const { data: allSedes } = await supabase
        .from("sedes")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");

      const { data: allCats } = await supabase
        .from("categorias")
        .select("id, nombre, sede_id")
        .eq("activa", true)
        .order("nombre");

      if (!allSedes || !allCats) return;

      if (isAdmin) {
        setSedes(allSedes);
        setCategorias(allCats);
      } else {
        const { data: entrenador } = await supabase
          .from("entrenadores")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!entrenador) return;

        const { data: permisos } = await supabase
          .from("entrenador_categoria")
          .select("categoria_id")
          .eq("entrenador_id", entrenador.id);

        const catIds = new Set((permisos ?? []).map((p: any) => p.categoria_id));
        const filteredCats = allCats.filter((c) => catIds.has(c.id));
        const sedeIds = new Set(filteredCats.map((c) => c.sede_id));

        setSedes(allSedes.filter((s) => sedeIds.has(s.id)));
        setCategorias(filteredCats);
      }
      setLoadingConfig(false);
    }
    load();
  }, [supabase]);

  const catsFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const generarReporte = useCallback(async () => {
    if ((!categoriaId && !sedeId) || !desde || !hasta) return;
    setLoading(true);

    let query = supabase
      .from("sesiones_entrenamiento")
      .select("id, fecha")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha");

    if (categoriaId && categoriaId !== "todas") {
      query = query.eq("categoria_id", categoriaId);
    } else if (sedeId) {
      const catIds = catsFiltered.map((c) => c.id);
      query = query.in("categoria_id", catIds);
    }

    const { data: sesionesData } = await query;

    if (!sesionesData || sesionesData.length === 0) {
      setReporte([]);
      setSesiones([]);
      setLoading(false);
      return;
    }

    const sesionIds = sesionesData.map((s) => s.id);

    const { data: marcas } = await supabase
      .from("asistencia")
      .select("jugador_id, marca, sesion_id, jugadores(nombre, rut)")
      .in("sesion_id", sesionIds);

    if (!marcas) {
      setReporte([]);
      setSesiones([]);
      setLoading(false);
      return;
    }

    const agrupado: Record<string, ReporteJugador> = {};
    const sesionMap: Record<string, SesionDetalle> = {};

    sesionesData.forEach((s) => {
      sesionMap[s.id] = { fecha: s.fecha, ok: 0, f: 0, j: 0, l: 0, total: 0 };
    });

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
      const marca = m.marca as string;
      if (marca === "OK") { agrupado[jid].ok++; }
      else if (marca === "F") { agrupado[jid].f++; }
      else if (marca === "J") { agrupado[jid].j++; }
      else if (marca === "L") { agrupado[jid].l++; }

      if (sesionMap[m.sesion_id]) {
        sesionMap[m.sesion_id].total++;
        if (marca === "OK") sesionMap[m.sesion_id].ok++;
        else if (marca === "F") sesionMap[m.sesion_id].f++;
        else if (marca === "J") sesionMap[m.sesion_id].j++;
        else if (marca === "L") sesionMap[m.sesion_id].l++;
      }
    });

    const resultado = Object.values(agrupado)
      .map((j) => ({
        ...j,
        porcentaje: j.total > 0 ? Math.round((j.ok / j.total) * 100) : 0,
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);

    setReporte(resultado);
    setSesiones(Object.values(sesionMap));
    setLoading(false);
  }, [categoriaId, sedeId, catsFiltered, desde, hasta, supabase]);

  const totalOK = reporte.reduce((s, j) => s + j.ok, 0);
  const totalF = reporte.reduce((s, j) => s + j.f, 0);
  const totalJ = reporte.reduce((s, j) => s + j.j, 0);
  const totalL = reporte.reduce((s, j) => s + j.l, 0);
  const totalMarcas = totalOK + totalF + totalJ + totalL;
  const promedioGeneral = totalMarcas > 0 ? Math.round((totalOK / totalMarcas) * 100) : 0;

  const pieData = [
    { name: "Presente", value: totalOK, color: COLORS_MARCA.OK },
    { name: "Falta", value: totalF, color: COLORS_MARCA.F },
    { name: "Justificado", value: totalJ, color: COLORS_MARCA.J },
    { name: "Lesionado", value: totalL, color: COLORS_MARCA.L },
  ].filter((d) => d.value > 0);

  const barData = reporte.map((j) => ({
    nombre: j.nombre.split(" ").slice(0, 2).join(" "),
    porcentaje: j.porcentaje,
  }));

  const alertas = reporte.filter((j) => j.f >= 3 && j.porcentaje < 60);

  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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
              setCategoriaId("todas");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sede">
                {sedeId && sedes.find((s) => s.id === sedeId)?.nombre}
              </SelectValue>
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
              <SelectValue placeholder="Categoría">
                {categoriaId === "todas"
                  ? "Todas las categorías"
                  : categoriaId
                    ? categorias.find((c) => c.id === categoriaId)?.nombre
                    : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
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
          <Popover>
            <PopoverTrigger
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <span>{formatFecha(desde)}</span>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={parseDate(desde)}
                onSelect={(d) => d && setDesde(toISO(d))}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>Hasta</Label>
          <Popover>
            <PopoverTrigger
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <span>{formatFecha(hasta)}</span>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={parseDate(hasta)}
                onSelect={(d) => d && setHasta(toISO(d))}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Button onClick={generarReporte} disabled={(!categoriaId && !sedeId) || loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Generar Reporte
      </Button>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && reporte.length > 0 && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{sesiones.length}</span>
                <span className="text-xs text-muted-foreground">Sesiones</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{reporte.length}</span>
                <span className="text-xs text-muted-foreground">Jugadores</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span
                  className="text-2xl font-bold"
                  style={{ color: colorPorcentaje(promedioGeneral) }}
                >
                  {promedioGeneral}%
                </span>
                <span className="text-xs text-muted-foreground">
                  Asistencia
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold text-red-400">
                  {alertas.length}
                </span>
                <span className="text-xs text-muted-foreground">Alertas</span>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Barras - asistencia por jugador */}
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  % Asistencia por Jugador
                </h3>
                <div style={{ height: Math.max(200, barData.length * 28) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#999" }} />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={120}
                        tick={{ fontSize: 11, fill: "#ccc" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: unknown) => [`${v}%`, "Asistencia"]}
                      />
                      <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
                        {barData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={colorPorcentaje(entry.porcentaje)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Donut - distribución */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Distribución</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground">
                        {d.name} ({d.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle por sesión */}
          {sesiones.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Detalle por Sesión</h3>
                <div className="space-y-2">
                  {sesiones.map((s) => {
                    const pct =
                      s.total > 0 ? Math.round((s.ok / s.total) * 100) : 0;
                    const d = new Date(s.fecha + "T12:00:00");
                    return (
                      <div
                        key={s.fecha}
                        className="flex items-center gap-3 rounded-md border border-border p-2"
                      >
                        <div className="w-24 text-sm">
                          <span className="font-medium">
                            {s.fecha.split("-").reverse().join("/")}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {DIAS[d.getDay()]}
                          </span>
                        </div>
                        <div className="flex flex-1 items-center gap-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: colorPorcentaje(pct),
                              minWidth: 4,
                            }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: colorPorcentaje(pct) }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="flex gap-1.5 text-xs">
                          <span className="text-emerald-400">{s.ok}</span>
                          <span className="text-red-400">{s.f}</span>
                          <span className="text-yellow-400">{s.j}</span>
                          <span className="text-blue-400">{s.l}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alertas */}
          {alertas.length > 0 && (
            <Card className="border-red-500/30">
              <CardContent className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Jugadores con baja asistencia (3+ faltas, &lt;60%)
                </h3>
                <div className="space-y-2">
                  {alertas.map((j) => (
                    <div
                      key={j.rut}
                      className="flex items-center gap-3 rounded-md border border-red-500/20 p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {j.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">{j.rut}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-red-500/30 text-red-400"
                      >
                        {j.f} faltas
                      </Badge>
                      <span className="text-sm font-bold text-red-400">
                        {j.porcentaje}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla detallada */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">
                Detalle por Jugador
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3">Jugador</th>
                      <th className="pb-2 px-2 text-center text-emerald-400">OK</th>
                      <th className="pb-2 px-2 text-center text-red-400">F</th>
                      <th className="pb-2 px-2 text-center text-yellow-400">J</th>
                      <th className="pb-2 px-2 text-center text-blue-400">L</th>
                      <th className="pb-2 pl-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.map((j) => (
                      <tr
                        key={j.rut}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 pr-3">
                          <p className="truncate font-medium">{j.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {j.rut}
                          </p>
                        </td>
                        <td className="px-2 text-center">{j.ok}</td>
                        <td className="px-2 text-center">{j.f}</td>
                        <td className="px-2 text-center">{j.j}</td>
                        <td className="px-2 text-center">{j.l}</td>
                        <td className="pl-2 text-right">
                          <span
                            className="font-bold"
                            style={{ color: colorPorcentaje(j.porcentaje) }}
                          >
                            {j.porcentaje}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && reporte.length === 0 && (categoriaId || sedeId) && (
        <p className="py-8 text-center text-muted-foreground">
          Sin datos para el rango seleccionado.
        </p>
      )}

      {!loading && !categoriaId && (
        <p className="py-8 text-center text-muted-foreground">
          Selecciona una sede y categoría para generar el reporte.
        </p>
      )}
    </div>
  );
}
