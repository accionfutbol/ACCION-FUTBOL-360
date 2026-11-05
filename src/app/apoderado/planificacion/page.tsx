"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface HijoInfo {
  id: string;
  nombre: string;
  sedeId: string;
  categoriaId: string;
  categoriaNombre: string;
}

interface Plan {
  fecha: string;
  contenido: string;
  tipo: string;
}

const DIAS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const tipoBg: Record<string, string> = {
  ENTRENAMIENTO: "bg-primary/15 text-primary",
  TORNEO: "bg-yellow-500/15 text-yellow-500",
  AMISTOSO: "bg-emerald-500/15 text-emerald-500",
  PRUEBA: "bg-blue-500/15 text-blue-500",
  OTRO: "bg-zinc-500/10 text-zinc-400",
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function PlanificacionApoderado() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoInfo[]>([]);
  const [hijoIdx, setHijoIdx] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [trainingDays, setTrainingDays] = useState<Set<number>>(new Set([6]));
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: apoderado } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!apoderado) { setLoading(false); return; }

      const { data: rels } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id")
        .eq("apoderado_id", apoderado.id);

      if (!rels?.length) { setLoading(false); return; }

      const ids = rels.map((r) => r.jugador_id);
      const { data: jugadores } = await supabase
        .from("jugadores")
        .select("id, nombre, sede_id, categoria_id, categorias(nombre)")
        .in("id", ids)
        .neq("estado", "DESACTIVADO") as { data: any[] | null; error: any };

      setHijos(
        (jugadores ?? []).map((j: any) => ({
          id: j.id,
          nombre: j.nombre,
          sedeId: j.sede_id,
          categoriaId: j.categoria_id,
          categoriaNombre: j.categorias?.nombre ?? "",
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase]);

  const hijo = hijos[hijoIdx] ?? null;
  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    if (!hijo) return;
    async function loadPlans() {
      setLoadingPlans(true);
      const desde = toDateStr(weekDates[0]);
      const hasta = toDateStr(weekDates[6]);

      const [{ data: dias }, { data: plan }] = await Promise.all([
        supabase
          .from("dias_entrenamiento")
          .select("dia_semana")
          .eq("sede_id", hijo.sedeId)
          .eq("categoria_id", hijo.categoriaId),
        supabase
          .from("planificacion")
          .select("fecha, contenido, tipo")
          .eq("sede_id", hijo.sedeId)
          .eq("categoria_id", hijo.categoriaId)
          .gte("fecha", desde)
          .lte("fecha", hasta),
      ]);

      const daySet = new Set<number>([6]);
      dias?.forEach((d: any) => daySet.add(d.dia_semana));
      setTrainingDays(daySet);
      setPlanes((plan ?? []) as Plan[]);
      setLoadingPlans(false);
    }
    loadPlans();
  }, [hijo, weekOffset, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hijos.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No hay jugadores asociados.</p>;
  }

  const planMap: Record<string, Plan> = {};
  for (const p of planes) planMap[p.fecha] = p;

  const weekLabel = (() => {
    const f = weekDates[0];
    const l = weekDates[6];
    return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)} – ${l.getDate()} ${MESES[l.getMonth()].slice(0, 3)} ${l.getFullYear()}`;
  })();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Planificación Semanal</h1>

      {hijos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {hijos.map((h, i) => (
            <button
              key={h.id}
              onClick={() => { setHijoIdx(i); setWeekOffset(0); }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                i === hijoIdx
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {h.nombre}
            </button>
          ))}
        </div>
      )}

      {hijo && (
        <p className="text-xs text-muted-foreground">
          {hijo.categoriaNombre}
        </p>
      )}

      {/* Navegación semana */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((p) => p - 1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="flex-1 text-center text-sm font-semibold">{weekLabel}</h2>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((p) => p + 1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Hoy
          </Button>
        )}
      </div>

      {loadingPlans ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {weekDates.map((date) => {
            const key = toDateStr(date);
            const plan = planMap[key];
            const isTraining = trainingDays.has(date.getDay());
            const today = toDateStr(new Date()) === key;
            const tipo = plan?.tipo ?? "ENTRENAMIENTO";

            return (
              <div
                key={key}
                className={`flex items-start gap-3 border-b border-border p-3 last:border-b-0 md:p-4 ${
                  !isTraining ? "opacity-30" : ""
                } ${today ? "bg-primary/5" : ""}`}
              >
                <div className="flex w-12 shrink-0 flex-col items-center">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {DIAS_FULL[date.getDay()].slice(0, 3)}
                  </span>
                  <span
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-base font-bold ${
                      today ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  {isTraining && (
                    <Badge className={`mb-1 text-[10px] ${tipoBg[tipo] ?? ""}`}>
                      {tipo}
                    </Badge>
                  )}
                  {isTraining && plan?.contenido ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan.contenido}</p>
                  ) : isTraining ? (
                    <p className="text-sm italic text-muted-foreground">Sin planificación aún</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin entrenamiento</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
