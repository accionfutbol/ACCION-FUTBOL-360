"use client";

import { useAsistencia } from "@/hooks/use-asistencia";
import { JugadorRow } from "@/components/asistencia/jugador-row";
import { ResumenBar } from "@/components/asistencia/resumen-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function AsistenciaPage() {
  const {
    sedes,
    categorias,
    sedeId,
    setSedeId,
    categoriaId,
    setCategoriaId,
    fecha,
    setFecha,
    diasEntrenamiento,
    fechaAnterior,
    fechaSiguiente,
    jugadores,
    loading,
    saving,
    dirty,
    setMarca,
    guardar,
    resumen,
  } = useAsistencia();

  const [guardado, setGuardado] = useState(false);

  async function handleGuardar() {
    const ok = await guardar();
    if (ok) {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Asistencia</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select
            value={sedeId}
            onValueChange={(v: string | null) => {
              setSedeId(v ?? "");
              setCategoriaId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona sede">
                {sedeId && sedes.find((s) => s.id === sedeId)?.nombre}
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
            onValueChange={(v: string | null) => setCategoriaId(v ?? "")}
            disabled={!sedeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría">
                {categoriaId && categorias.find((c) => c.id === categoriaId)?.nombre}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={fechaAnterior}
              disabled={diasEntrenamiento.length === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col items-center rounded-md border px-2 py-1">
              <span className="text-sm font-medium">
                {fecha.split("-").reverse().join("/")}
              </span>
              <span className="text-xs text-muted-foreground">
                {DIAS_SEMANA[new Date(fecha + "T12:00:00").getDay()]}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={fechaSiguiente}
              disabled={diasEntrenamiento.length === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && jugadores.length > 0 && (
        <>
          <ResumenBar {...resumen} />

          <div className="space-y-2">
            {jugadores.map((j) => (
              <JugadorRow
                key={j.jugador_id}
                nombre={j.nombre}
                rut={j.rut}
                estado={j.estado}
                marca={j.marca}
                telefonoApoderado={j.telefono_apoderado}
                onMarcaChange={(m) => setMarca(j.jugador_id, m)}
              />
            ))}
          </div>

          <div className="sticky bottom-4 flex justify-center">
            <Button
              size="lg"
              onClick={handleGuardar}
              disabled={saving || !dirty}
              className="gap-2 shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : guardado ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Guardado
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Asistencia
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {!loading && categoriaId && jugadores.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No hay jugadores registrados en esta categoría.
        </div>
      )}

      {!loading && !categoriaId && (
        <div className="py-12 text-center text-muted-foreground">
          Selecciona una sede y categoría para tomar asistencia.
        </div>
      )}
    </div>
  );
}
