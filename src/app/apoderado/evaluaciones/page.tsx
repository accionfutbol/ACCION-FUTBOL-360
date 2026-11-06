"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Activity, Ruler, Weight, Zap, Timer, Star } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface EvalFisica {
  id: string;
  fecha: string;
  salto: number | null;
  velocidad_30m: number | null;
  ift: number | null;
  altura: number | null;
  peso: number | null;
  imc: number | null;
  grasa_corporal: number | null;
  masa_muscular: number | null;
  flexibilidad: number | null;
  resistencia: string | null;
  observacion: string | null;
}

interface EvalTecnica {
  id: string;
  semestre: number;
  anio: number;
  nota_tecnica: number | null;
  nota_fisica: number | null;
  nota_actitudinal: number | null;
  promedio: number | null;
  comentario: string | null;
}

interface HijoEval {
  nombre: string;
  jugadorId: string;
  evaluaciones: EvalFisica[];
  tecnicas: EvalTecnica[];
}

function formatVal(v: number | null, unit: string) {
  if (v === null) return "-";
  return `${v}${unit}`;
}

export default function ApoderadoEvaluacionesPage() {
  const supabase = createClient();
  const [hijosData, setHijosData] = useState<HijoEval[]>([]);
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
        .select("jugador_id, jugadores(nombre)")
        .eq("apoderado_id", apoderado.id) as { data: any[] | null; error: any };

      if (!relaciones?.length) { setLoading(false); return; }

      const result: HijoEval[] = [];

      for (const rel of relaciones) {
        const [{ data: evals }, { data: tecnicas }] = await Promise.all([
          supabase
            .from("eval_fisicas")
            .select("*")
            .eq("jugador_id", rel.jugador_id)
            .order("fecha", { ascending: false }),
          supabase
            .from("evaluaciones")
            .select("id, semestre, anio, nota_tecnica, nota_fisica, nota_actitudinal, promedio, comentario")
            .eq("jugador_id", rel.jugador_id)
            .order("anio", { ascending: false })
            .order("semestre", { ascending: false }),
        ]);

        result.push({
          nombre: rel.jugadores?.nombre ?? "",
          jugadorId: rel.jugador_id,
          evaluaciones: (evals ?? []) as EvalFisica[],
          tecnicas: (tecnicas ?? []) as EvalTecnica[],
        });
      }

      setHijosData(result);
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

  if (hijosData.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay jugadores asociados a tu cuenta.
      </div>
    );
  }

  function promColor(p: number | null): string {
    if (!p) return "text-muted-foreground";
    if (p >= 6) return "text-pink-500";
    if (p >= 5) return "text-green-500";
    if (p >= 4) return "text-yellow-500";
    return "text-red-500";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Evaluaciones</h1>

      {hijosData.map((hijo) => (
        <div key={hijo.jugadorId} className="space-y-4">
          <h2 className="text-lg font-semibold">{hijo.nombre}</h2>

          {/* Evaluaciones Técnicas */}
          {hijo.tecnicas.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evaluación Técnica</h3>
              </div>

              {(() => {
                const last = hijo.tecnicas[0];
                const radarTec = [
                  { metric: "Técnica", value: last.nota_tecnica ?? 0, fullMark: 7 },
                  { metric: "Física", value: last.nota_fisica ?? 0, fullMark: 7 },
                  { metric: "Actitudinal", value: last.nota_actitudinal ?? 0, fullMark: 7 },
                ];

                return (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">
                          Semestre {last.semestre} — {last.anio}
                        </p>
                        <div className={`text-2xl font-bold ${promColor(last.promedio)}`}>
                          {last.promedio?.toFixed(1) ?? "—"}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center rounded-lg border border-border p-2">
                          <p className="text-xl font-bold">{last.nota_tecnica?.toFixed(1) ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Técnica</p>
                        </div>
                        <div className="text-center rounded-lg border border-border p-2">
                          <p className="text-xl font-bold">{last.nota_fisica?.toFixed(1) ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Física</p>
                        </div>
                        <div className="text-center rounded-lg border border-border p-2">
                          <p className="text-xl font-bold">{last.nota_actitudinal?.toFixed(1) ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Actitudinal</p>
                        </div>
                      </div>

                      {radarTec.some((r) => r.value > 0) && (
                        <ResponsiveContainer width="100%" height={220}>
                          <RadarChart data={radarTec} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis
                              dataKey="metric"
                              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 7]}
                              tickCount={4}
                              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Radar
                              name="Nota"
                              dataKey="value"
                              stroke="#ff2e93"
                              fill="#ff2e93"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                              formatter={(value: any) => [`${Number(value).toFixed(1)}`, "Nota"]}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      )}

                      {last.comentario && (
                        <p className="mt-2 text-sm text-muted-foreground italic">&ldquo;{last.comentario}&rdquo;</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Historial técnico */}
              {hijo.tecnicas.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Historial evaluaciones técnicas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-center">Técnica</TableHead>
                            <TableHead className="text-center">Física</TableHead>
                            <TableHead className="text-center">Actitud</TableHead>
                            <TableHead className="text-center">Prom.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hijo.tecnicas.map((ev) => (
                            <TableRow key={ev.id}>
                              <TableCell className="text-xs">S{ev.semestre} {ev.anio}</TableCell>
                              <TableCell className="text-center">{ev.nota_tecnica?.toFixed(1) ?? "—"}</TableCell>
                              <TableCell className="text-center">{ev.nota_fisica?.toFixed(1) ?? "—"}</TableCell>
                              <TableCell className="text-center">{ev.nota_actitudinal?.toFixed(1) ?? "—"}</TableCell>
                              <TableCell className={`text-center font-bold ${promColor(ev.promedio)}`}>
                                {ev.promedio?.toFixed(1) ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Evaluaciones Físicas */}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evaluación Física</h3>
          </div>

          {hijo.evaluaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin evaluaciones físicas registradas.</p>
          ) : (
            <>
              {/* Última evaluación como cards */}
              {(() => {
                const last = hijo.evaluaciones[0];
                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Ruler className="h-5 w-5 text-blue-400" />
                        <div>
                          <p className="text-xl font-bold">{formatVal(last.altura, " cm")}</p>
                          <p className="text-xs text-muted-foreground">Altura</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Weight className="h-5 w-5 text-emerald-400" />
                        <div>
                          <p className="text-xl font-bold">{formatVal(last.peso, " kg")}</p>
                          <p className="text-xs text-muted-foreground">Peso</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <div>
                          <p className="text-xl font-bold">{formatVal(last.velocidad_30m, "s")}</p>
                          <p className="text-xs text-muted-foreground">30m</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Activity className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xl font-bold">{formatVal(last.salto, " cm")}</p>
                          <p className="text-xs text-muted-foreground">Salto</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Radar chart */}
              {(() => {
                const last = hijo.evaluaciones[0];
                const radarData = [
                  { metric: "Velocidad", value: last.velocidad_30m ? Math.max(0, 100 - (last.velocidad_30m - 3.5) * 20) : 0 },
                  { metric: "Salto", value: last.salto ? Math.min(100, (last.salto / 60) * 100) : 0 },
                  { metric: "IFT", value: last.ift ? Math.min(100, (last.ift / 20) * 100) : 0 },
                  { metric: "Flexibilidad", value: last.flexibilidad ? Math.min(100, (last.flexibilidad / 50) * 100) : 0 },
                  { metric: "IMC", value: last.imc ? Math.max(0, 100 - Math.abs(last.imc - 20) * 5) : 0 },
                  { metric: "M. Muscular", value: last.masa_muscular ? Math.min(100, (last.masa_muscular / 60) * 100) : 0 },
                ].filter((d) => d.value > 0);

                if (radarData.length < 3) return null;

                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Perfil físico (última evaluación)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Valor"
                            dataKey="value"
                            stroke="#ff2e93"
                            fill="#ff2e93"
                            fillOpacity={0.25}
                            strokeWidth={2}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            formatter={(value: any) => [`${Math.round(Number(value))}%`, "Rendimiento"]}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Historial en tabla */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Historial de evaluaciones</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Altura</TableHead>
                          <TableHead className="text-right">Peso</TableHead>
                          <TableHead className="text-right">IMC</TableHead>
                          <TableHead className="text-right">30m</TableHead>
                          <TableHead className="text-right">Salto</TableHead>
                          <TableHead className="text-right">IFT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hijo.evaluaciones.map((ev) => (
                          <TableRow key={ev.id}>
                            <TableCell className="whitespace-nowrap text-xs">{ev.fecha}</TableCell>
                            <TableCell className="text-right">{formatVal(ev.altura, "")}</TableCell>
                            <TableCell className="text-right">{formatVal(ev.peso, "")}</TableCell>
                            <TableCell className="text-right">{formatVal(ev.imc, "")}</TableCell>
                            <TableCell className="text-right">{formatVal(ev.velocidad_30m, "s")}</TableCell>
                            <TableCell className="text-right">{formatVal(ev.salto, "")}</TableCell>
                            <TableCell className="text-right">{formatVal(ev.ift, "")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Observaciones de la última evaluación */}
              {hijo.evaluaciones[0].observacion && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Observación ({hijo.evaluaciones[0].fecha})</p>
                    <p className="text-sm">{hijo.evaluaciones[0].observacion}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
