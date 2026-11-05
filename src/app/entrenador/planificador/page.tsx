"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
  Check,
  Calendar,
  CalendarDays,
} from "lucide-react";

interface Sede { id: string; nombre: string }
interface Categoria { id: string; nombre: string; sede_id: string }
interface Planificacion {
  id?: string;
  sede_id: string;
  categoria_id: string;
  fecha: string;
  contenido: string;
  tipo: string;
}

const DIAS_HEADER = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_CONFIG = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];
const DIAS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPOS = ["ENTRENAMIENTO", "TORNEO", "AMISTOSO", "PRUEBA", "OTRO"];

const tipoBg: Record<string, string> = {
  ENTRENAMIENTO: "bg-primary/15 border-primary/30",
  TORNEO: "bg-yellow-500/15 border-yellow-500/30",
  AMISTOSO: "bg-emerald-500/15 border-emerald-500/30",
  PRUEBA: "bg-blue-500/15 border-blue-500/30",
  OTRO: "bg-zinc-500/10 border-zinc-500/30",
};
const tipoText: Record<string, string> = {
  ENTRENAMIENTO: "text-primary",
  TORNEO: "text-yellow-500",
  AMISTOSO: "text-emerald-500",
  PRUEBA: "text-blue-500",
  OTRO: "text-zinc-400",
};

type Vista = "mes" | "semana";

export default function PlanificadorPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth());
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [vista, setVista] = useState<Vista>("mes");
  const [configDays, setConfigDays] = useState<number[]>([6]);
  const [planes, setPlanes] = useState<Planificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTipo, setEditTipo] = useState("ENTRENAMIENTO");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      if (s) setSedes(s);
      if (c) setCategorias(c);
      setLoading(false);
    })();
  }, [supabase]);

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const loadPlan = useCallback(async () => {
    if (!sedeId || !categoriaId) return;
    const firstDay = new Date(anio, mes, 1);
    const lastDay = new Date(anio, mes + 1, 0);
    const desde = toDateStr(firstDay);
    const hasta = toDateStr(lastDay);

    const [{ data: dias }, { data: plan }] = await Promise.all([
      supabase.from("dias_entrenamiento").select("dia_semana").eq("sede_id", sedeId).eq("categoria_id", categoriaId),
      supabase.from("planificacion").select("*").eq("sede_id", sedeId).eq("categoria_id", categoriaId).gte("fecha", desde).lte("fecha", hasta),
    ]);

    if (dias && dias.length > 0) {
      const d = dias.map((x: any) => x.dia_semana as number);
      if (!d.includes(6)) d.push(6);
      setConfigDays(d);
    } else {
      setConfigDays([6]);
    }
    setPlanes(plan ?? []);
  }, [supabase, sedeId, categoriaId, anio, mes]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const trainingDaySet = useMemo(() => new Set(configDays), [configDays]);

  const planMap = useMemo(() => {
    const m: Record<string, Planificacion> = {};
    for (const p of planes) m[p.fecha] = p;
    return m;
  }, [planes]);

  // ── Calendar grid for month view ──
  const calendarGrid = useMemo(() => {
    const first = new Date(anio, mes, 1);
    const last = new Date(anio, mes + 1, 0);
    const startPad = first.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(anio, mes, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [anio, mes]);

  // ── Week view dates ──
  const weekDates = useMemo(() => {
    const first = new Date(anio, mes, 1);
    const dayOfWeek = first.getDay();
    const weekStart = new Date(first);
    weekStart.setDate(weekStart.getDate() - dayOfWeek + semanaOffset * 7);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [anio, mes, semanaOffset]);

  function changeMonth(delta: number) {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
    setSemanaOffset(0);
  }

  function openEdit(date: Date) {
    const key = toDateStr(date);
    const existing = planMap[key];
    setEditDate(key);
    setEditContent(existing?.contenido ?? "");
    setEditTipo(existing?.tipo ?? (date.getDay() === 6 ? "TORNEO" : "ENTRENAMIENTO"));
  }

  async function saveEdit() {
    if (!editDate || !sedeId || !categoriaId) return;
    setSaving(true);
    const existing = planMap[editDate];
    if (existing?.id) {
      await supabase.from("planificacion").update({ contenido: editContent, tipo: editTipo, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("planificacion").upsert({ sede_id: sedeId, categoria_id: categoriaId, fecha: editDate, contenido: editContent, tipo: editTipo }, { onConflict: "sede_id,categoria_id,fecha" });
    }
    await loadPlan();
    setEditDate(null);
    setSaving(false);
  }

  async function saveConfig() {
    if (!sedeId || !categoriaId) return;
    setSaving(true);
    await supabase.from("dias_entrenamiento").delete().eq("sede_id", sedeId).eq("categoria_id", categoriaId);
    const allDays = new Set(configDays);
    allDays.add(6);
    const rows = Array.from(allDays).map((dia) => ({ sede_id: sedeId, categoria_id: categoriaId, dia_semana: dia }));
    await supabase.from("dias_entrenamiento").insert(rows);
    await loadPlan();
    setShowConfig(false);
    setSaving(false);
  }

  function toggleDay(day: number) {
    if (day === 6) return;
    setConfigDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre ?? "";
  const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? "";
  const ready = sedeId && categoriaId;

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-xl font-bold">Planificador</h1>

      {/* Selectores */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Sede</label>
          <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCategoriaId(""); setPlanes([]); setSemanaOffset(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar sede">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Seleccionar sede"}</SelectValue>
            </SelectTrigger>
            <SelectContent>{sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
          <Select value={categoriaId} onValueChange={(v: string | null) => { setCategoriaId(v ?? ""); setSemanaOffset(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar">{categoriaId ? categorias.find((c) => c.id === categoriaId)?.nombre : "Seleccionar"}</SelectValue>
            </SelectTrigger>
            <SelectContent>{categoriasFiltered.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {ready && (
        <>
          {/* Toolbar: nav + vista toggle + config */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => vista === "mes" ? changeMonth(-1) : setSemanaOffset((p) => p - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="min-w-0 flex-1 text-center text-lg font-semibold">
              {vista === "mes"
                ? `${MESES[mes]} ${anio}`
                : (() => {
                    const f = weekDates[0];
                    const l = weekDates[6];
                    return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)} – ${l.getDate()} ${MESES[l.getMonth()].slice(0, 3)} ${l.getFullYear()}`;
                  })()
              }
            </h2>
            <Button variant="ghost" size="icon" onClick={() => vista === "mes" ? changeMonth(1) : setSemanaOffset((p) => p + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div className="flex rounded-lg border border-border">
              <button
                onClick={() => setVista("mes")}
                className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-xs font-medium transition-colors ${vista === "mes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar className="h-3.5 w-3.5" /> Mes
              </button>
              <button
                onClick={() => { setVista("semana"); setSemanaOffset(0); }}
                className={`flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-xs font-medium transition-colors ${vista === "semana" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Semana
              </button>
            </div>

            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowConfig(!showConfig)}>
              <Settings2 className="h-4 w-4" /> Días
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {sedeNombre} · {catNombre}
          </p>

          {/* Config días */}
          {showConfig && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">Días de entrenamiento</p>
                <Button size="sm" onClick={saveConfig} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA_CONFIG.map((d) => {
                  const active = configDays.includes(d.value) || d.value === 6;
                  return (
                    <button key={d.value} onClick={() => toggleDay(d.value)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95 ${active ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30"} ${d.value === 6 ? "cursor-default opacity-80" : "cursor-pointer"}`}>
                      {d.label}
                      {d.value === 6 && <span className="ml-1 text-[10px] text-muted-foreground">(fijo)</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Sábado siempre incluido (torneos / amistosos)</p>
            </div>
          )}

          {/* ═══ VISTA MES — Calendario grilla ═══ */}
          {vista === "mes" && (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {/* Encabezado días */}
              <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                {DIAS_HEADER.map((d, i) => (
                  <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 || i === 6 ? "text-primary" : "text-muted-foreground"}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Celdas */}
              <div className="grid grid-cols-7">
                {calendarGrid.map((date, i) => {
                  if (!date) {
                    return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-border bg-muted/20 md:min-h-[110px]" />;
                  }
                  const key = toDateStr(date);
                  const plan = planMap[key];
                  const isTraining = trainingDaySet.has(date.getDay());
                  const isSabado = date.getDay() === 6;
                  const tipo = plan?.tipo ?? (isSabado ? "TORNEO" : "ENTRENAMIENTO");
                  const today = toDateStr(new Date()) === key;

                  return (
                    <button
                      key={key}
                      onClick={() => isTraining ? openEdit(date) : undefined}
                      disabled={!isTraining}
                      className={`relative min-h-[90px] border-b border-r border-border p-1.5 text-left transition-colors md:min-h-[110px] md:p-2 ${
                        isTraining
                          ? "cursor-pointer hover:bg-muted/40 active:scale-[0.98]"
                          : "cursor-default bg-muted/10 opacity-40"
                      } ${today ? "ring-2 ring-inset ring-primary/40" : ""}`}
                    >
                      {/* Número del día */}
                      <div className="flex items-start justify-between">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${today ? "bg-primary text-primary-foreground" : ""}`}>
                          {date.getDate()}
                        </span>
                        {isTraining && (
                          <span className={`hidden rounded px-1 py-0.5 text-[9px] font-semibold md:inline-block ${tipoText[tipo] ?? ""}`}>
                            {tipo === "ENTRENAMIENTO" ? "ENT" : tipo === "TORNEO" ? "TOR" : tipo === "AMISTOSO" ? "AMI" : tipo.slice(0, 3)}
                          </span>
                        )}
                      </div>
                      {/* Contenido */}
                      {isTraining && plan?.contenido ? (
                        <p className="mt-0.5 line-clamp-3 text-[10px] leading-tight md:text-xs md:leading-snug">
                          {plan.contenido}
                        </p>
                      ) : isTraining ? (
                        <p className="mt-0.5 text-[10px] italic text-muted-foreground md:text-xs">+</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ VISTA SEMANA ═══ */}
          {vista === "semana" && (
            <div className="space-y-0 overflow-hidden rounded-lg border border-border bg-card">
              {weekDates.map((date, i) => {
                const key = toDateStr(date);
                const plan = planMap[key];
                const isTraining = trainingDaySet.has(date.getDay());
                const isSabado = date.getDay() === 6;
                const tipo = plan?.tipo ?? (isSabado ? "TORNEO" : "ENTRENAMIENTO");
                const today = toDateStr(new Date()) === key;
                const inMonth = date.getMonth() === mes;

                return (
                  <button
                    key={key}
                    onClick={() => isTraining ? openEdit(date) : undefined}
                    disabled={!isTraining}
                    className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors last:border-b-0 md:p-4 ${
                      isTraining ? "cursor-pointer hover:bg-muted/40 active:scale-[0.995]" : "cursor-default opacity-30"
                    } ${today ? "bg-primary/5" : ""} ${!inMonth ? "opacity-50" : ""}`}
                  >
                    {/* Fecha columna */}
                    <div className="flex w-14 shrink-0 flex-col items-center">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {DIAS_FULL[date.getDay()].slice(0, 3)}
                      </span>
                      <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${today ? "bg-primary text-primary-foreground" : ""}`}>
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      {isTraining && (
                        <span className={`mb-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${tipoBg[tipo] ?? ""} ${tipoText[tipo] ?? ""}`}>
                          {tipo}
                        </span>
                      )}
                      {isTraining && plan?.contenido ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan.contenido}</p>
                      ) : isTraining ? (
                        <p className="text-sm italic text-muted-foreground">Sin planificación — toca para agregar</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin entrenamiento</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 text-[10px]">
            {TIPOS.slice(0, 4).map((t) => (
              <span key={t} className={`rounded border px-1.5 py-0.5 font-medium ${tipoBg[t] ?? ""} ${tipoText[t] ?? ""}`}>{t}</span>
            ))}
          </div>
        </>
      )}

      {/* ═══ Modal de edición ═══ */}
      {editDate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditDate(null)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl md:inset-x-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">{formatDateLong(editDate)}</h3>
              <button onClick={() => setEditDate(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de actividad</label>
              <Select value={editTipo} onValueChange={(v: string | null) => setEditTipo(v ?? "ENTRENAMIENTO")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Planificación</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder={editTipo === "TORNEO" ? "Ej: Torneo Liga Soccer vs Club X - Cancha 3 - 10:00" : "Ej: Calentamiento 15min\nRondo 4v2\nPosesión 6v6\nPartido reducido\nElongación"}
                rows={6}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditDate(null)} className="flex-1">Cancelar</Button>
              <Button onClick={saveEdit} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}
