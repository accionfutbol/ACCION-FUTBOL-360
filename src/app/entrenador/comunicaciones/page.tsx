"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Plus, Megaphone } from "lucide-react";

interface Comunicacion {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string;
  para_todos: boolean;
  sede_id: string | null;
  categoria_id: string | null;
  created_at: string;
}

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}

export default function ComunicacionesPage() {
  const supabase = createClient();
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo] = useState("AVISO");
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [paraTodos, setParaTodos] = useState(true);

  useEffect(() => {
    async function load() {
      const [sedesRes, catRes, commsRes] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
        supabase.from("comunicaciones").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      setSedes((sedesRes.data ?? []) as Sede[]);
      setCategorias((catRes.data ?? []) as Categoria[]);
      setComunicaciones((commsRes.data ?? []) as Comunicacion[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const categoriasFiltered = sedeId
    ? categorias.filter((c) => c.sede_id === sedeId)
    : categorias;

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("comunicaciones").insert({
      titulo,
      contenido,
      tipo,
      para_todos: paraTodos,
      sede_id: paraTodos ? null : (sedeId || null),
      categoria_id: paraTodos ? null : (categoriaId || null),
      autor_id: user?.id ?? null,
    });

    if (!error) {
      const { data: comms } = await supabase
        .from("comunicaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setComunicaciones((comms ?? []) as Comunicacion[]);
      setDialogOpen(false);
      setTitulo("");
      setContenido("");
      setTipo("AVISO");
      setSedeId("");
      setCategoriaId("");
      setParaTodos(true);
    }
    setSaving(false);
  }

  function tipoColor(t: string) {
    switch (t) {
      case "AVISO": return "bg-blue-500/20 text-blue-400";
      case "URGENTE": return "bg-red-500/20 text-red-400";
      case "EVENTO": return "bg-emerald-500/20 text-emerald-400";
      case "RECORDATORIO": return "bg-yellow-500/20 text-yellow-400";
      default: return "";
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Comunicaciones</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo aviso
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear comunicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Asunto del aviso" />
              </div>
              <div className="space-y-2">
                <Label>Contenido</Label>
                <Textarea value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Detalle del aviso..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v: string | null) => setTipo(v ?? "AVISO")}>
                  <SelectTrigger><SelectValue placeholder="Tipo">{tipo}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVISO">Aviso</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                    <SelectItem value="EVENTO">Evento</SelectItem>
                    <SelectItem value="RECORDATORIO">Recordatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paraTodos"
                  checked={paraTodos}
                  onChange={(e) => setParaTodos(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="paraTodos">Para todos</Label>
              </div>
              {!paraTodos && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Sede</Label>
                    <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCategoriaId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Sede">{sedeId && sedes.find(s => s.id === sedeId)?.nombre}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {sedes.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={categoriaId} onValueChange={(v: string | null) => setCategoriaId(v ?? "")}>
                      <SelectTrigger><SelectValue placeholder="Categoría">{categoriaId && categoriasFiltered.find(c => c.id === categoriaId)?.nombre}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {categoriasFiltered.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <Button onClick={handleSave} disabled={saving || !titulo.trim() || !contenido.trim()} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Publicar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {comunicaciones.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No hay comunicaciones aún.</p>
      ) : (
        <div className="space-y-3">
          {comunicaciones.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{c.titulo}</CardTitle>
                  <Badge className={tipoColor(c.tipo)}>{c.tipo}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("es-CL")}
                  {c.para_todos ? " · General" : ""}
                </p>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{c.contenido}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
