"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { es } from "react-day-picker/locale";
import {
  Save,
  Loader2,
  CheckCircle2,
  CalendarIcon,
  Plus,
  Trash2,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es as esDateFns } from "date-fns/locale";

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}

interface JugadorNoInscrito {
  nombre: string;
  ano: string;
  telefono: string;
}

interface SesionData {
  id: string;
  fecha: string;
  balones: number | null;
  en_cancha: number | null;
  observacion: string | null;
  jugadores_no_inscritos: JugadorNoInscrito[] | null;
  entrenador_nombre: string | null;
  asistentes: number;
  ausentes: number;
  justificados: number;
  lesionados: number;
  total: number;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReporteEntrenamientoPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);

  const [sesion, setSesion] = useState<SesionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [noSesion, setNoSesion] = useState(false);

  const [balones, setBalones] = useState("");
  const [enCancha, setEnCancha] = useState("");
  const [observacion, setObservacion] = useState("");
  const [entrenadorNombre, setEntrenadorNombre] = useState("");
  const [noInscritos, setNoInscritos] = useState<JugadorNoInscrito[]>([]);

  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser();
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
          .select("id, nombre")
          .eq("user_id", user.id)
          .single();

        if (!entrenador) return;
        setEntrenadorNombre(entrenador.nombre);

        const { data: permisos } = await supabase
          .from("entrenador_categoria")
          .select("categoria_id")
          .eq("entrenador_id", entrenador.id);

        const catIds = new Set((permisos ?? []).map((p) => p.categoria_id));
        const filteredCats = allCats.filter((c) => catIds.has(c.id));
        const sedeIds = new Set(filteredCats.map((c) => c.sede_id));
        const filteredSedes = allSedes.filter((s) => sedeIds.has(s.id));

        setSedes(filteredSedes);
        setCategorias(filteredCats);
      }
    }
    loadConfig();
  }, [supabase]);

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const loadSesion = useCallback(async () => {
    if (!categoriaId || !fecha) return;
    setLoading(true);
    setNoSesion(false);
    setSesion(null);

    // Try with new columns first, fall back to base columns
    let sesionData: Record<string, unknown> | null = null;
    const { data: d1, error: e1 } = await supabase
      .from("sesiones_entrenamiento")
      .select("id, fecha, balones, en_cancha, observacion, jugadores_no_inscritos, entrenador_nombre")
      .eq("categoria_id", categoriaId)
      .eq("fecha", fecha)
      .maybeSingle();

    if (e1) {
      const { data: d2 } = await supabase
        .from("sesiones_entrenamiento")
        .select("id, fecha, balones, en_cancha, observacion")
        .eq("categoria_id", categoriaId)
        .eq("fecha", fecha)
        .maybeSingle();
      sesionData = d2 as Record<string, unknown> | null;
    } else {
      sesionData = d1 as Record<string, unknown> | null;
    }

    if (!sesionData) {
      setNoSesion(true);
      setBalones("");
      setEnCancha("");
      setObservacion("");
      setNoInscritos([]);
      setLoading(false);
      return;
    }

    const { data: marcas } = await supabase
      .from("asistencia")
      .select("marca")
      .eq("sesion_id", sesionData.id);

    const counts = { OK: 0, F: 0, J: 0, L: 0, total: 0 };
    (marcas ?? []).forEach((m) => {
      counts.total++;
      if (m.marca === "OK") counts.OK++;
      else if (m.marca === "F") counts.F++;
      else if (m.marca === "J") counts.J++;
      else if (m.marca === "L") counts.L++;
    });

    const s: SesionData = {
      id: sesionData.id as string,
      fecha: sesionData.fecha as string,
      balones: (sesionData.balones as number) ?? null,
      en_cancha: (sesionData.en_cancha as number) ?? null,
      observacion: (sesionData.observacion as string) ?? null,
      jugadores_no_inscritos: (sesionData.jugadores_no_inscritos as JugadorNoInscrito[]) ?? null,
      entrenador_nombre: (sesionData.entrenador_nombre as string) ?? null,
      asistentes: counts.OK,
      ausentes: counts.F,
      justificados: counts.J,
      lesionados: counts.L,
      total: counts.total,
    };

    setSesion(s);
    setBalones(s.balones?.toString() ?? "");
    setEnCancha(s.en_cancha?.toString() ?? "");
    setObservacion(s.observacion ?? "");
    setEntrenadorNombre((prev) => s.entrenador_nombre || prev);
    setNoInscritos(s.jugadores_no_inscritos ?? []);
    setLoading(false);
  }, [categoriaId, fecha, supabase]);

  useEffect(() => {
    if (categoriaId && fecha) loadSesion();
  }, [categoriaId, fecha, loadSesion]);

  function addNoInscrito() {
    setNoInscritos([...noInscritos, { nombre: "", ano: "", telefono: "" }]);
  }

  function updateNoInscrito(index: number, field: keyof JugadorNoInscrito, value: string) {
    setNoInscritos((prev) =>
      prev.map((ni, i) => (i === index ? { ...ni, [field]: value } : ni))
    );
  }

  function removeNoInscrito(index: number) {
    setNoInscritos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGuardar() {
    if (!sesion) return;
    setSaving(true);

    const updateData: Record<string, unknown> = {
      balones: balones ? parseInt(balones) : null,
      en_cancha: enCancha ? parseInt(enCancha) : null,
      observacion: observacion || null,
    };

    // Try to include new columns, fall back if they don't exist yet
    const { error: testErr } = await supabase
      .from("sesiones_entrenamiento")
      .select("jugadores_no_inscritos")
      .limit(0);

    if (!testErr) {
      updateData.jugadores_no_inscritos = noInscritos.length > 0 ? noInscritos : null;
      updateData.entrenador_nombre = entrenadorNombre || null;
    }

    const { error } = await supabase
      .from("sesiones_entrenamiento")
      .update(updateData)
      .eq("id", sesion.id);

    setSaving(false);

    if (!error) {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      await loadSesion();
    }
  }

  const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre ?? "";
  const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? "";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reporte de Entrenamiento</h1>

      {/* Selectores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select
            value={sedeId}
            onValueChange={(v: string | null) => {
              setSedeId(v ?? "");
              setCategoriaId("");
              setSesion(null);
              setNoSesion(false);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona sede">
                {sedeId && sedeNombre}
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
            onValueChange={(v: string | null) => {
              setCategoriaId(v ?? "");
            }}
            disabled={!sedeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría">
                {categoriaId && catNombre}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categoriasFiltered.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              className="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm text-left shadow-xs hover:bg-accent hover:text-accent-foreground"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {format(parseDate(fecha), "d 'de' MMMM yyyy", { locale: esDateFns })}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDate(fecha)}
                onSelect={(d) => {
                  if (d) {
                    setFecha(toISO(d));
                    setCalendarOpen(false);
                  }
                }}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {noSesion && !loading && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay sesión de asistencia registrada para esta fecha.
          </p>
          <p className="text-xs text-muted-foreground">
            Primero debes tomar asistencia en la sección correspondiente.
          </p>
        </div>
      )}

      {sesion && !loading && (
        <div className="space-y-4">
          {/* Resumen de asistencia */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Resumen de Asistencia</h2>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="rounded-md bg-muted p-2">
                <div className="text-lg font-bold">{sesion.total}</div>
                <div className="text-[10px] text-muted-foreground">TOTAL</div>
              </div>
              <div className="rounded-md bg-green-500/10 p-2">
                <div className="text-lg font-bold text-green-500">{sesion.asistentes}</div>
                <div className="text-[10px] text-muted-foreground">OK</div>
              </div>
              <div className="rounded-md bg-red-500/10 p-2">
                <div className="text-lg font-bold text-red-500">{sesion.ausentes}</div>
                <div className="text-[10px] text-muted-foreground">FALTAS</div>
              </div>
              <div className="rounded-md bg-yellow-500/10 p-2">
                <div className="text-lg font-bold text-yellow-500">{sesion.justificados}</div>
                <div className="text-[10px] text-muted-foreground">JUST.</div>
              </div>
              <div className="rounded-md bg-blue-500/10 p-2">
                <div className="text-lg font-bold text-blue-500">{sesion.lesionados}</div>
                <div className="text-[10px] text-muted-foreground">LESIÓN</div>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Datos del Entrenamiento</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="entrenador">Entrenador</Label>
                <Input
                  id="entrenador"
                  value={entrenadorNombre}
                  onChange={(e) => setEntrenadorNombre(e.target.value)}
                  placeholder="Nombre del entrenador"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="balones">Balones</Label>
                <Input
                  id="balones"
                  type="number"
                  min={0}
                  value={balones}
                  onChange={(e) => setBalones(e.target.value)}
                  placeholder="Cantidad"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enCancha">En Cancha</Label>
                <Input
                  id="enCancha"
                  type="number"
                  min={0}
                  value={enCancha}
                  onChange={(e) => setEnCancha(e.target.value)}
                  placeholder="Cantidad"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacion">Observación</Label>
              <Textarea
                id="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Observaciones del entrenamiento..."
                rows={3}
              />
            </div>
          </div>

          {/* Jugadores no inscritos */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Jugadores No Inscritos ({noInscritos.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={addNoInscrito}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>

            {noInscritos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No hay jugadores no inscritos en esta sesión.
              </p>
            )}

            {noInscritos.map((ni, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end"
              >
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Nombre</Label>}
                  <Input
                    value={ni.nombre}
                    onChange={(e) => updateNoInscrito(index, "nombre", e.target.value)}
                    placeholder="Nombre"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Año</Label>}
                  <Input
                    value={ni.ano}
                    onChange={(e) => updateNoInscrito(index, "ano", e.target.value)}
                    placeholder="2014"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Teléfono</Label>}
                  <Input
                    value={ni.telefono}
                    onChange={(e) => updateNoInscrito(index, "telefono", e.target.value)}
                    placeholder="+569..."
                    className="h-9"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => removeNoInscrito(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Botón guardar */}
          <Button
            onClick={handleGuardar}
            disabled={saving}
            className="w-full gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : guardado ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Guardando..." : guardado ? "¡Guardado!" : "Guardar Reporte"}
          </Button>
        </div>
      )}
    </div>
  );
}
