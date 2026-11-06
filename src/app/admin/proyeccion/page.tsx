"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, Users, Calculator } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default function ProyeccionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [totalActivos, setTotalActivos] = useState(0);
  const [promedioPago, setPromedioPago] = useState(0);
  const [becados, setBecados] = useState(0);
  const [ingresoMensualEst, setIngresoMensualEst] = useState(0);
  const [dataMensual, setDataMensual] = useState<{ mes: string; real: number; estimado: number }[]>([]);
  const [dataSede, setDataSede] = useState<{ sede: string; jugadores: number; ingreso: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: jugs }, { data: mens }, { data: sedes }] = (await Promise.all([
        supabase
          .from("jugadores")
          .select("id, estado, sede_id, pago_mensual"),
        supabase
          .from("mensualidades")
          .select("jugador_id, mes, monto, estado")
          .eq("estado", "PAGADO"),
        supabase.from("sedes").select("id, nombre").eq("activa", true),
      ])) as { data: any[] | null; error: any }[];

      const sedeMap = new Map<string, string>(
        (sedes ?? []).map((s: any) => [s.id, s.nombre])
      );

      const activos = (jugs ?? []).filter((j: any) =>
        ["ACTIVO", "FULL", "NEW"].includes(j.estado)
      );
      const becadosCount = (jugs ?? []).filter((j: any) => j.estado === "BECADO").length;

      setTotalActivos(activos.length);
      setBecados(becadosCount);

      const pagos = activos
        .map((j: any) => {
          const val = parseInt(j.pago_mensual, 10);
          return isNaN(val) ? 0 : val;
        })
        .filter((v: number) => v > 0);

      const avg = pagos.length > 0 ? Math.round(pagos.reduce((s: number, v: number) => s + v, 0) / pagos.length) : 45000;
      setPromedioPago(avg);

      const ingEst = activos.length * avg;
      setIngresoMensualEst(ingEst);

      const porSede = new Map<string, { jugadores: number; ingreso: number }>();
      activos.forEach((j: any) => {
        const sn = sedeMap.get(j.sede_id) ?? "Sin sede";
        if (!porSede.has(sn)) porSede.set(sn, { jugadores: 0, ingreso: 0 });
        const e = porSede.get(sn)!;
        e.jugadores++;
        const val = parseInt(j.pago_mensual, 10);
        e.ingreso += isNaN(val) ? avg : val;
      });

      setDataSede(
        Array.from(porSede.entries())
          .map(([sede, v]) => ({ sede, ...v }))
          .sort((a, b) => b.ingreso - a.ingreso)
      );

      const anioActual = new Date().getFullYear();
      const pagadoPorMes = new Map<string, number>();
      (mens ?? []).forEach((m: any) => {
        if (!m.mes) return;
        const key = m.mes.slice(0, 7);
        if (!key.startsWith(String(anioActual))) return;
        pagadoPorMes.set(key, (pagadoPorMes.get(key) ?? 0) + (m.monto ?? 0));
      });

      const mesActual = new Date().getMonth();
      const datos = MESES.map((label, i) => {
        const key = `${anioActual}-${String(i + 1).padStart(2, "0")}`;
        const real = pagadoPorMes.get(key) ?? 0;
        return {
          mes: label,
          real,
          estimado: i <= mesActual ? 0 : ingEst,
        };
      });
      setDataMensual(datos);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Proyección de Ingresos</h1>
        <Badge variant="outline" className="text-xs">
          <Calculator className="mr-1 h-3 w-3" /> {new Date().getFullYear()}
        </Badge>
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
                  <p className="text-2xl font-bold">{totalActivos}</p>
                  <p className="text-[10px] text-muted-foreground">Activos pagantes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{fmt(promedioPago)}</p>
                  <p className="text-[10px] text-muted-foreground">Pago promedio</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-bold text-primary">{fmt(ingresoMensualEst)}</p>
                  <p className="text-[10px] text-muted-foreground">Ingreso mensual est.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-lg font-bold text-yellow-400">{fmt(ingresoMensualEst * 12)}</p>
                  <p className="text-[10px] text-muted-foreground">Proyección anual</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ingresos por mes — real vs proyectado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataMensual}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: any) => [fmt(val), ""]}
                    />
                    <Bar dataKey="real" fill="#ff2e93" name="Real" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="estimado" fill="#ff2e9340" name="Estimado" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ingreso estimado por sede</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataSede} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                    <YAxis type="category" dataKey="sede" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: any) => [fmt(val), "Ingreso"]}
                    />
                    <Bar dataKey="ingreso" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                * Proyección basada en {totalActivos} jugadores activos con pago promedio de {fmt(promedioPago)}.
                {becados > 0 && ` ${becados} jugador${becados !== 1 ? "es" : ""} becado${becados !== 1 ? "s" : ""} no incluido${becados !== 1 ? "s" : ""}.`}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
