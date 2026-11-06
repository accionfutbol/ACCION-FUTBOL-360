"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Trophy,
  Plus,
  Calendar,
  MapPin,
  ChevronLeft,
  Save,
  CheckCircle2,
  Users,
} from "lucide-react";

interface Sede { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; sede_id: string; }

interface Torneo {
  id: string;
  nombre: string;
  tipo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sede_id: string | null;
  categoria_id: string | null;
  lugar: string | null;
  descripcion: string | null;
  estado: string;
  created_at: string;
  sede_nombre?: string;
  categoria_nombre?: string;
  inscritos?: number;
}

const TIPOS = [
  { value: "EXTERNO", label: "Externo" },
  { value: "INTERNO", label: "Interno" },
  { value: "AMISTOSO", label: "Amistoso" },
];

const ESTADOS = [
  { value: "PLANIFICADO", label: "Planificado", color: "bg-blue-500/20 text-blue-400" },
  { value: "EN_CURSO", label: "En curso", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "FINALIZADO", label: "Finalizado", color: "bg-muted text-muted-foreground" },
  { value: "CANCELADO", label: "Cancelado", color: "bg-red-500/20 text-red-400" },
];

export default function TorneosPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Form fields
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("EXTERNO");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Detail view
  const [detalle, setDetalle] = useState<Torneo | null>(null);
  const [jugadoresTorneo, setJugadoresTorneo] = useState<any[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    async function init() {
      const [{ data: sed }, { data: cat }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      setSedes((sed ?? []) as Sede[]);
      setCategorias((cat ?? []) as Categoria[]);
    }
    init();
  }, [supabase]);

  const loadTorneos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("torneos")
      .select("*")
      .order("fecha_inicio", { ascending: false }) as { data: any[]; error: any };

    const sedeMap = new Map(sedes.map((s) => [s.id, s.nombre]));
    const catMap = new Map(categorias.map((c) => [c.id, c.nombre]));

    const enriched = (data ?? []).map((t: any) => ({
      ...t,
      sede_nombre: sedeMap.get(t.sede_id) ?? "",
      categoria_nombre: catMap.get(t.categoria_id) ?? "",
    }));

    setTorneos(enriched);
    setLoading(false);
  }, [supabase, sedes, categorias]);

  useEffect(() => {
    if (sedes.length > 0) loadTorneos();
  }, [sedes, loadTorneos]);

  const filteredCats = categorias.filter((c) => !sedeId || c.sede_id === sedeId);

  function resetForm() {
    setNombre(""); setTipo("EXTERNO"); setFechaInicio(""); setFechaFin("");
    setSedeId(""); setCatId(""); setLugar(""); setDescripcion("");
    setShowForm(false);
  }

  async function handleCrear() {
    if (!nombre.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("torneos").insert({
      nombre: nombre.trim(),
      tipo,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      sede_id: sedeId || null,
      categoria_id: catId || null,
      lugar: lugar.trim() || null,
      descripcion: descripcion.trim() || null,
      estado: "PLANIFICADO",
    });

    setSaving(false);
    if (!error) {
      setGuardado(true);
      setTimeout(() => { setGuardado(false); resetForm(); loadTorneos(); }, 1000);
    }
  }

  async function openDetalle(torneo: Torneo) {
    setDetalle(torneo);
    setLoadingDetalle(true);

    const { data: tj } = await supabase
      .from("torneo_jugador")
      .select("id, jugador_id, inscrito, pagado, monto, observacion")
      .eq("torneo_id", torneo.id) as { data: any[]; error: any };

    if (tj && tj.length > 0) {
      const jugIds = tj.map((t: any) => t.jugador_id);
      const { data: jugs } = await supabase
        .from("jugadores")
        .select("id, nombre, rut")
        .in("id", jugIds);
      const jugMap = new Map((jugs ?? []).map((j: any) => [j.id, j]));
      setJugadoresTorneo(
        tj.map((t: any) => ({
          ...t,
          nombre: jugMap.get(t.jugador_id)?.nombre ?? "",
          rut: jugMap.get(t.jugador_id)?.rut ?? "",
        }))
      );
    } else {
      setJugadoresTorneo([]);
    }
    setLoadingDetalle(false);
  }

  async function cambiarEstado(torneoId: string, nuevoEstado: string) {
    await supabase.from("torneos").update({ estado: nuevoEstado }).eq("id", torneoId);
    setTorneos((prev) =>
      prev.map((t) => t.id === torneoId ? { ...t, estado: nuevoEstado } : t)
    );
    if (detalle?.id === torneoId) setDetalle({ ...detalle!, estado: nuevoEstado });
  }

  const estadoBadge = (estado: string) => {
    const e = ESTADOS.find((s) => s.value === estado);
    return <Badge className={e?.color ?? ""}>{e?.label ?? estado}</Badge>;
  };

  if (detalle) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetalle(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Volver a torneos
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{detalle.nombre}</h1>
          {estadoBadge(detalle.estado)}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {detalle.tipo && (
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">{TIPOS.find((t) => t.value === detalle.tipo)?.label ?? detalle.tipo}</p>
            </div>
          )}
          {detalle.fecha_inicio && (
            <div>
              <p className="text-xs text-muted-foreground">Inicio</p>
              <p className="font-medium">{detalle.fecha_inicio}</p>
            </div>
          )}
          {detalle.fecha_fin && (
            <div>
              <p className="text-xs text-muted-foreground">Fin</p>
              <p className="font-medium">{detalle.fecha_fin}</p>
            </div>
          )}
          {detalle.lugar && (
            <div>
              <p className="text-xs text-muted-foreground">Lugar</p>
              <p className="font-medium">{detalle.lugar}</p>
            </div>
          )}
          {detalle.sede_nombre && (
            <div>
              <p className="text-xs text-muted-foreground">Sede</p>
              <p className="font-medium">{detalle.sede_nombre}</p>
            </div>
          )}
          {detalle.categoria_nombre && (
            <div>
              <p className="text-xs text-muted-foreground">Categoría</p>
              <p className="font-medium">{detalle.categoria_nombre}</p>
            </div>
          )}
        </div>

        {detalle.descripcion && (
          <Card>
            <CardContent className="p-3">
              <p className="text-sm">{detalle.descripcion}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          {detalle.estado === "PLANIFICADO" && (
            <Button size="sm" onClick={() => cambiarEstado(detalle.id, "EN_CURSO")} className="gap-1">
              Iniciar torneo
            </Button>
          )}
          {detalle.estado === "EN_CURSO" && (
            <Button size="sm" onClick={() => cambiarEstado(detalle.id, "FINALIZADO")} className="gap-1">
              Finalizar
            </Button>
          )}
          {(detalle.estado === "PLANIFICADO" || detalle.estado === "EN_CURSO") && (
            <Button size="sm" variant="outline" onClick={() => cambiarEstado(detalle.id, "CANCELADO")} className="gap-1 text-red-400">
              Cancelar
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> Jugadores inscritos ({jugadoresTorneo.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingDetalle ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : jugadoresTorneo.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Sin jugadores inscritos aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left">Jugador</th>
                      <th className="px-4 py-2 text-center">Pagado</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadoresTorneo.map((j: any) => (
                      <tr key={j.id} className="border-b border-border/50">
                        <td className="px-4 py-2 font-medium">{j.nombre}</td>
                        <td className="px-4 py-2 text-center">
                          {j.pagado ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
                          ) : (
                            <span className="text-xs text-yellow-400">Pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-xs">
                          {j.monto ? `$${Number(j.monto).toLocaleString("es-CL")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Torneos</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo torneo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Copa Primavera 2026" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={(v: string | null) => setTipo(v ?? "EXTERNO")}>
                  <SelectTrigger>
                    <SelectValue>{TIPOS.find((t) => t.value === tipo)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha inicio</Label>
                <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha fin</Label>
                <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sede</Label>
                <Select value={sedeId} onValueChange={(v: string | null) => setSedeId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Opcional"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin sede</SelectItem>
                    {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={catId} onValueChange={(v: string | null) => setCatId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional">{catId ? filteredCats.find((c) => c.id === catId)?.nombre : "Opcional"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin categoría</SelectItem>
                    {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lugar</Label>
              <Input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Complejo Deportivo Los Leones" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles del torneo..." rows={2} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
              <Button onClick={handleCrear} disabled={saving || !nombre.trim()} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : guardado ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? "Creando..." : guardado ? "¡Creado!" : "Crear torneo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : torneos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Trophy className="mx-auto h-8 w-8 mb-2" />
          <p>No hay torneos registrados</p>
          <p className="text-xs mt-1">Crea el primer torneo con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {torneos.map((t) => (
            <Card key={t.id} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => openDetalle(t)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold">{t.nombre}</h3>
                  {estadoBadge(t.estado)}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {TIPOS.find((tp) => tp.value === t.tipo)?.label ?? t.tipo}
                  </span>
                  {t.fecha_inicio && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {t.fecha_inicio}
                      {t.fecha_fin && ` — ${t.fecha_fin}`}
                    </span>
                  )}
                  {t.lugar && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {t.lugar}
                    </span>
                  )}
                  {t.sede_nombre && <span>{t.sede_nombre}</span>}
                  {t.categoria_nombre && <span>· {t.categoria_nombre}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
