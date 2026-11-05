"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Users,
  CalendarDays,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  Eye,
  Trophy,
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

interface Convocatoria {
  id: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  rival: string | null;
  mensaje: string | null;
  estado: string;
  categoria_id: string;
  sede_id: string;
  created_at: string;
}

interface ConvJugador {
  id: string;
  convocatoria_id: string;
  jugador_id: string;
  citado: boolean;
  respuesta: string | null;
  observacion: string | null;
  jugador_nombre?: string;
}

interface Jugador {
  id: string;
  nombre: string;
  estado: string;
}

function respuestaColor(r: string | null) {
  switch (r) {
    case "CONFIRMADO": return "bg-emerald-500/20 text-emerald-400";
    case "NO_PUEDE": return "bg-red-500/20 text-red-400";
    default: return "bg-yellow-500/20 text-yellow-400";
  }
}

function respuestaIcon(r: string | null) {
  switch (r) {
    case "CONFIRMADO": return CheckCircle2;
    case "NO_PUEDE": return XCircle;
    default: return HelpCircle;
  }
}

export default function ConvocatoriasPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [rival, setRival] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Detail view
  const [selected, setSelected] = useState<Convocatoria | null>(null);
  const [convJugadores, setConvJugadores] = useState<ConvJugador[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: sed }, { data: cat }, { data: conv }] = await Promise.all([
      supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
      supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      supabase.from("convocatorias").select("*").order("fecha", { ascending: false }).limit(50),
    ]);
    setSedes((sed ?? []) as Sede[]);
    setCategorias((cat ?? []) as Categoria[]);
    setConvocatorias((conv ?? []) as Convocatoria[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCats = categorias.filter((c) => !sedeId || c.sede_id === sedeId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!catId || !fecha) return;
    setSaving(true);

    const sId = sedeId || categorias.find((c) => c.id === catId)?.sede_id || "";

    // Get entrenador
    const { data: { user } } = await supabase.auth.getUser();
    const { data: ent } = await supabase.from("entrenadores").select("id").eq("user_id", user?.id ?? "").single() as { data: any; error: any };

    // Create convocatoria
    const { data: conv } = await supabase.from("convocatorias").insert({
      categoria_id: catId,
      sede_id: sId,
      fecha,
      hora: hora || null,
      lugar: lugar || null,
      rival: rival || null,
      mensaje: mensaje || null,
      entrenador_id: ent?.id ?? null,
    }).select("id").single() as { data: any; error: any };

    if (conv) {
      // Get active players from that category
      const { data: jugadores } = await supabase.from("jugadores")
        .select("id")
        .eq("categoria_id", catId)
        .in("estado", ["ACTIVO", "FULL", "NEW", "BECADO"]);

      if (jugadores && jugadores.length > 0) {
        const rows = jugadores.map((j: any) => ({
          convocatoria_id: conv.id,
          jugador_id: j.id,
          citado: true,
          respuesta: "PENDIENTE",
        }));
        await supabase.from("convocatoria_jugador").insert(rows);
      }
    }

    setSaving(false);
    setShowCreate(false);
    setFecha("");
    setHora("");
    setLugar("");
    setRival("");
    setMensaje("");
    loadData();
  }

  async function openDetail(conv: Convocatoria) {
    setSelected(conv);
    setLoadingDetail(true);
    const { data: cj } = await supabase
      .from("convocatoria_jugador")
      .select("*")
      .eq("convocatoria_id", conv.id)
      .order("created_at") as { data: any[]; error: any };

    const jugadorIds = (cj ?? []).map((c: any) => c.jugador_id);
    let jugMap = new Map<string, string>();
    if (jugadorIds.length > 0) {
      const { data: jugs } = await supabase
        .from("jugadores")
        .select("id, nombre")
        .in("id", jugadorIds);
      (jugs ?? []).forEach((j: any) => jugMap.set(j.id, j.nombre));
    }

    setConvJugadores(
      (cj ?? []).map((c: any) => ({
        ...c,
        jugador_nombre: jugMap.get(c.jugador_id) ?? "—",
      }))
    );
    setLoadingDetail(false);
  }

  async function cerrarConvocatoria(id: string) {
    await supabase.from("convocatorias").update({ estado: "CERRADA" }).eq("id", id);
    setSelected(null);
    loadData();
  }

  const confirmados = convJugadores.filter((c) => c.respuesta === "CONFIRMADO").length;
  const noPuede = convJugadores.filter((c) => c.respuesta === "NO_PUEDE").length;
  const pendientesResp = convJugadores.filter((c) => c.respuesta === "PENDIENTE" || !c.respuesta).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Convocatorias</h1>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : convocatorias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Send className="h-8 w-8" />
          <p>No hay convocatorias aún</p>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            Crear primera convocatoria
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {convocatorias.map((conv) => {
            const sede = sedes.find((s) => s.id === conv.sede_id);
            const cat = categorias.find((c) => c.id === conv.categoria_id);
            return (
              <Card
                key={conv.id}
                className="cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => openDetail(conv)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">
                        {conv.rival ? `vs ${conv.rival}` : "Convocatoria"}
                      </span>
                      <Badge
                        className={
                          conv.estado === "ABIERTA"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-zinc-500/20 text-zinc-400"
                        }
                      >
                        {conv.estado}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(conv.fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      {conv.hora && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {conv.hora}
                        </span>
                      )}
                      {sede && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {sede.nombre}
                        </span>
                      )}
                      {cat && <span>{cat.nombre}</span>}
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva convocatoria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sede</Label>
                <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCatId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sede">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Sede"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={catId} onValueChange={(v: string | null) => setCatId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría">{catId ? filteredCats.find((c) => c.id === catId)?.nombre : "Categoría"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rival</Label>
              <Input value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Nombre del rival" />
            </div>

            <div className="space-y-2">
              <Label>Lugar</Label>
              <Input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Cancha / dirección" />
            </div>

            <div className="space-y-2">
              <Label>Mensaje para los apoderados</Label>
              <Textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Información adicional..." rows={2} />
            </div>

            <Button type="submit" disabled={saving || !catId || !fecha} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Crear y citar jugadores activos
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Convocatoria — {selected?.rival ? `vs ${selected.rival}` : new Date((selected?.fecha ?? "") + "T12:00:00").toLocaleDateString("es-CL")}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(selected.fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                {selected.hora && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {selected.hora}
                  </span>
                )}
                {selected.lugar && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {selected.lugar}
                  </span>
                )}
              </div>

              {selected.mensaje && (
                <p className="rounded-lg bg-muted/50 p-3 text-sm">{selected.mensaje}</p>
              )}

              {/* Stats */}
              <div className="flex gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {confirmados} confirmados
                </Badge>
                <Badge className="bg-red-500/20 text-red-400">
                  <XCircle className="mr-1 h-3 w-3" /> {noPuede} no puede
                </Badge>
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  <HelpCircle className="mr-1 h-3 w-3" /> {pendientesResp} pendientes
                </Badge>
              </div>

              {loadingDetail ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="max-h-[40vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Respuesta</TableHead>
                        <TableHead>Obs.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {convJugadores.map((cj) => {
                        const Icon = respuestaIcon(cj.respuesta);
                        return (
                          <TableRow key={cj.id}>
                            <TableCell className="text-sm">{cj.jugador_nombre}</TableCell>
                            <TableCell>
                              <Badge className={respuestaColor(cj.respuesta)}>
                                <Icon className="mr-1 h-3 w-3" />
                                {cj.respuesta ?? "PENDIENTE"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {cj.observacion ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selected.estado === "ABIERTA" && (
                <Button
                  variant="outline"
                  onClick={() => cerrarConvocatoria(selected.id)}
                  className="w-full"
                >
                  Cerrar convocatoria
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
