"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Search,
  Activity,
} from "lucide-react";

interface Sede { id: string; nombre: string }
interface Categoria { id: string; nombre: string; sede_id: string }
interface Jugador { id: string; nombre: string; rut: string }

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

function fv(v: number | null) { return v !== null ? v.toString() : ""; }

export default function EvalFisicasPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedJugador, setSelectedJugador] = useState<Jugador | null>(null);
  const [evals, setEvals] = useState<EvalFisica[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [salto, setSalto] = useState("");
  const [velocidad, setVelocidad] = useState("");
  const [ift, setIft] = useState("");
  const [grasa, setGrasa] = useState("");
  const [musculo, setMusculo] = useState("");
  const [flex, setFlex] = useState("");
  const [resistencia, setResistencia] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    async function loadConfig() {
      const [sedesRes, catRes] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      setSedes((sedesRes.data ?? []) as Sede[]);
      setCategorias((catRes.data ?? []) as Categoria[]);
    }
    loadConfig();
  }, [supabase]);

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const loadJugadores = useCallback(async () => {
    if (!categoriaId) return;
    setLoading(true);
    const { data } = await supabase
      .from("jugadores")
      .select("id, nombre, rut")
      .eq("categoria_id", categoriaId)
      .neq("estado", "DESACTIVADO")
      .order("nombre");
    setJugadores(data ?? []);
    setLoading(false);
  }, [categoriaId, supabase]);

  useEffect(() => {
    if (categoriaId) loadJugadores();
  }, [categoriaId, loadJugadores]);

  const jugadoresFiltrados = jugadores.filter(
    (j) => !busqueda || j.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function openJugador(j: Jugador) {
    setSelectedJugador(j);
    const { data } = await supabase
      .from("eval_fisicas")
      .select("*")
      .eq("jugador_id", j.id)
      .order("fecha", { ascending: false });
    setEvals((data ?? []) as EvalFisica[]);
  }

  function openNew() {
    setFecha(new Date().toISOString().slice(0, 10));
    setAltura(""); setPeso(""); setSalto(""); setVelocidad("");
    setIft(""); setGrasa(""); setMusculo(""); setFlex("");
    setResistencia(""); setObservacion("");
    setDialogOpen(true);
  }

  function calcIMC(): number | null {
    const a = parseFloat(altura);
    const p = parseFloat(peso);
    if (!a || !p || a <= 0) return null;
    return Math.round((p / ((a / 100) ** 2)) * 10) / 10;
  }

  async function handleSave() {
    if (!selectedJugador) return;
    setSaving(true);

    const numOrNull = (v: string) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

    await supabase.from("eval_fisicas").insert({
      jugador_id: selectedJugador.id,
      fecha,
      altura: numOrNull(altura),
      peso: numOrNull(peso),
      imc: calcIMC(),
      salto: numOrNull(salto),
      velocidad_30m: numOrNull(velocidad),
      ift: numOrNull(ift),
      grasa_corporal: numOrNull(grasa),
      masa_muscular: numOrNull(musculo),
      flexibilidad: numOrNull(flex),
      resistencia: resistencia || null,
      observacion: observacion || null,
    });

    const { data } = await supabase
      .from("eval_fisicas")
      .select("*")
      .eq("jugador_id", selectedJugador.id)
      .order("fecha", { ascending: false });
    setEvals((data ?? []) as EvalFisica[]);

    setSaving(false);
    setDialogOpen(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Evaluaciones Físicas</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCategoriaId(""); setJugadores([]); setSelectedJugador(null); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona sede">{sedeId && sedes.find(s => s.id === sedeId)?.nombre}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sedes.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select value={categoriaId} onValueChange={(v: string | null) => { setCategoriaId(v ?? ""); setSelectedJugador(null); }} disabled={!sedeId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría">{categoriaId && categoriasFiltered.find(c => c.id === categoriaId)?.nombre}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categoriasFiltered.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {categoriaId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar jugador..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Lista de jugadores */}
        <div className="space-y-2">
          {!loading && jugadoresFiltrados.map((j) => (
            <button
              key={j.id}
              onClick={() => openJugador(j)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:border-primary/50 ${
                selectedJugador?.id === j.id ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{j.nombre}</p>
                <p className="text-xs text-muted-foreground">{j.rut}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Detalle del jugador seleccionado */}
        {selectedJugador && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">{selectedJugador.nombre}</h2>
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" /> Nueva evaluación
              </Button>
            </div>

            {evals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin evaluaciones físicas.</p>
            ) : (
              <Card>
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
                        {evals.map((ev) => (
                          <TableRow key={ev.id}>
                            <TableCell className="text-xs whitespace-nowrap">{ev.fecha}</TableCell>
                            <TableCell className="text-right">{ev.altura ?? "-"}</TableCell>
                            <TableCell className="text-right">{ev.peso ?? "-"}</TableCell>
                            <TableCell className="text-right">{ev.imc ?? "-"}</TableCell>
                            <TableCell className="text-right">{ev.velocidad_30m ? `${ev.velocidad_30m}s` : "-"}</TableCell>
                            <TableCell className="text-right">{ev.salto ?? "-"}</TableCell>
                            <TableCell className="text-right">{ev.ift ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Dialog nueva evaluación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva evaluación — {selectedJugador?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Altura (cm)</Label>
                <Input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="170" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso (kg)</Label>
                <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="65" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Salto (cm)</Label>
                <Input type="number" value={salto} onChange={(e) => setSalto(e.target.value)} placeholder="35" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Velocidad 30m (seg)</Label>
                <Input type="number" step="0.01" value={velocidad} onChange={(e) => setVelocidad(e.target.value)} placeholder="4.5" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">IFT</Label>
                <Input type="number" step="0.1" value={ift} onChange={(e) => setIft(e.target.value)} placeholder="8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Flexibilidad (cm)</Label>
                <Input type="number" value={flex} onChange={(e) => setFlex(e.target.value)} placeholder="25" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grasa corporal (%)</Label>
                <Input type="number" step="0.1" value={grasa} onChange={(e) => setGrasa(e.target.value)} placeholder="15" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Masa muscular (kg)</Label>
                <Input type="number" step="0.1" value={musculo} onChange={(e) => setMusculo(e.target.value)} placeholder="28" />
              </div>
            </div>
            {altura && peso && (
              <p className="text-xs text-muted-foreground">
                IMC calculado: <strong>{calcIMC()}</strong>
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Resistencia</Label>
              <Input value={resistencia} onChange={(e) => setResistencia(e.target.value)} placeholder="Buena / Regular / etc." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observación</Label>
              <Textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar evaluación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
