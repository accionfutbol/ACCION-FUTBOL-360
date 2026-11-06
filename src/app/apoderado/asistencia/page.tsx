"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, HeartPulse } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AsistenciaDetalle {
  fecha: string;
  marca: string;
}

interface HijoAsistencia {
  nombre: string;
  rut: string;
  detalle: AsistenciaDetalle[];
}

export default function ApoderadoAsistenciaPage() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoAsistencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apoderado } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!apoderado) {
        setLoading(false);
        return;
      }

      const { data: relaciones } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id, jugadores(nombre, rut)")
        .eq("apoderado_id", apoderado.id);

      if (!relaciones) {
        setLoading(false);
        return;
      }

      const result: HijoAsistencia[] = [];

      for (const rel of relaciones) {
        const jugador = (rel as any).jugadores;
        const { data: marcas } = await supabase
          .from("asistencia")
          .select("marca, sesiones_entrenamiento(fecha)")
          .eq("jugador_id", rel.jugador_id)
          .order("created_at", { ascending: false })
          .limit(30);

        result.push({
          nombre: jugador?.nombre ?? "",
          rut: jugador?.rut ?? "",
          detalle:
            marcas?.map((m: any) => ({
              fecha: m.sesiones_entrenamiento?.fecha ?? "",
              marca: m.marca,
            })) ?? [],
        });
      }

      setHijos(result);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const marcaColor: Record<string, string> = {
    OK: "bg-emerald-500 text-white",
    F: "bg-red-500 text-white",
    J: "bg-yellow-500 text-black",
    L: "bg-blue-500 text-white",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Detalle de Asistencia</h1>

      {hijos.map((hijo) => {
        const ok = hijo.detalle.filter((d) => d.marca === "OK").length;
        const f = hijo.detalle.filter((d) => d.marca === "F").length;
        const j = hijo.detalle.filter((d) => d.marca === "J").length;
        const l = hijo.detalle.filter((d) => d.marca === "L").length;
        const total = hijo.detalle.length;
        const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
        const donutData = [
          { name: "Presente", value: ok, color: "#10b981" },
          { name: "Falta", value: f, color: "#ef4444" },
          { name: "Justificado", value: j, color: "#f59e0b" },
          { name: "Lesionado", value: l, color: "#3b82f6" },
        ].filter((d) => d.value > 0);

        return (
          <Card key={hijo.rut}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{hijo.nombre}</CardTitle>
              <p className="text-xs text-muted-foreground">{hijo.rut}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {total === 0 ? (
                <p className="text-sm text-muted-foreground">Sin registros de asistencia.</p>
              ) : (
                <>
                  {/* Resumen visual */}
                  <div className="flex items-center gap-6">
                    <div className="relative h-32 w-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                            {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm"><span className="font-bold">{ok}</span> <span className="text-muted-foreground">Presente</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-sm"><span className="font-bold">{f}</span> <span className="text-muted-foreground">Falta</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm"><span className="font-bold">{j}</span> <span className="text-muted-foreground">Justificado</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 text-blue-400" />
                        <span className="text-sm"><span className="font-bold">{l}</span> <span className="text-muted-foreground">Lesionado</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Historial detallado */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Últimas {total} sesiones</p>
                    <div className="space-y-1">
                      {hijo.detalle.map((d, i) => (
                        <div key={i} className="flex items-center justify-between rounded px-2 py-1.5 text-sm odd:bg-muted/30">
                          <span>{d.fecha ? new Date(d.fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }) : "—"}</span>
                          <Badge className={marcaColor[d.marca] ?? ""}>{d.marca}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
