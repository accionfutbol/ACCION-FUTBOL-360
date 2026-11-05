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
  Plus,
  MapPin,
  Layers,
  Pencil,
} from "lucide-react";

interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  activa: boolean;
  categorias_count: number;
  jugadores_count: number;
}

interface Categoria {
  id: string;
  sede_id: string;
  nombre: string;
  tipo: string;
  activa: boolean;
  jugadores_count: number;
}

export default function SedesAdminPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sede dialog
  const [sedeDialog, setSedeDialog] = useState(false);
  const [editSede, setEditSede] = useState<Sede | null>(null);
  const [sedeNombre, setSedeNombre] = useState("");
  const [sedeDireccion, setSedeDireccion] = useState("");
  const [sedeActiva, setSedeActiva] = useState(true);

  // Categoria dialog
  const [catDialog, setCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<Categoria | null>(null);
  const [catNombre, setCatNombre] = useState("");
  const [catSedeId, setCatSedeId] = useState("");
  const [catTipo, setCatTipo] = useState("COMPETITIVO");
  const [catActiva, setCatActiva] = useState(true);

  // Selected sede filter
  const [filtroSedeId, setFiltroSedeId] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: sedesRaw }, { data: catsRaw }, { data: jugadores }] = await Promise.all([
      supabase.from("sedes").select("id, nombre, direccion, activa").order("nombre"),
      supabase.from("categorias").select("id, sede_id, nombre, tipo, activa").order("nombre"),
      supabase.from("jugadores").select("id, sede_id, categoria_id").neq("estado", "DESACTIVADO"),
    ]);

    const sedesList = (sedesRaw ?? []) as { id: string; nombre: string; direccion: string | null; activa: boolean }[];
    const catsList = (catsRaw ?? []) as { id: string; sede_id: string; nombre: string; tipo: string; activa: boolean }[];
    const jugList = (jugadores ?? []) as { id: string; sede_id: string; categoria_id: string }[];

    const jugBySede: Record<string, number> = {};
    const jugByCat: Record<string, number> = {};
    const catsBySede: Record<string, number> = {};
    for (const j of jugList) {
      jugBySede[j.sede_id] = (jugBySede[j.sede_id] ?? 0) + 1;
      jugByCat[j.categoria_id] = (jugByCat[j.categoria_id] ?? 0) + 1;
    }
    for (const c of catsList) {
      catsBySede[c.sede_id] = (catsBySede[c.sede_id] ?? 0) + 1;
    }

    setSedes(sedesList.map((s) => ({
      ...s,
      categorias_count: catsBySede[s.id] ?? 0,
      jugadores_count: jugBySede[s.id] ?? 0,
    })));

    setCategorias(catsList.map((c) => ({
      ...c,
      jugadores_count: jugByCat[c.id] ?? 0,
    })));

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function openNewSede() {
    setEditSede(null);
    setSedeNombre("");
    setSedeDireccion("");
    setSedeActiva(true);
    setSedeDialog(true);
  }

  function openEditSede(s: Sede) {
    setEditSede(s);
    setSedeNombre(s.nombre);
    setSedeDireccion(s.direccion ?? "");
    setSedeActiva(s.activa);
    setSedeDialog(true);
  }

  async function saveSede() {
    setSaving(true);
    if (editSede) {
      await supabase.from("sedes").update({ nombre: sedeNombre, direccion: sedeDireccion || null, activa: sedeActiva }).eq("id", editSede.id);
    } else {
      await supabase.from("sedes").insert({ nombre: sedeNombre, direccion: sedeDireccion || null, activa: sedeActiva });
    }
    setSaving(false);
    setSedeDialog(false);
    loadData();
  }

  function openNewCat(preSedeId?: string) {
    setEditCat(null);
    setCatNombre("");
    setCatSedeId(preSedeId ?? filtroSedeId ?? "");
    setCatTipo("COMPETITIVO");
    setCatActiva(true);
    setCatDialog(true);
  }

  function openEditCat(c: Categoria) {
    setEditCat(c);
    setCatNombre(c.nombre);
    setCatSedeId(c.sede_id);
    setCatTipo(c.tipo);
    setCatActiva(c.activa);
    setCatDialog(true);
  }

  async function saveCat() {
    if (!catSedeId) return;
    setSaving(true);
    if (editCat) {
      await supabase.from("categorias").update({ nombre: catNombre, sede_id: catSedeId, tipo: catTipo, activa: catActiva }).eq("id", editCat.id);
    } else {
      await supabase.from("categorias").insert({ nombre: catNombre, sede_id: catSedeId, tipo: catTipo as any, activa: catActiva });
    }
    setSaving(false);
    setCatDialog(false);
    loadData();
  }

  const catsFiltradas = filtroSedeId
    ? categorias.filter((c) => c.sede_id === filtroSedeId)
    : categorias;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Gestión de Sedes y Categorías</h1>

      {/* SEDES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Sedes ({sedes.length})
          </h2>
          <Button size="sm" onClick={openNewSede}>
            <Plus className="mr-1 h-4 w-4" /> Nueva sede
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-center">Categorías</TableHead>
                    <TableHead className="text-center">Jugadores</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sedes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nombre}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.direccion ?? "—"}</TableCell>
                      <TableCell className="text-center">{s.categorias_count}</TableCell>
                      <TableCell className="text-center">{s.jugadores_count}</TableCell>
                      <TableCell>
                        <Badge className={s.activa ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                          {s.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditSede(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CATEGORÍAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" /> Categorías ({catsFiltradas.length})
          </h2>
          <div className="flex items-center gap-2">
            <Select value={filtroSedeId} onValueChange={(v: string | null) => setFiltroSedeId(v ?? "")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todas las sedes">{filtroSedeId ? sedes.find((s) => s.id === filtroSedeId)?.nombre : "Todas"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => openNewCat()}>
              <Plus className="mr-1 h-4 w-4" /> Nueva
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Jugadores</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catsFiltradas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{sedes.find((s) => s.id === c.sede_id)?.nombre ?? ""}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{c.jugadores_count}</TableCell>
                      <TableCell>
                        <Badge className={c.activa ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                          {c.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditCat(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Sede */}
      <Dialog open={sedeDialog} onOpenChange={setSedeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSede ? "Editar sede" : "Nueva sede"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={sedeNombre} onChange={(e) => setSedeNombre(e.target.value)} placeholder="Ej: Ñuñoa" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={sedeDireccion} onChange={(e) => setSedeDireccion(e.target.value)} placeholder="Av. Grecia 1234" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sedeActiva"
                checked={sedeActiva}
                onChange={(e) => setSedeActiva(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="sedeActiva">Activa</Label>
            </div>
            <Button onClick={saveSede} disabled={saving || !sedeNombre.trim()} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Categoría */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCat ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={catNombre} onChange={(e) => setCatNombre(e.target.value)} placeholder="Ej: Sub-12" />
            </div>
            <div className="space-y-2">
              <Label>Sede</Label>
              <Select value={catSedeId} onValueChange={(v: string | null) => setCatSedeId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede">{catSedeId && sedes.find((s) => s.id === catSedeId)?.nombre}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={catTipo} onValueChange={(v: string | null) => setCatTipo(v ?? "COMPETITIVO")}>
                <SelectTrigger>
                  <SelectValue>{catTipo}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPETITIVO">Competitivo</SelectItem>
                  <SelectItem value="RECREATIVO">Recreativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catActiva"
                checked={catActiva}
                onChange={(e) => setCatActiva(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="catActiva">Activa</Label>
            </div>
            <Button onClick={saveCat} disabled={saving || !catNombre.trim() || !catSedeId} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
