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
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  UserMinus,
  UserPlus,
  Activity,
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
} from "recharts";

interface SedeStats {
  sede: string;
  activos: number;
  desactivados: number;
  nuevos: number;
  tasa_retencion: number;
}

export default function RetencionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sedeStats, setSedeStats] = useState<SedeStats[]>([]);
  const [estadoData, setEstadoData] = useState<{ name: string; value: number }[]>([]);
  const [totales, setTotales] = useState({
    total: 0,
    activos: 0,
    desactivados: 0,
    nuevos: 0,
    tasaGlobal: 0,
  });
  const [periodoMeses, setPeriodoMeses] = useState("6");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: jugs }, { data: sedes }] = (await Promise.all([
        supabase
          .from("jugadores")
          .select("id, estado, sede_id, fecha_ingreso, fecha_salida"),
        supabase.from("sedes").select("id, nombre").eq("activa", true),
      ])) as { data: any[] | null; error: any }[];

      const sedeMap = new Map<string, string>(
        (sedes ?? []).map((s: any) => [s.id, s.nombre])
      );

      const mesesAtras = new Date();
      mesesAtras.setMonth(mesesAtras.getMonth() - Number(periodoMeses));
      const corte = mesesAtras.toISOString().split("T")[0];

      const porSede = new Map<
        string,
        { activos: number; desactivados: number; nuevos: number }
      >();

      const estadoCount: Record<string, number> = {};

      (jugs ?? []).forEach((j: any) => {
        const sedeNombre = sedeMap.get(j.sede_id) ?? "Sin sede";
        if (!porSede.has(sedeNombre)) {
          porSede.set(sedeNombre, { activos: 0, desactivados: 0, nuevos: 0 });
        }
        const s = porSede.get(sedeNombre)!;

        const est = j.estado ?? "DESACTIVADO";
        estadoCount[est] = (estadoCount[est] ?? 0) + 1;

        if (["ACTIVO", "FULL", "BECADO", "LESIONADO"].includes(est)) {
          s.activos++;
        } else if (est === "DESACTIVADO") {
          s.desactivados++;
        }

        if (est === "NEW" || (j.fecha_ingreso && j.fecha_ingreso >= corte)) {
          s.nuevos++;
        }
      });

      const stats: SedeStats[] = [];
      porSede.forEach((val, sede) => {
        const total = val.activos + val.desactivados;
        stats.push({
          sede,
          activos: val.activos,
          desactivados: val.desactivados,
          nuevos: val.nuevos,
          tasa_retencion: total > 0 ? Math.round((val.activos / total) * 100) : 0,
        });
      });
      stats.sort((a, b) => b.activos - a.activos);

      const totalActivos = stats.reduce((s, x) => s + x.activos, 0);
      const totalDesact = stats.reduce((s, x) => s + x.desactivados, 0);
      const totalNuevos = stats.reduce((s, x) => s + x.nuevos, 0);
      const totalJug = totalActivos + totalDesact;

      setSedeStats(stats);
      setEstadoData(
        Object.entries(estadoCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      setTotales({
        total: totalJug,
        activos: totalActivos,
        desactivados: totalDesact,
        nuevos: totalNuevos,
        tasaGlobal: totalJug > 0 ? Math.round((totalActivos / totalJug) * 100) : 0,
      });
      setLoading(false);
    }
    load();
  }, [supabase, periodoMeses]);

  const PIE_COLORS = ["#ff2e93", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#6b7280"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Retención</h1>
        <Select
          value={periodoMeses}
          onValueChange={(v: string | null) => setPeriodoMeses(v ?? "6")}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{periodoMeses === "3" ? "3 meses" : periodoMeses === "6" ? "6 meses" : "12 meses"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totales.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total histórico</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{totales.activos}</p>
                  <p className="text-[10px] text-muted-foreground">Activos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <UserMinus className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-400">{totales.desactivados}</p>
                  <p className="text-[10px] text-muted-foreground">Desactivados</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{totales.tasaGlobal}%</p>
                  <p className="text-[10px] text-muted-foreground">Retención</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Retención por sede</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sedeStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="sede"
                        width={100}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(val: any) => [`${val}%`, "Retención"]}
                      />
                      <Bar dataKey="tasa_retencion" fill="#ff2e93" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribución por estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={estadoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }: any) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {estadoData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalle por sede</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">Sede</th>
                    <th className="px-4 py-2 text-center font-medium">Activos</th>
                    <th className="px-4 py-2 text-center font-medium">Desactivados</th>
                    <th className="px-4 py-2 text-center font-medium">Nuevos</th>
                    <th className="px-4 py-2 text-center font-medium">Retención</th>
                  </tr>
                </thead>
                <tbody>
                  {sedeStats.map((s) => (
                    <tr key={s.sede} className="border-b border-border/50">
                      <td className="px-4 py-2 font-medium">{s.sede}</td>
                      <td className="px-4 py-2 text-center text-emerald-400">{s.activos}</td>
                      <td className="px-4 py-2 text-center text-red-400">{s.desactivados}</td>
                      <td className="px-4 py-2 text-center text-blue-400">{s.nuevos}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge
                          className={
                            s.tasa_retencion >= 50
                              ? "bg-emerald-500/20 text-emerald-400"
                              : s.tasa_retencion >= 30
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }
                        >
                          {s.tasa_retencion}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
