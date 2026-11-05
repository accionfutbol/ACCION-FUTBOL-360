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
  Loader2,
  CheckCircle2,
  Save,
  Search,
  ChevronLeft,
  Star,
} from "lucide-react";

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}

interface Jugador {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
  posicion_principal: string | null;
  posicion_secundaria: string | null;
  pie_dominante: string | null;
  nivel: string | null;
  subnivel: string | null;
}

interface Evaluacion {
  id: string;
  nota_tecnica: number | null;
  nota_fisica: number | null;
  nota_actitudinal: number | null;
  promedio: number | null;
  comentario: string | null;
  semestre: number;
  anio: number;
}

const ESCALA = [
  { nota: 7, label: "Sobresaliente", desc: "Rendimiento excepcional, destaca claramente" },
  { nota: 6, label: "Muy bueno", desc: "Supera las expectativas de su categoría" },
  { nota: 5, label: "Bueno", desc: "Buen nivel, cumple lo esperado" },
  { nota: 4, label: "Regular", desc: "Nivel aceptable, puede mejorar" },
  { nota: 3, label: "Insuficiente", desc: "Por debajo de lo esperado" },
  { nota: 2, label: "Deficiente", desc: "Muy por debajo, necesita trabajo" },
  { nota: 1, label: "Muy deficiente", desc: "No cumple los mínimos" },
];

function promColor(p: number | null): string {
  if (!p) return "text-muted-foreground";
  if (p >= 6) return "text-pink-500";
  if (p >= 5) return "text-green-500";
  if (p >= 4) return "text-yellow-500";
  return "text-red-500";
}

function promBg(p: number | null): string {
  if (!p) return "bg-muted";
  if (p >= 6) return "bg-pink-500/10 border-pink-500/30";
  if (p >= 5) return "bg-green-500/10 border-green-500/30";
  if (p >= 4) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function calcPromedio(t: string, f: string, a: string): number | null {
  const vals = [t, f, a]
    .map((v) => parseFloat(v.replace(",", ".")))
    .filter((v) => !isNaN(v) && v >= 1 && v <= 7);
  if (vals.length === 0) return null;
  const m = vals.reduce((s, x) => s + x, 0) / vals.length;
  return Math.round(m * 10) / 10;
}

export default function EvaluacionesPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Modal state
  const [selected, setSelected] = useState<Jugador | null>(null);
  const [eval_, setEval_] = useState<Evaluacion | null>(null);
  const [notaTec, setNotaTec] = useState("");
  const [notaFis, setNotaFis] = useState("");
  const [notaAct, setNotaAct] = useState("");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [showEscala, setShowEscala] = useState(false);

  const semestre = new Date().getMonth() < 6 ? 1 : 2;
  const anio = new Date().getFullYear();

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
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!entrenador) return;

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

  const loadJugadores = useCallback(async () => {
    if (!categoriaId) return;
    setLoading(true);

    const { data } = await supabase
      .from("jugadores")
      .select("id, nombre, rut, estado, posicion_principal, posicion_secundaria, pie_dominante, nivel, subnivel")
      .eq("categoria_id", categoriaId)
      .neq("estado", "DESACTIVADO")
      .order("nombre");

    setJugadores(data ?? []);
    setLoading(false);
  }, [categoriaId, supabase]);

  useEffect(() => {
    if (categoriaId) loadJugadores();
  }, [categoriaId, loadJugadores]);

  const jugadoresFiltrados = jugadores.filter((j) =>
    !busqueda || j.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Cargar evaluaciones en batch para mostrar promedio en la lista
  const [promedios, setPromedios] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (jugadores.length === 0) return;
    async function loadPromedios() {
      const ids = jugadores.map((j) => j.id);
      const { data } = await supabase
        .from("evaluaciones")
        .select("jugador_id, promedio")
        .in("jugador_id", ids)
        .eq("semestre", semestre)
        .eq("anio", anio);

      const map: Record<string, number | null> = {};
      (data ?? []).forEach((e) => {
        map[e.jugador_id] = e.promedio;
      });
      setPromedios(map);
    }
    loadPromedios();
  }, [jugadores, supabase, semestre, anio]);

  async function openJugador(j: Jugador) {
    setSelected(j);
    setShowEscala(false);

    const { data } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("jugador_id", j.id)
      .eq("semestre", semestre)
      .eq("anio", anio)
      .maybeSingle();

    if (data) {
      setEval_(data);
      setNotaTec(data.nota_tecnica?.toString() ?? "");
      setNotaFis(data.nota_fisica?.toString() ?? "");
      setNotaAct(data.nota_actitudinal?.toString() ?? "");
      setComentario(data.comentario ?? "");
    } else {
      setEval_(null);
      setNotaTec("");
      setNotaFis("");
      setNotaAct("");
      setComentario("");
    }
  }

  function closeModal() {
    setSelected(null);
    setEval_(null);
    setGuardado(false);
  }

  const prom = calcPromedio(notaTec, notaFis, notaAct);

  async function handleGuardar() {
    if (!selected) return;
    setSaving(true);

    const payload = {
      jugador_id: selected.id,
      semestre,
      anio,
      nota_tecnica: notaTec ? parseFloat(notaTec.replace(",", ".")) : null,
      nota_fisica: notaFis ? parseFloat(notaFis.replace(",", ".")) : null,
      nota_actitudinal: notaAct ? parseFloat(notaAct.replace(",", ".")) : null,
      promedio: prom,
      comentario: comentario || null,
    };

    let error;
    if (eval_) {
      ({ error } = await supabase
        .from("evaluaciones")
        .update(payload)
        .eq("id", eval_.id));
    } else {
      ({ error } = await supabase
        .from("evaluaciones")
        .insert(payload));
    }

    setSaving(false);

    if (!error) {
      setGuardado(true);
      setPromedios((prev) => ({ ...prev, [selected.id]: prom }));
      setTimeout(() => setGuardado(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Evaluaciones</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select
            value={sedeId}
            onValueChange={(v: string | null) => {
              setSedeId(v ?? "");
              setCategoriaId("");
              setJugadores([]);
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
              {categoriasFiltered.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {categoriaId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jugador..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && categoriaId && (
        <div className="text-xs text-muted-foreground">
          {jugadoresFiltrados.length} jugador{jugadoresFiltrados.length !== 1 ? "es" : ""} · Semestre {semestre} — {anio}
        </div>
      )}

      {/* Lista de jugadores */}
      {!loading && jugadoresFiltrados.map((j) => {
        const p = promedios[j.id] ?? null;
        return (
          <button
            key={j.id}
            onClick={() => openJugador(j)}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {j.nombre}
                {j.estado === "NEW" && (
                  <span className="ml-2 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">NEW</span>
                )}
                {j.estado === "FULL" && (
                  <span className="ml-2 rounded bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-bold text-pink-400">FULL</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {[j.posicion_principal, j.pie_dominante].filter(Boolean).join(" · ") || "Sin datos"}
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Prom</span>
              <span className={`font-bold text-lg rounded-lg border px-3 py-1 ${promBg(p)} ${promColor(p)}`}>
                {p ? p.toFixed(1) : "—"}
              </span>
            </div>
          </button>
        );
      })}

      {/* Modal evaluación */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 my-auto space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Evaluación</h2>
                <p className="font-semibold text-base">{selected.nombre}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Posición</span>
                <p className="font-medium">{selected.posicion_principal || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Pie</span>
                <p className="font-medium">{selected.pie_dominante || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Nivel</span>
                <p className="font-medium">{selected.nivel || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Subnivel</span>
                <p className="font-medium">{selected.subnivel || "—"}</p>
              </div>
            </div>

            {/* Notas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider">Notas (escala 1-7)</Label>
                <button
                  onClick={() => setShowEscala(!showEscala)}
                  className="text-xs text-primary hover:underline"
                >
                  {showEscala ? "Ocultar escala" : "Ver escala"}
                </button>
              </div>

              {showEscala && (
                <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                  {ESCALA.map((e) => (
                    <div key={e.nota} className="flex gap-2 text-xs">
                      <span className="font-bold text-primary w-4">{e.nota}</span>
                      <span className="font-semibold">{e.label}</span>
                      <span className="text-muted-foreground">— {e.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Técnica</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    step={0.1}
                    value={notaTec}
                    onChange={(e) => setNotaTec(e.target.value)}
                    placeholder="1-7"
                    className="text-center text-lg font-bold h-12"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Física</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    step={0.1}
                    value={notaFis}
                    onChange={(e) => setNotaFis(e.target.value)}
                    placeholder="1-7"
                    className="text-center text-lg font-bold h-12"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Actitudinal</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    step={0.1}
                    value={notaAct}
                    onChange={(e) => setNotaAct(e.target.value)}
                    placeholder="1-7"
                    className="text-center text-lg font-bold h-12"
                  />
                </div>
              </div>
            </div>

            {/* Promedio */}
            <div className={`rounded-lg border p-3 text-center ${promBg(prom)}`}>
              <div className={`text-3xl font-bold ${promColor(prom)}`}>
                {prom ? prom.toFixed(1) : "—"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Promedio
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Comentario</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Observaciones sobre el jugador..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={saving}
                className="flex-1 gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : guardado ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Guardando..." : guardado ? "¡Guardado!" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
