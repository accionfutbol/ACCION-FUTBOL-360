"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Loader2,
  Users,
  DollarSign,
  AlertCircle,
  Trophy,
  ChevronRight,
  MapPin,
  UserCog,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  UserX,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface Stats {
  totalJugadores: number;
  activos: number;
  morosos: number;
  partidosMes: number;
  inscripcionesPendientes: number;
  totalEntrenadores: number;
  totalCategorias: number;
  becados: number;
  asistenciaPromedio: number;
  ingresoMensual: number;
}

interface SedeData {
  nombre: string;
  jugadores: number;
  activos: number;
}

interface EstadoData {
  name: string;
  value: number;
}

interface PagoMes {
  mes: string;
  pagados: number;
  atrasados: number;
  pendientes: number;
}

interface InscripcionReciente {
  id: string;
  nombre_jugador: string;
  nombre_apoderado: string;
  estado: string;
  created_at: string;
}

const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: "#10b981",
  FULL: "#f59e0b",
  NEW: "#3b82f6",
  LESIONADO: "#ef4444",
  DESACTIVADO: "#6b7280",
  BECADO: "#8b5cf6",
};

const PIE_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#6b7280", "#8b5cf6"];

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalJugadores: 0, activos: 0, morosos: 0, partidosMes: 0,
    inscripcionesPendientes: 0, totalEntrenadores: 0, totalCategorias: 0, becados: 0,
    asistenciaPromedio: 0, ingresoMensual: 0,
  });
  const [sedeData, setSedeData] = useState<SedeData[]>([]);
  const [estadoData, setEstadoData] = useState<EstadoData[]>([]);
  const [pagoData, setPagoData] = useState<PagoMes[]>([]);
  const [inscRecientes, setInscRecientes] = useState<InscripcionReciente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [jugRes, morosRes, partRes, inscRes, entRes, catRes, sedesRes, mensRes, asistRes] = await Promise.all([
        supabase.from("jugadores").select("id, estado, sede_id, pago_mensual", { count: "exact", head: false }),
        supabase.from("mensualidades").select("id", { count: "exact", head: true }).eq("estado", "ATRASADO"),
        supabase.from("partidos").select("id", { count: "exact", head: true })
          .gte("fecha", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
        supabase.from("inscripciones").select("id, nombre_jugador, nombre_apoderado, estado, created_at")
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("entrenadores").select("id", { count: "exact", head: true }),
        supabase.from("categorias").select("id", { count: "exact", head: true }).eq("activa", true),
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("mensualidades").select("mes, estado, monto"),
        supabase.from("asistencia").select("marca"),
      ]);

      const jugadores = (jugRes.data ?? []) as any[];
      const activos = jugadores.filter((j) =>
        j.estado === "ACTIVO" || j.estado === "FULL" || j.estado === "NEW" || j.estado === "BECADO"
      ).length;
      const becados = jugadores.filter((j) => j.estado === "BECADO").length;

      const pendientes = ((inscRes.data ?? []) as any[]).filter((i) => i.estado === "PENDIENTE").length;

      const marcasAsist = (asistRes.data ?? []) as { marca: string }[];
      const totalMarcas = marcasAsist.length;
      const okMarcas = marcasAsist.filter((m) => m.marca === "OK").length;
      const asistPct = totalMarcas > 0 ? Math.round((okMarcas / totalMarcas) * 100) : 0;

      const activosPagantes = jugadores.filter((j: any) =>
        ["ACTIVO", "FULL", "NEW"].includes(j.estado)
      );
      const pagos = activosPagantes
        .map((j: any) => parseInt(j.pago_mensual, 10))
        .filter((v: number) => !isNaN(v) && v > 0);
      const ingresoMes = pagos.reduce((s: number, v: number) => s + v, 0);

      setStats({
        totalJugadores: jugRes.count ?? jugadores.length,
        activos,
        morosos: morosRes.count ?? 0,
        partidosMes: partRes.count ?? 0,
        inscripcionesPendientes: pendientes,
        totalEntrenadores: entRes.count ?? 0,
        totalCategorias: catRes.count ?? 0,
        becados,
        asistenciaPromedio: asistPct,
        ingresoMensual: ingresoMes,
      });

      // Distribución por sede
      const sedes = (sedesRes.data ?? []) as { id: string; nombre: string }[];
      const sedeMap = new Map<string, { nombre: string; total: number; activos: number }>();
      sedes.forEach((s) => sedeMap.set(s.id, { nombre: s.nombre, total: 0, activos: 0 }));
      jugadores.forEach((j) => {
        const entry = sedeMap.get(j.sede_id);
        if (entry) {
          entry.total++;
          if (j.estado === "ACTIVO" || j.estado === "FULL" || j.estado === "NEW" || j.estado === "BECADO") {
            entry.activos++;
          }
        }
      });
      setSedeData(
        Array.from(sedeMap.values())
          .map((v) => ({ nombre: v.nombre.length > 15 ? v.nombre.slice(0, 15) + "…" : v.nombre, jugadores: v.total, activos: v.activos }))
          .sort((a, b) => b.jugadores - a.jugadores)
      );

      // Estado de jugadores (pie)
      const estadoCount = new Map<string, number>();
      jugadores.forEach((j) => {
        estadoCount.set(j.estado, (estadoCount.get(j.estado) ?? 0) + 1);
      });
      setEstadoData(
        Array.from(estadoCount.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Tendencia de pagos (últimos 6 meses)
      const mensualidades = (mensRes.data ?? []) as { mes: string; estado: string }[];
      const now = new Date();
      const pagosPorMes: PagoMes[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const del = mensualidades.filter((m) => m.mes.startsWith(mesKey));
        pagosPorMes.push({
          mes: MESES[d.getMonth()],
          pagados: del.filter((m) => m.estado === "PAGADO").length,
          atrasados: del.filter((m) => m.estado === "ATRASADO").length,
          pendientes: del.filter((m) => m.estado === "PENDIENTE").length,
        });
      }
      setPagoData(pagosPorMes);

      // Inscripciones recientes
      setInscRecientes((inscRes.data ?? []) as InscripcionReciente[]);

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

  const retencion = stats.totalJugadores > 0
    ? Math.round((stats.activos / stats.totalJugadores) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Panel Admin</h1>
        <Badge variant="outline" className="text-xs">
          <Activity className="mr-1 h-3 w-3" /> Dashboard 360°
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard icon={Users} label="Jugadores" value={stats.totalJugadores} color="text-primary" />
        <KPICard icon={UserCheck} label="Activos" value={stats.activos} color="text-emerald-400" subtitle={`${retencion}% retención`} />
        <KPICard icon={AlertCircle} label="Pagos atrasados" value={stats.morosos} color="text-red-400" />
        <KPICard icon={Trophy} label="Partidos (mes)" value={stats.partidosMes} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard icon={MapPin} label="Categorías activas" value={stats.totalCategorias} color="text-blue-400" />
        <KPICard icon={UserCog} label="Entrenadores" value={stats.totalEntrenadores} color="text-purple-400" />
        <KPICard icon={Activity} label="Asistencia prom." value={stats.asistenciaPromedio} color="text-cyan-400" subtitle="% presentes" />
        <KPICard
          icon={UserPlus}
          label="Inscr. pendientes"
          value={stats.inscripcionesPendientes}
          color="text-yellow-400"
          href="/admin/inscripciones"
        />
      </div>

      {/* Ingreso mensual estimado */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-sm text-muted-foreground">Ingreso mensual estimado</p>
              <p className="text-2xl font-bold text-emerald-400">
                ${stats.ingresoMensual.toLocaleString("es-CL")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{stats.activos} activos</span>
            <span>{stats.becados} becados</span>
            <Link href="/admin/proyeccion" className="text-primary hover:underline">
              Ver proyección →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribución por sede */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              Jugadores por sede
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sedeData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sedeData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    dataKey="nombre"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="activos" name="Activos" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="jugadores" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Estado de jugadores (pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              Estado de jugadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadoData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={estadoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {estadoData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={ESTADO_COLORS[entry.name] ?? PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5">
                  {estadoData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: ESTADO_COLORS[entry.name] ?? PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de pagos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-primary" />
            Tendencia de pagos (últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagoData.every((p) => p.pagados === 0 && p.atrasados === 0 && p.pendientes === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de pagos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pagoData} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="pagados" name="Pagados" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="atrasados" name="Atrasados" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="pendientes" name="Pendientes" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Inscripciones recientes + Quick Links */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inscripciones recientes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserPlus className="h-4 w-4 text-primary" />
                Inscripciones recientes
              </CardTitle>
              <Link href="/admin/inscripciones" className="text-xs text-primary hover:underline">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {inscRecientes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin inscripciones</p>
            ) : (
              <div className="space-y-2">
                {inscRecientes.map((insc) => (
                  <div key={insc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div>
                      <p className="text-sm font-medium">{insc.nombre_jugador}</p>
                      <p className="text-xs text-muted-foreground">{insc.nombre_apoderado}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          insc.estado === "PENDIENTE"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : insc.estado === "APROBADA"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {insc.estado === "PENDIENTE" && <Clock className="mr-1 h-3 w-3" />}
                        {insc.estado}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink href="/admin/pagos" icon={DollarSign} title="Gestión de Pagos" desc="Registrar pagos, ver morosos" />
          <QuickLink href="/entrenador/jugadores" icon={Users} title="Data Jugadores" desc="Buscar, fichas completas" />
          <QuickLink href="/admin/sedes" icon={MapPin} title="Sedes y Categorías" desc="Administrar sedes" />
          <QuickLink href="/admin/usuarios" icon={UserCog} title="Usuarios" desc="Perfiles, roles" />
          <QuickLink href="/admin/inscripciones" icon={UserPlus} title="Inscripciones" desc="Revisar pendientes" />
          <QuickLink href="/admin/reportes" icon={FileSpreadsheet} title="Reportes" desc="Exportar datos CSV" />
          <QuickLink href="/entrenador/dashboard" icon={Activity} title="Dashboard DT" desc="Vista entrenador" />
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
  href,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "cursor-pointer transition-colors hover:border-primary/50" : ""}>
      <CardContent className="flex items-center gap-3 p-3">
        <Icon className={`h-5 w-5 shrink-0 ${color}`} />
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="group h-full cursor-pointer transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-3 p-3">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{desc}</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
