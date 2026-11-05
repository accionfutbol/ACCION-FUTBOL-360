"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trophy,
  Calendar,
  Users,
  ChevronRight,
  Save,
  CheckCircle2,
} from "lucide-react";
import type { EstadoConvocatoria } from "@/lib/types";

interface Sede {
  id: string;
  nombre: string;
}
interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}
interface Partido {
  id: string;
  fecha: string;
  rival: string;
  torneo: string | null;
  marcador_favor: number;
  marcador_contra: number;
  observacion: string | null;
  categoria_id: string;
}
interface Jugador {
  id: string;
  nombre: string;
  rut: string;
  posicion_principal: string | null;
}
interface LineupEntry {
  jugador_id: string;
  nombre: string;
  rut: string;
  posicion: string | null;
  estado: EstadoConvocatoria;
  minutos: number;
  goles: number;
  asistencias_gol: number;
  tarj_amarilla: number;
  tarj_roja: number;
}

const ESTADOS_CONV: EstadoConvocatoria[] = [
  "TITULAR",
  "SUPLENTE",
  "INGRESO",
  "NO_CITADO",
];
const ESTADO_LABELS: Record<EstadoConvocatoria, string> = {
  TITULAR: "TIT",
  SUPLENTE: "SUP",
  INGRESO: "ING",
  NO_CITADO: "—",
};
const ESTADO_COLORS: Record<EstadoConvocatoria, string> = {
  TITULAR: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  SUPLENTE: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  INGRESO: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  NO_CITADO: "bg-muted text-muted-foreground border-border",
};

export default function PartidosPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal nuevo partido
  const [showNew, setShowNew] = useState(false);
  const [newFecha, setNewFecha] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [newRival, setNewRival] = useState("");
  const [newTorneo, setNewTorneo] = useState("");
  const [newFavor, setNewFavor] = useState(0);
  const [newContra, setNewContra] = useState(0);
  const [newObs, setNewObs] = useState("");
  const [creando, setCreando] = useState(false);

  // Detalle partido (lineup)
  const [selectedPartido, setSelectedPartido] = useState<Partido | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [lineup, setLineup] = useState<LineupEntry[]>([]);
  const [loadingLineup, setLoadingLineup] = useState(false);
  const [savingLineup, setSavingLineup] = useState(false);
  const [savedLineup, setSavedLineup] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const isAdmin = profile?.role === "admin";

      const [sedesRes, catsRes] = await Promise.all([
        supabase
          .from("sedes")
          .select("id, nombre")
          .eq("activa", true)
          .order("nombre"),
        supabase
          .from("categorias")
          .select("id, nombre, sede_id")
          .eq("activa", true)
          .order("nombre"),
      ]);

      if (!sedesRes.data || !catsRes.data) return;

      if (isAdmin) {
        setSedes(sedesRes.data);
        setCategorias(catsRes.data);
      } else {
        const { data: ent } = await supabase
          .from("entrenadores")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!ent) return;
        const { data: permisos } = await supabase
          .from("entrenador_categoria")
          .select("categoria_id")
          .eq("entrenador_id", ent.id);
        const catIds = new Set(
          (permisos ?? []).map((p) => p.categoria_id)
        );
        const filtCats = catsRes.data.filter((c) => catIds.has(c.id));
        const sedeIds = new Set(filtCats.map((c) => c.sede_id));
        setSedes(sedesRes.data.filter((s) => sedeIds.has(s.id)));
        setCategorias(filtCats);
      }
    }
    loadConfig();
  }, [supabase]);

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const loadPartidos = useCallback(async () => {
    if (!categoriaId) return;
    setLoading(true);
    const { data } = await supabase
      .from("partidos")
      .select(
        "id, fecha, rival, torneo, marcador_favor, marcador_contra, observacion, categoria_id"
      )
      .eq("categoria_id", categoriaId)
      .order("fecha", { ascending: false });
    setPartidos(data ?? []);
    setLoading(false);
  }, [categoriaId, supabase]);

  useEffect(() => {
    if (categoriaId) loadPartidos();
  }, [categoriaId, loadPartidos]);

  async function crearPartido() {
    if (!newRival.trim() || !categoriaId || !sedeId) return;
    setCreando(true);
    const { error } = await supabase.from("partidos").insert({
      fecha: newFecha,
      categoria_id: categoriaId,
      sede_id: sedeId,
      rival: newRival.trim(),
      torneo: newTorneo.trim() || null,
      marcador_favor: newFavor,
      marcador_contra: newContra,
      observacion: newObs.trim() || null,
    });
    setCreando(false);
    if (!error) {
      setShowNew(false);
      setNewRival("");
      setNewTorneo("");
      setNewFavor(0);
      setNewContra(0);
      setNewObs("");
      loadPartidos();
    }
  }

  async function openLineup(partido: Partido) {
    setSelectedPartido(partido);
    setLoadingLineup(true);

    const [jugsRes, pjRes] = await Promise.all([
      supabase
        .from("jugadores")
        .select("id, nombre, rut, posicion_principal")
        .eq("categoria_id", partido.categoria_id)
        .neq("estado", "DESACTIVADO")
        .order("nombre"),
      supabase
        .from("partido_jugador")
        .select("*")
        .eq("partido_id", partido.id),
    ]);

    const jugs = jugsRes.data ?? [];
    setJugadores(jugs);

    const pjMap: Record<string, any> = {};
    (pjRes.data ?? []).forEach((pj: any) => {
      pjMap[pj.jugador_id] = pj;
    });

    setLineup(
      jugs.map((j) => ({
        jugador_id: j.id,
        nombre: j.nombre,
        rut: j.rut,
        posicion: pjMap[j.id]?.posicion ?? j.posicion_principal ?? null,
        estado: pjMap[j.id]?.estado ?? "NO_CITADO",
        minutos: pjMap[j.id]?.minutos ?? 0,
        goles: pjMap[j.id]?.goles ?? 0,
        asistencias_gol: pjMap[j.id]?.asistencias_gol ?? 0,
        tarj_amarilla: pjMap[j.id]?.tarj_amarilla ?? 0,
        tarj_roja: pjMap[j.id]?.tarj_roja ?? 0,
      }))
    );
    setLoadingLineup(false);
  }

  function updateLineupEntry(
    jugadorId: string,
    field: keyof LineupEntry,
    value: any
  ) {
    setLineup((prev) =>
      prev.map((l) =>
        l.jugador_id === jugadorId ? { ...l, [field]: value } : l
      )
    );
  }

  function cycleEstado(jugadorId: string) {
    setLineup((prev) =>
      prev.map((l) => {
        if (l.jugador_id !== jugadorId) return l;
        const idx = ESTADOS_CONV.indexOf(l.estado);
        return { ...l, estado: ESTADOS_CONV[(idx + 1) % ESTADOS_CONV.length] };
      })
    );
  }

  async function guardarLineup() {
    if (!selectedPartido) return;
    setSavingLineup(true);

    const citados = lineup.filter((l) => l.estado !== "NO_CITADO");
    const upserts = citados.map((l) => ({
      partido_id: selectedPartido.id,
      jugador_id: l.jugador_id,
      estado: l.estado,
      minutos: l.minutos,
      posicion: l.posicion,
      goles: l.goles,
      asistencias_gol: l.asistencias_gol,
      tarj_amarilla: l.tarj_amarilla,
      tarj_roja: l.tarj_roja,
    }));

    if (upserts.length > 0) {
      await supabase
        .from("partido_jugador")
        .upsert(upserts, { onConflict: "partido_id,jugador_id" });
    }

    // Eliminar no citados que antes estaban
    const noCitados = lineup
      .filter((l) => l.estado === "NO_CITADO")
      .map((l) => l.jugador_id);
    if (noCitados.length > 0) {
      await supabase
        .from("partido_jugador")
        .delete()
        .eq("partido_id", selectedPartido.id)
        .in("jugador_id", noCitados);
    }

    setSavingLineup(false);
    setSavedLineup(true);
    setTimeout(() => setSavedLineup(false), 2000);
  }

  const resumenLineup = {
    titulares: lineup.filter((l) => l.estado === "TITULAR").length,
    suplentes: lineup.filter((l) => l.estado === "SUPLENTE").length,
    ingresos: lineup.filter((l) => l.estado === "INGRESO").length,
    goles: lineup.reduce((s, l) => s + l.goles, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Partidos</h1>
        {categoriaId && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowNew(true)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Partido
          </Button>
        )}
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                {categoriaId && categoriasFiltered.find((c) => c.id === categoriaId)?.nombre}
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
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Lista de partidos */}
      {!loading && categoriaId && partidos.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No hay partidos registrados.
        </p>
      )}

      {!loading && partidos.length > 0 && !selectedPartido && (
        <div className="space-y-2">
          {partidos.map((p) => {
            const cat = categorias.find((c) => c.id === p.categoria_id);
            const resultado =
              p.marcador_favor > p.marcador_contra
                ? "V"
                : p.marcador_favor < p.marcador_contra
                ? "D"
                : "E";
            const resultColor =
              resultado === "V"
                ? "text-emerald-500"
                : resultado === "D"
                ? "text-red-500"
                : "text-yellow-500";
            return (
              <button
                key={p.id}
                onClick={() => openLineup(p)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    vs {p.rival}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {p.fecha.split("-").reverse().join("/")}
                    {p.torneo && (
                      <>
                        <span>·</span>
                        <span>{p.torneo}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${resultColor}`}>
                    {p.marcador_favor} - {p.marcador_contra}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detalle / Lineup */}
      {selectedPartido && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPartido(null)}
            >
              ← Volver
            </Button>
            <h2 className="text-sm font-semibold">
              vs {selectedPartido.rival} —{" "}
              {selectedPartido.fecha.split("-").reverse().join("/")}
            </h2>
          </div>

          {/* Resumen */}
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border px-3 py-1 text-xs font-medium">
              {resumenLineup.titulares} titulares
            </span>
            <span className="rounded-full border px-3 py-1 text-xs font-medium">
              {resumenLineup.suplentes} suplentes
            </span>
            <span className="rounded-full border px-3 py-1 text-xs font-medium">
              {resumenLineup.ingresos} ingresos
            </span>
            <span className="rounded-full border px-3 py-1 text-xs font-medium">
              {resumenLineup.goles} goles
            </span>
          </div>

          {loadingLineup ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Tabla lineup */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">
                        Jugador
                      </th>
                      <th className="px-2 py-2 text-center font-medium">
                        Estado
                      </th>
                      <th className="px-2 py-2 text-center font-medium w-16">
                        Min
                      </th>
                      <th className="px-2 py-2 text-center font-medium w-12">
                        Gol
                      </th>
                      <th className="px-2 py-2 text-center font-medium w-12">
                        Ast
                      </th>
                      <th className="px-2 py-2 text-center font-medium w-12">
                        TA
                      </th>
                      <th className="px-2 py-2 text-center font-medium w-12">
                        TR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineup.map((l) => (
                      <tr
                        key={l.jugador_id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium">{l.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.posicion ?? "—"}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => cycleEstado(l.jugador_id)}
                            className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold transition-all active:scale-95 ${ESTADO_COLORS[l.estado]}`}
                          >
                            {ESTADO_LABELS[l.estado]}
                          </button>
                        </td>
                        <td className="px-1 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={120}
                            value={l.minutos}
                            onChange={(e) =>
                              updateLineupEntry(
                                l.jugador_id,
                                "minutos",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-14 text-center text-xs mx-auto"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={l.goles}
                            onChange={(e) =>
                              updateLineupEntry(
                                l.jugador_id,
                                "goles",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-12 text-center text-xs mx-auto"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={l.asistencias_gol}
                            onChange={(e) =>
                              updateLineupEntry(
                                l.jugador_id,
                                "asistencias_gol",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-12 text-center text-xs mx-auto"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={l.tarj_amarilla}
                            onChange={(e) =>
                              updateLineupEntry(
                                l.jugador_id,
                                "tarj_amarilla",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-12 text-center text-xs mx-auto"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={l.tarj_roja}
                            onChange={(e) =>
                              updateLineupEntry(
                                l.jugador_id,
                                "tarj_roja",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-12 text-center text-xs mx-auto"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón guardar */}
              <div className="sticky bottom-4 flex justify-center">
                <Button
                  size="lg"
                  onClick={guardarLineup}
                  disabled={savingLineup}
                  className="gap-2 shadow-lg"
                >
                  {savingLineup ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : savedLineup ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Guardado
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar Lineup
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && !categoriaId && (
        <p className="py-12 text-center text-muted-foreground">
          Selecciona una sede y categoría para ver los partidos.
        </p>
      )}

      {/* Modal nuevo partido */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Partido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={newFecha}
                onChange={(e) => setNewFecha(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rival *</Label>
              <Input
                value={newRival}
                onChange={(e) => setNewRival(e.target.value)}
                placeholder="Nombre del rival"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Torneo</Label>
              <Input
                value={newTorneo}
                onChange={(e) => setNewTorneo(e.target.value)}
                placeholder="Liga, copa, amistoso..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Goles a favor</Label>
                <Input
                  type="number"
                  min={0}
                  value={newFavor}
                  onChange={(e) => setNewFavor(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goles en contra</Label>
                <Input
                  type="number"
                  min={0}
                  value={newContra}
                  onChange={(e) => setNewContra(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Input
                value={newObs}
                onChange={(e) => setNewObs(e.target.value)}
                placeholder="Comentario del partido"
              />
            </div>
            <Button
              className="w-full"
              onClick={crearPartido}
              disabled={creando || !newRival.trim()}
            >
              {creando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Crear Partido"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
