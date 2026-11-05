"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";

interface Sede { id: string; nombre: string }
interface Categoria { id: string; nombre: string; sede_id: string }

interface MensualidadRow {
  id: string;
  mes: string;
  monto: number | null;
  estado: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  observacion: string | null;
  jugador: { nombre: string; rut: string };
}

function estadoColor(estado: string) {
  switch (estado) {
    case "PAGADO": return "bg-emerald-500/20 text-emerald-400";
    case "PENDIENTE": return "bg-yellow-500/20 text-yellow-400";
    case "ATRASADO": return "bg-red-500/20 text-red-400";
    case "BECADO": return "bg-blue-500/20 text-blue-400";
    case "CONGELADO": return "bg-muted text-muted-foreground";
    default: return "";
  }
}

function formatMes(mes: string) {
  const meses: Record<string, string> = {
    "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
  };
  const [y, m] = mes.split("-");
  return `${meses[m] ?? m} ${y}`;
}

export default function AdminPagosPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [mensualidades, setMensualidades] = useState<MensualidadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Edit dialog
  const [editItem, setEditItem] = useState<MensualidadRow | null>(null);
  const [editEstado, setEditEstado] = useState("");
  const [editMonto, setEditMonto] = useState("");
  const [editMetodo, setEditMetodo] = useState("");
  const [editObs, setEditObs] = useState("");
  const [saving, setSaving] = useState(false);

  // Stats
  const totalPagado = mensualidades.filter(m => m.estado === "PAGADO").length;
  const totalPendiente = mensualidades.filter(m => m.estado === "PENDIENTE").length;
  const totalAtrasado = mensualidades.filter(m => m.estado === "ATRASADO").length;

  useEffect(() => {
    async function loadBase() {
      const [sedesRes, catRes] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      setSedes((sedesRes.data ?? []) as Sede[]);
      setCategorias((catRes.data ?? []) as Categoria[]);
      setLoading(false);
    }
    loadBase();
  }, [supabase]);

  const loadMensualidades = useCallback(async () => {
    setLoadingData(true);

    let jugadorIds: string[] = [];
    if (sedeId || categoriaId) {
      let q = supabase.from("jugadores").select("id");
      if (sedeId) q = q.eq("sede_id", sedeId);
      if (categoriaId) q = q.eq("categoria_id", categoriaId);
      const { data: jgs } = await q;
      jugadorIds = (jgs ?? []).map(j => j.id);
      if (jugadorIds.length === 0) { setMensualidades([]); setLoadingData(false); return; }
    }

    let q = supabase
      .from("mensualidades")
      .select("id, mes, monto, estado, fecha_pago, metodo_pago, observacion, jugadores(nombre, rut)")
      .order("mes", { ascending: false })
      .limit(200) as any;

    if (jugadorIds.length > 0) {
      q = q.in("jugador_id", jugadorIds);
    }
    if (filtroEstado) {
      q = q.eq("estado", filtroEstado);
    }

    const { data } = await q;

    let rows = ((data ?? []) as any[]).map((m: any) => ({
      ...m,
      jugador: m.jugadores ?? { nombre: "", rut: "" },
    }));

    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      rows = rows.filter(
        (r: any) =>
          r.jugador.nombre.toLowerCase().includes(b) ||
          r.jugador.rut.toLowerCase().includes(b)
      );
    }

    setMensualidades(rows);
    setLoadingData(false);
  }, [supabase, sedeId, categoriaId, filtroEstado, busqueda]);

  useEffect(() => {
    if (!loading) loadMensualidades();
  }, [loading, loadMensualidades]);

  function openEdit(m: MensualidadRow) {
    setEditItem(m);
    setEditEstado(m.estado);
    setEditMonto(m.monto?.toString() ?? "");
    setEditMetodo(m.metodo_pago ?? "");
    setEditObs(m.observacion ?? "");
  }

  async function handleSave() {
    if (!editItem) return;
    setSaving(true);

    await supabase.from("mensualidades").update({
      estado: editEstado as any,
      monto: editMonto ? Number(editMonto) : null,
      metodo_pago: editMetodo || null,
      observacion: editObs || null,
      fecha_pago: editEstado === "PAGADO" ? new Date().toISOString().slice(0, 10) : editItem.fecha_pago,
    }).eq("id", editItem.id);

    setSaving(false);
    setEditItem(null);
    loadMensualidades();
  }

  const categoriasFiltered = sedeId
    ? categorias.filter((c) => c.sede_id === sedeId)
    : categorias;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Gestión de Pagos</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{totalPagado}</p>
              <p className="text-xs text-muted-foreground">Pagados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{totalPendiente}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{totalAtrasado}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCategoriaId(""); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todas las sedes">{sedeId ? sedes.find(s => s.id === sedeId)?.nombre : "Todas las sedes"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las sedes</SelectItem>
            {sedes.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoriaId} onValueChange={(v: string | null) => setCategoriaId(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las categorías">{categoriaId ? categoriasFiltered.find(c => c.id === categoriaId)?.nombre : "Todas"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {categoriasFiltered.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={(v: string | null) => setFiltroEstado(v ?? "")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Todo estado">{filtroEstado || "Todo estado"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="PAGADO">Pagado</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="ATRASADO">Atrasado</SelectItem>
            <SelectItem value="BECADO">Becado</SelectItem>
            <SelectItem value="CONGELADO">Congelado</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : mensualidades.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin registros.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensualidades.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.jugador.nombre}</TableCell>
                      <TableCell className="text-xs">{m.jugador.rut}</TableCell>
                      <TableCell>{formatMes(m.mes)}</TableCell>
                      <TableCell>
                        <Badge className={estadoColor(m.estado)}>{m.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.monto !== null ? `$${m.monto.toLocaleString("es-CL")}` : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{m.fecha_pago ?? "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar pago — {editItem?.jugador.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {editItem ? formatMes(editItem.mes) : ""}
            </p>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editEstado} onValueChange={(v: string | null) => setEditEstado(v ?? "PENDIENTE")}>
                <SelectTrigger><SelectValue>{editEstado}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGADO">Pagado</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="ATRASADO">Atrasado</SelectItem>
                  <SelectItem value="BECADO">Becado</SelectItem>
                  <SelectItem value="CONGELADO">Congelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <Input type="number" value={editMonto} onChange={(e) => setEditMonto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Input value={editMetodo} onChange={(e) => setEditMetodo(e.target.value)} placeholder="Transferencia, Efectivo, etc." />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Input value={editObs} onChange={(e) => setEditObs(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
