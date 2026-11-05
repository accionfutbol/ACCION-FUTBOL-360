"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Download,
  FileSpreadsheet,
  Users,
  DollarSign,
  ClipboardList,
  Trophy,
  Activity,
  UserPlus,
} from "lucide-react";

type ReporteKey = "jugadores" | "pagos" | "asistencia" | "partidos" | "evaluaciones" | "inscripciones";

interface ReporteConfig {
  key: ReporteKey;
  label: string;
  desc: string;
  icon: any;
}

const REPORTES: ReporteConfig[] = [
  { key: "jugadores", label: "Jugadores", desc: "Lista completa con datos personales, sede, categoría, estado", icon: Users },
  { key: "pagos", label: "Pagos / Mensualidades", desc: "Estado de pagos por mes, monto, método, morosos", icon: DollarSign },
  { key: "asistencia", label: "Asistencia", desc: "Marcas de asistencia por jugador y sesión", icon: ClipboardList },
  { key: "partidos", label: "Partidos y Minutaje", desc: "Partidos con estadísticas por jugador", icon: Trophy },
  { key: "evaluaciones", label: "Evaluaciones Físicas", desc: "Métricas físicas por jugador y fecha", icon: Activity },
  { key: "inscripciones", label: "Inscripciones", desc: "Solicitudes de inscripción y estado", icon: UserPlus },
];

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(escape).join(",")];
  rows.forEach((r) => lines.push(r.map(escape).join(",")));
  return "﻿" + lines.join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesAdminPage() {
  const supabase = createClient();
  const [exporting, setExporting] = useState<ReporteKey | null>(null);
  const [format, setFormat] = useState("csv");

  async function exportar(key: ReporteKey) {
    setExporting(key);
    const now = new Date().toISOString().slice(0, 10);

    try {
      switch (key) {
        case "jugadores": {
          const { data } = await supabase
            .from("jugadores")
            .select("nombre, rut, estado, fecha_nacimiento, sexo, telefono_jugador, telefono_apoderado, email_jugador, email_apoderado, nombre_apoderado, posicion_principal, numero_camiseta, sede_id, categoria_id, fecha_ingreso, comuna")
            .order("nombre") as { data: any[]; error: any };

          const [{ data: sedes }, { data: cats }] = await Promise.all([
            supabase.from("sedes").select("id, nombre"),
            supabase.from("categorias").select("id, nombre"),
          ]);
          const sedeMap = new Map((sedes ?? []).map((s: any) => [s.id, s.nombre]));
          const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.nombre]));

          const headers = ["Nombre", "RUT", "Estado", "Fecha Nac.", "Sexo", "Tel. Jugador", "Tel. Apoderado", "Email", "Apoderado", "Posición", "N° Camiseta", "Sede", "Categoría", "Fecha Ingreso", "Comuna"];
          const rows = (data ?? []).map((j: any) => [
            j.nombre ?? "", j.rut ?? "", j.estado ?? "", j.fecha_nacimiento ?? "", j.sexo ?? "",
            j.telefono_jugador ?? "", j.telefono_apoderado ?? "", j.email_jugador ?? "",
            j.nombre_apoderado ?? "", j.posicion_principal ?? "", j.numero_camiseta ?? "",
            sedeMap.get(j.sede_id) ?? "", catMap.get(j.categoria_id) ?? "",
            j.fecha_ingreso ?? "", j.comuna ?? "",
          ]);
          downloadCSV(`jugadores_${now}.csv`, toCSV(headers, rows));
          break;
        }

        case "pagos": {
          const { data } = await supabase
            .from("mensualidades")
            .select("jugador_id, mes, monto, estado, fecha_pago, metodo_pago, observacion")
            .order("mes", { ascending: false }) as { data: any[]; error: any };

          const jugIds = [...new Set((data ?? []).map((m: any) => m.jugador_id))];
          const { data: jugs } = await supabase.from("jugadores").select("id, nombre, rut").in("id", jugIds);
          const jugMap = new Map((jugs ?? []).map((j: any) => [j.id, { nombre: j.nombre, rut: j.rut }]));

          const headers = ["Jugador", "RUT", "Mes", "Monto", "Estado", "Fecha Pago", "Método", "Observación"];
          const rows = (data ?? []).map((m: any) => {
            const j = jugMap.get(m.jugador_id);
            return [
              j?.nombre ?? "", j?.rut ?? "", m.mes ?? "", String(m.monto ?? ""),
              m.estado ?? "", m.fecha_pago ?? "", m.metodo_pago ?? "", m.observacion ?? "",
            ];
          });
          downloadCSV(`pagos_${now}.csv`, toCSV(headers, rows));
          break;
        }

        case "asistencia": {
          const { data: sesiones } = await supabase
            .from("sesiones_entrenamiento")
            .select("id, fecha, sede_id, categoria_id")
            .order("fecha", { ascending: false })
            .limit(500) as { data: any[]; error: any };

          const sesIds = (sesiones ?? []).map((s: any) => s.id);
          const { data: asist } = await supabase
            .from("asistencia")
            .select("sesion_id, jugador_id, marca")
            .in("sesion_id", sesIds) as { data: any[]; error: any };

          const jugIds = [...new Set((asist ?? []).map((a: any) => a.jugador_id))];
          const { data: jugs } = await supabase.from("jugadores").select("id, nombre, rut").in("id", jugIds);
          const jugMap = new Map((jugs ?? []).map((j: any) => [j.id, { nombre: j.nombre, rut: j.rut }]));
          const sesMap = new Map((sesiones ?? []).map((s: any) => [s.id, s.fecha]));

          const headers = ["Jugador", "RUT", "Fecha", "Marca"];
          const rows = (asist ?? []).map((a: any) => {
            const j = jugMap.get(a.jugador_id);
            return [j?.nombre ?? "", j?.rut ?? "", sesMap.get(a.sesion_id) ?? "", a.marca ?? ""];
          });
          downloadCSV(`asistencia_${now}.csv`, toCSV(headers, rows));
          break;
        }

        case "partidos": {
          const { data: partidos } = await supabase
            .from("partidos")
            .select("id, fecha, rival, torneo, marcador_favor, marcador_contra, sede_id, categoria_id")
            .order("fecha", { ascending: false }) as { data: any[]; error: any };

          const pIds = (partidos ?? []).map((p: any) => p.id);
          const { data: pj } = await supabase
            .from("partido_jugador")
            .select("partido_id, jugador_id, estado, minutos, goles, asistencias_gol, tarj_amarilla, tarj_roja, nota")
            .in("partido_id", pIds) as { data: any[]; error: any };

          const jugIds = [...new Set((pj ?? []).map((p: any) => p.jugador_id))];
          const { data: jugs } = await supabase.from("jugadores").select("id, nombre").in("id", jugIds);
          const jugMap = new Map((jugs ?? []).map((j: any) => [j.id, j.nombre]));
          const partMap = new Map((partidos ?? []).map((p: any) => [p.id, p]));

          const headers = ["Fecha", "Rival", "Resultado", "Jugador", "Estado", "Minutos", "Goles", "Asist.", "TA", "TR", "Nota"];
          const rows = (pj ?? []).map((p: any) => {
            const partido = partMap.get(p.partido_id);
            return [
              partido?.fecha ?? "", partido?.rival ?? "",
              `${partido?.marcador_favor ?? 0}-${partido?.marcador_contra ?? 0}`,
              jugMap.get(p.jugador_id) ?? "", p.estado ?? "", String(p.minutos ?? 0),
              String(p.goles ?? 0), String(p.asistencias_gol ?? 0),
              String(p.tarj_amarilla ?? 0), String(p.tarj_roja ?? 0),
              String(p.nota ?? ""),
            ];
          });
          downloadCSV(`partidos_${now}.csv`, toCSV(headers, rows));
          break;
        }

        case "evaluaciones": {
          const { data } = await supabase
            .from("eval_fisicas")
            .select("jugador_id, fecha, salto, velocidad_30m, ift, altura, peso, imc, grasa_corporal, masa_muscular, flexibilidad, resistencia, observacion")
            .order("fecha", { ascending: false }) as { data: any[]; error: any };

          const jugIds = [...new Set((data ?? []).map((e: any) => e.jugador_id))];
          const { data: jugs } = await supabase.from("jugadores").select("id, nombre, rut").in("id", jugIds);
          const jugMap = new Map((jugs ?? []).map((j: any) => [j.id, { nombre: j.nombre, rut: j.rut }]));

          const headers = ["Jugador", "RUT", "Fecha", "Altura", "Peso", "IMC", "Salto", "30m", "IFT", "Grasa", "Masa Musc.", "Flexibilidad", "Resistencia", "Obs."];
          const rows = (data ?? []).map((e: any) => {
            const j = jugMap.get(e.jugador_id);
            return [
              j?.nombre ?? "", j?.rut ?? "", e.fecha ?? "",
              String(e.altura ?? ""), String(e.peso ?? ""), String(e.imc ?? ""),
              String(e.salto ?? ""), String(e.velocidad_30m ?? ""), String(e.ift ?? ""),
              String(e.grasa_corporal ?? ""), String(e.masa_muscular ?? ""),
              String(e.flexibilidad ?? ""), e.resistencia ?? "", e.observacion ?? "",
            ];
          });
          downloadCSV(`evaluaciones_${now}.csv`, toCSV(headers, rows));
          break;
        }

        case "inscripciones": {
          const { data } = await supabase
            .from("inscripciones")
            .select("nombre_jugador, rut_jugador, fecha_nacimiento, sexo, sede_id, categoria_preferida, nombre_apoderado, email_apoderado, telefono_apoderado, rut_apoderado, comuna, como_llego, antecedentes_deportivos, estado, created_at")
            .order("created_at", { ascending: false }) as { data: any[]; error: any };

          const [{ data: sedes }] = await Promise.all([
            supabase.from("sedes").select("id, nombre"),
          ]);
          const sedeMap = new Map((sedes ?? []).map((s: any) => [s.id, s.nombre]));

          const headers = ["Jugador", "RUT Jug.", "Fecha Nac.", "Sexo", "Sede", "Categoría Pref.", "Apoderado", "Email", "Teléfono", "RUT Apo.", "Comuna", "Cómo Llegó", "Antecedentes", "Estado", "Fecha"];
          const rows = (data ?? []).map((i: any) => [
            i.nombre_jugador ?? "", i.rut_jugador ?? "", i.fecha_nacimiento ?? "", i.sexo ?? "",
            sedeMap.get(i.sede_id) ?? "", i.categoria_preferida ?? "",
            i.nombre_apoderado ?? "", i.email_apoderado ?? "", i.telefono_apoderado ?? "",
            i.rut_apoderado ?? "", i.comuna ?? "", i.como_llego ?? "",
            i.antecedentes_deportivos ?? "", i.estado ?? "",
            i.created_at ? new Date(i.created_at).toLocaleDateString("es-CL") : "",
          ]);
          downloadCSV(`inscripciones_${now}.csv`, toCSV(headers, rows));
          break;
        }
      }
    } catch (err) {
      console.error("Error exportando:", err);
    }

    setExporting(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Reportes Exportables</h1>
        <Badge variant="outline" className="text-xs">
          <FileSpreadsheet className="mr-1 h-3 w-3" /> CSV / Excel
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Selecciona un reporte para descargar como archivo CSV (compatible con Excel y Google Sheets).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {REPORTES.map((r) => {
          const Icon = r.icon;
          const isExporting = exporting === r.key;
          return (
            <Card key={r.key}>
              <CardContent className="flex items-start gap-3 p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportar(r.key)}
                    disabled={isExporting}
                    className="mt-1 gap-1.5"
                  >
                    {isExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Descargar CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
