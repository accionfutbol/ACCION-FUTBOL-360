"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, Users, UserCheck, UserX, AlertTriangle, DollarSign,
  TrendingUp, MapPin, ChevronDown, ChevronUp, ClipboardList,
  CalendarDays, Trophy, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

interface Jugador {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
  estado_mes: string | null;
  tipo: string | null;
  sede_id: string;
  categoria_id: string;
  nivel: string | null;
  pago_mensual: string | null;
  numero_morosidad: number | null;
  anio_nacimiento: number | null;
  fecha_ingreso: string | null;
  sede_nombre?: string;
  categoria_nombre?: string;
}

interface AsistenciaStat {
  jugador_id: string;
  fecha: string;
  marca: string;
}

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}

const CAPACIDAD_MAX = 50;
const ESTADOS_ACTIVOS = ["ACTIVO", "FULL", "NEW", "BECADO"];
const COLORS = ["#ff2e93", "#6495ed", "#27c281", "#ffb020", "#ff5050", "#9b59b6", "#1abc9c", "#e67e22"];

export default function DashboardPage() {
  const supabase = createClient();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedesCollapsed, setSedesCollapsed] = useState<Record<string, boolean>>({});
  const [sesionesHoy, setSesionesHoy] = useState<{ id: string; sede_nombre: string; categoria_nombre: string; horario: string }[]>([]);
  const [alertas, setAlertas] = useState<{ tipo: string; texto: string; color: string; href: string }[]>([]);

  useEffect(() => {
    async function load() {
      const [sedesRes, catsRes] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      if (sedesRes.data) setSedes(sedesRes.data);
      if (catsRes.data) setCategorias(catsRes.data);

      const selectWithPago = "id, nombre, rut, estado, estado_mes, tipo, sede_id, categoria_id, nivel, pago_mensual, numero_morosidad, anio_nacimiento, fecha_ingreso, sedes(nombre), categorias(nombre)";
      const selectNoPago = "id, nombre, rut, estado, estado_mes, tipo, sede_id, categoria_id, nivel, anio_nacimiento, fecha_ingreso, sedes(nombre), categorias(nombre)";
      let allJugs: any[] = [];
      let usePago = true;
      let from = 0;
      const PAGE = 1000;
      while (true) {
        let { data: batch, error } = await supabase
          .from("jugadores")
          .select(usePago ? selectWithPago : selectNoPago)
          .range(from, from + PAGE - 1) as { data: any[] | null; error: any };
        if (error && usePago) {
          usePago = false;
          const res = await supabase.from("jugadores").select(selectNoPago).range(from, from + PAGE - 1) as { data: any[] | null; error: any };
          batch = res.data;
        }
        if (!batch || batch.length === 0) break;
        allJugs = allJugs.concat(batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }
      if (allJugs.length > 0) {
        setJugadores(allJugs.map((j: any) => ({
          ...j,
          pago_mensual: j.pago_mensual ?? null,
          numero_morosidad: j.numero_morosidad ?? null,
          sede_nombre: j.sedes?.nombre ?? "",
          categoria_nombre: j.categorias?.nombre ?? "",
        })));
      }

      const { data: marks } = await supabase
        .from("asistencia")
        .select("jugador_id, marca, sesiones_entrenamiento(fecha)")
        .order("id", { ascending: false })
        .limit(10000);
      if (marks) {
        setAsistencia(marks.map((m: any) => ({
          jugador_id: m.jugador_id,
          marca: m.marca,
          fecha: m.sesiones_entrenamiento?.fecha ?? "",
        })));
      }

      const hoy = new Date().toISOString().slice(0, 10);
      const { data: sesHoy } = await supabase
        .from("sesiones_entrenamiento")
        .select("id, horario, sedes(nombre), categorias(nombre)")
        .eq("fecha", hoy)
        .order("horario") as { data: any[] | null; error: any };
      if (sesHoy) {
        setSesionesHoy(sesHoy.map((s: any) => ({
          id: s.id,
          sede_nombre: s.sedes?.nombre ?? "",
          categoria_nombre: s.categorias?.nombre ?? "",
          horario: s.horario ?? "",
        })));
      }

      // Calcular alertas
      const alertasList: { tipo: string; texto: string; color: string; href: string }[] = [];
      const lesionados = allJugs.filter((j: any) => j.estado === "LESIONADO").length;
      if (lesionados > 0) {
        alertasList.push({ tipo: "salud", texto: `${lesionados} jugador${lesionados > 1 ? "es" : ""} lesionado${lesionados > 1 ? "s" : ""}`, color: "text-red-400", href: "/entrenador/lesiones" });
      }
      const morososCount = allJugs.filter((j: any) => (j.pago_mensual || "").toUpperCase().includes("MOROS")).length;
      if (morososCount > 0) {
        alertasList.push({ tipo: "pagos", texto: `${morososCount} jugador${morososCount > 1 ? "es" : ""} moroso${morososCount > 1 ? "s" : ""}`, color: "text-yellow-400", href: "/entrenador/jugadores" });
      }
      const treinta = new Date();
      treinta.setDate(treinta.getDate() - 30);
      const treintaStr = treinta.toISOString().slice(0, 10);
      const faltasRecientes = (marks ?? []).filter((m: any) => {
        const fecha = m.sesiones_entrenamiento?.fecha ?? "";
        return fecha >= treintaStr && m.marca === "F";
      });
      const faltasPorJugador = new Map<string, number>();
      faltasRecientes.forEach((m: any) => {
        faltasPorJugador.set(m.jugador_id, (faltasPorJugador.get(m.jugador_id) ?? 0) + 1);
      });
      const jugadores3Faltas = [...faltasPorJugador.entries()].filter(([, c]) => c >= 3).length;
      if (jugadores3Faltas > 0) {
        alertasList.push({ tipo: "asistencia", texto: `${jugadores3Faltas} jugador${jugadores3Faltas > 1 ? "es" : ""} con 3+ faltas (últ. 30 días)`, color: "text-orange-400", href: "/entrenador/alertas" });
      }
      const catsFullCount = (catsRes.data ?? []).filter((cat: any) => {
        const jugsCat = allJugs.filter((j: any) => j.categoria_id === cat.id && ESTADOS_ACTIVOS.includes(j.estado));
        return jugsCat.length >= CAPACIDAD_MAX;
      }).length;
      if (catsFullCount > 0) {
        alertasList.push({ tipo: "capacidad", texto: `${catsFullCount} categoría${catsFullCount > 1 ? "s" : ""} al máximo de capacidad`, color: "text-primary", href: "/entrenador/jugadores" });
      }
      setAlertas(alertasList);

      setLoading(false);
    }
    load();
  }, [supabase]);

  // --- Datos de capacidad por sede/categoría ---
  const capacidadPorSede = useMemo(() => {
    return sedes.map((sede) => {
      const cats = categorias.filter((c) => c.sede_id === sede.id);
      const catData = cats.map((cat) => {
        const jugsCat = jugadores.filter((j) => j.categoria_id === cat.id);
        const activos = jugsCat.filter((j) => ESTADOS_ACTIVOS.includes(j.estado)).length;
        const total = jugsCat.length;
        return {
          id: cat.id,
          nombre: cat.nombre,
          activos,
          total,
          max: CAPACIDAD_MAX,
        };
      }).sort((a, b) => b.activos - a.activos);

      const totalActivos = catData.reduce((sum, c) => sum + c.activos, 0);
      const totalJugadores = catData.reduce((sum, c) => sum + c.total, 0);
      const capacidadTotal = catData.length * CAPACIDAD_MAX;

      return {
        id: sede.id,
        nombre: sede.nombre,
        categorias: catData,
        totalActivos,
        totalJugadores,
        capacidadTotal,
      };
    }).filter((s) => s.categorias.length > 0);
  }, [jugadores, sedes, categorias]);

  const totalActivosGlobal = capacidadPorSede.reduce((s, sede) => s + sede.totalActivos, 0);
  const totalCapacidadGlobal = capacidadPorSede.reduce((s, sede) => s + sede.capacidadTotal, 0);

  // --- Stats generales ---
  const stats = useMemo(() => {
    const total = jugadores.length;
    const byEstado: Record<string, number> = {};
    const byEstadoMes: Record<string, number> = {};
    const byTipo: Record<string, number> = {};
    const byPago: Record<string, number> = {};
    let morosos = 0;
    let alDia = 0;

    for (const j of jugadores) {
      byEstado[j.estado] = (byEstado[j.estado] || 0) + 1;
      if (j.estado_mes) byEstadoMes[j.estado_mes] = (byEstadoMes[j.estado_mes] || 0) + 1;
      if (j.tipo) byTipo[j.tipo] = (byTipo[j.tipo] || 0) + 1;

      const pago = (j.pago_mensual || "").toUpperCase();
      if (pago.includes("MOROS")) { morosos++; byPago["MOROSO"] = (byPago["MOROSO"] || 0) + 1; }
      else if (pago.includes("DI") || pago.includes("DÍ")) { alDia++; byPago["AL DÍA"] = (byPago["AL DÍA"] || 0) + 1; }
      else { byPago["SIN INFO"] = (byPago["SIN INFO"] || 0) + 1; }
    }

    const entrenando = jugadores.filter((j) => ESTADOS_ACTIVOS.includes(j.estado)).length;
    const seguros = jugadores.filter((j) => j.estado_mes === "SEGURO").length;
    const inseguros = jugadores.filter((j) => j.estado_mes === "INSEGURO").length;

    const edadBuckets: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    for (const j of jugadores) {
      if (j.anio_nacimiento) {
        const edad = currentYear - j.anio_nacimiento;
        const bucket = edad < 10 ? "Sub 10" : edad < 13 ? "10-12" : edad < 16 ? "13-15" : edad < 19 ? "16-18" : edad < 25 ? "19-24" : "25+";
        edadBuckets[bucket] = (edadBuckets[bucket] || 0) + 1;
      }
    }

    return { total, entrenando, seguros, inseguros, morosos, alDia, byEstado, byEstadoMes, byTipo, byPago, edadBuckets };
  }, [jugadores]);

  const asistenciaMensual = useMemo(() => {
    const byMonth: Record<string, { ok: number; total: number }> = {};
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    for (const a of asistencia) {
      if (!a.fecha) continue;
      const d = new Date(a.fecha);
      const key = `${meses[d.getMonth()]} ${d.getFullYear()}`;
      if (!byMonth[key]) byMonth[key] = { ok: 0, total: 0 };
      byMonth[key].total++;
      if (a.marca === "OK") byMonth[key].ok++;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => {
        const pa = a.split(" "), pb = b.split(" ");
        const ya = Number(pa[1]), yb = Number(pb[1]);
        if (ya !== yb) return ya - yb;
        return meses.indexOf(pa[0]) - meses.indexOf(pb[0]);
      })
      .map(([mes, v]) => ({ mes, asistieron: v.ok, total: v.total }));
  }, [asistencia]);

  const estadoData = useMemo(() =>
    Object.entries(stats.byEstado).map(([name, value]) => ({ name, value })),
  [stats.byEstado]);

  const tipoData = useMemo(() =>
    Object.entries(stats.byTipo).map(([name, value]) => ({ name, value })),
  [stats.byTipo]);

  const edadData = useMemo(() => {
    const order = ["Sub 10", "10-12", "13-15", "16-18", "19-24", "25+"];
    return order.filter((b) => stats.edadBuckets[b]).map((name) => ({ name, value: stats.edadBuckets[name] }));
  }, [stats.edadBuckets]);

  const pagoData = useMemo(() =>
    Object.entries(stats.byPago).map(([name, value]) => ({ name, value })),
  [stats.byPago]);

  function toggleSede(sedeId: string) {
    setSedesCollapsed((prev) => ({ ...prev, [sedeId]: !prev[sedeId] }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Data Futbol · Temporada {new Date().getFullYear()}</p>
      </div>

      {/* Acciones rapidas de hoy */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Hoy — {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</h2>
        </div>
        {sesionesHoy.length > 0 ? (
          <div className="mb-3 space-y-2">
            {sesionesHoy.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{s.categoria_nombre}</p>
                  <p className="text-xs text-muted-foreground">{s.sede_nombre}{s.horario ? ` · ${s.horario}` : ""}</p>
                </div>
                <Link
                  href="/entrenador/asistencia"
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Tomar Asistencia
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">Sin sesiones registradas para hoy</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/entrenador/reporte-entrenamiento" className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            <ClipboardList className="h-3.5 w-3.5" /> Reporte DT
          </Link>
          <Link href="/entrenador/partidos" className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            <Trophy className="h-3.5 w-3.5" /> Partidos
          </Link>
          <Link href="/entrenador/jugadores" className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            <Users className="h-3.5 w-3.5" /> Jugadores
          </Link>
          <Link href="/entrenador/evaluaciones" className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            <ArrowRight className="h-3.5 w-3.5" /> Evaluaciones
          </Link>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Users} label="Total Jugadores" value={stats.total} color="text-primary" />
        <KpiCard icon={UserCheck} label="Entrenando" value={stats.entrenando} color="text-emerald-500" sub={pctStr(stats.entrenando, stats.total)} />
        <KpiCard icon={TrendingUp} label="Seguros" value={stats.seguros} color="text-emerald-400" sub={pctStr(stats.seguros, stats.total)} />
        <KpiCard icon={AlertTriangle} label="Inseguros" value={stats.inseguros} color="text-yellow-400" sub={pctStr(stats.inseguros, stats.total)} />
        <KpiCard icon={DollarSign} label="Al Dia" value={stats.alDia} color="text-emerald-400" sub={pctStr(stats.alDia, stats.total)} />
        <KpiCard icon={UserX} label="Morosos" value={stats.morosos} color="text-red-400" sub={pctStr(stats.morosos, stats.total)} />
        <KpiCard icon={Users} label="Desactivados" value={stats.byEstado["DESACTIVADO"] || 0} color="text-muted-foreground" />
        <KpiCard icon={Users} label="Lesionados" value={stats.byEstado["LESIONADO"] || 0} color="text-red-400" />
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-bold text-orange-400">Alertas</h2>
          </div>
          <div className="space-y-1.5">
            {alertas.map((a, i) => (
              <Link key={i} href={a.href} className="flex items-center gap-2 text-sm hover:underline">
                <span className={`inline-block h-2 w-2 rounded-full ${a.color.replace("text-", "bg-")}`} />
                <span className={a.color}>{a.texto}</span>
                <ArrowRight className={`h-3 w-3 ${a.color}`} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ CAPACIDAD POR SEDE Y CATEGORIA ═══════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capacidad por Sede</h2>
            <p className="text-xs text-muted-foreground">
              {totalActivosGlobal} activos / {totalCapacidadGlobal} cupos totales
              ({totalCapacidadGlobal > 0 ? Math.round((totalActivosGlobal / totalCapacidadGlobal) * 100) : 0}% ocupacion)
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> &lt;70%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> 70-89%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-500" /> 90-99%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> FULL</span>
          </div>
        </div>

        {capacidadPorSede.map((sede) => {
          const collapsed = sedesCollapsed[sede.id] ?? false;
          const sedeOcupacion = sede.capacidadTotal > 0 ? Math.round((sede.totalActivos / sede.capacidadTotal) * 100) : 0;
          return (
            <div key={sede.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Header de sede */}
              <button
                onClick={() => toggleSede(sede.id)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{sede.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {sede.categorias.length} categoria{sede.categorias.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{sede.totalActivos}</p>
                    <p className="text-[10px] text-muted-foreground">activos · {sedeOcupacion}%</p>
                  </div>
                  {/* Mini barra de la sede */}
                  <div className="hidden w-24 sm:block">
                    <CapacityBar activos={sede.totalActivos} max={sede.capacidadTotal} showLabel={false} />
                  </div>
                  {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Lista de categorías */}
              {!collapsed && (
                <div className="border-t border-border">
                  {sede.categorias.map((cat, i) => {
                    const pctCat = cat.max > 0 ? Math.round((cat.activos / cat.max) * 100) : 0;
                    const isFull = cat.activos >= cat.max;
                    const colorClass = isFull ? "text-red-400" : pctCat >= 90 ? "text-orange-400" : pctCat >= 70 ? "text-yellow-400" : "text-emerald-400";
                    return (
                      <div
                        key={cat.id}
                        className={`px-5 py-2.5 ${i > 0 ? "border-t border-border/50" : ""} ${isFull ? "bg-red-500/5" : ""}`}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="truncate text-sm font-medium">{cat.nombre}</p>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-semibold tabular-nums">
                              {cat.activos}<span className="text-muted-foreground font-normal"> / {cat.max}</span>
                            </span>
                            <span className={`min-w-[3rem] text-right text-[10px] font-bold tabular-nums ${colorClass}`}>
                              {isFull ? "FULL" : `${pctCat}%`}
                            </span>
                          </div>
                        </div>
                        <CapacityBar activos={cat.activos} max={cat.max} />
                      </div>
                    );
                  })}

                  {/* Resumen de la sede */}
                  <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-2">
                    <p className="text-xs font-semibold text-muted-foreground">TOTAL SEDE</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{sede.totalJugadores} registrados</span>
                      <span className="font-bold text-foreground">{sede.totalActivos} activos</span>
                      <span className="text-muted-foreground">de {sede.capacidadTotal} cupos</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {capacidadPorSede.length === 0 && (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            No hay sedes con categorias activas
          </div>
        )}
      </div>

      {/* Charts Row 1: Estado + Tipo */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Distribucion por Estado">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={estadoData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {estadoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribucion por Tipo">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tipoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" name="Jugadores" radius={[0, 6, 6, 0]}>
                {tipoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2: Asistencia mensual + Edad */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Asistencia Mensual">
          {asistenciaMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={asistenciaMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="asistieron" name="Asistieron" stroke="#ff2e93" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="total" name="Total marcas" stroke="#6495ed" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de asistencia</p>
          )}
        </ChartCard>

        <ChartCard title="Distribucion por Edad">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={edadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Jugadores" radius={[6, 6, 0, 0]}>
                {edadData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cobranzas */}
      <ChartCard title="Estado de Pagos">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={pagoData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
              {pagoData.map((entry, i) => (
                <Cell key={i} fill={entry.name === "AL DIA" ? "#27c281" : entry.name === "MOROSO" ? "#ff5050" : "#9a9aa3"} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top morosos */}
      {stats.morosos > 0 && (
        <ChartCard title="Jugadores Morosos">
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {jugadores
              .filter((j) => (j.pago_mensual || "").toUpperCase().includes("MOROS"))
              .sort((a, b) => (b.numero_morosidad || 0) - (a.numero_morosidad || 0))
              .map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{j.nombre}</p>
                    <p className="text-xs text-muted-foreground">{j.sede_nombre} · {j.categoria_nombre}</p>
                  </div>
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                    {j.numero_morosidad || 0} mes{(j.numero_morosidad || 0) !== 1 ? "es" : ""}
                  </span>
                </div>
              ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// --- Componentes auxiliares ---

function pctStr(a: number, b: number) {
  return b > 0 ? `${(a / b * 100).toFixed(1)}%` : "—";
}

function CapacityBar({ activos, max, showLabel = true }: { activos: number; max: number; showLabel?: boolean }) {
  const pctVal = max > 0 ? Math.min((activos / max) * 100, 100) : 0;
  const overflow = activos > max;
  const barColor = overflow || pctVal >= 100
    ? "bg-red-500"
    : pctVal >= 90
    ? "bg-orange-500"
    : pctVal >= 70
    ? "bg-yellow-500"
    : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pctVal}%` }}
        />
        {/* Marca del 70% */}
        {showLabel && (
          <div className="absolute inset-y-0 left-[70%] w-px bg-border/60" />
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: number; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value.toLocaleString("es-CL")}</p>
      {sub && (
        <p className={`mt-1 text-xs font-medium ${color}`}>{sub} del total</p>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
