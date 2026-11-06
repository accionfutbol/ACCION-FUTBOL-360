"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Camera,
  Video,
  Plus,
  Save,
  CheckCircle2,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface Sede { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; sede_id: string; }

interface Album {
  id: string;
  concepto: string;
  mes: string | null;
  tipo: string;
  link_drive: string | null;
  sede_nombre?: string;
  categoria_nombre?: string;
  created_at: string;
}

export default function FotosPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [concepto, setConcepto] = useState("");
  const [mes, setMes] = useState("");
  const [tipo, setTipo] = useState("FOTO");
  const [linkDrive, setLinkDrive] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");

  const [filterSede, setFilterSede] = useState("");

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

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("albums").select("*").order("created_at", { ascending: false });
    if (filterSede) q = q.eq("sede_id", filterSede);
    const { data } = await q as { data: any[]; error: any };

    const sedeMap = new Map(sedes.map((s) => [s.id, s.nombre]));
    const catMap = new Map(categorias.map((c) => [c.id, c.nombre]));

    setAlbums((data ?? []).map((a: any) => ({
      ...a,
      sede_nombre: sedeMap.get(a.sede_id) ?? "",
      categoria_nombre: catMap.get(a.categoria_id) ?? "",
    })));
    setLoading(false);
  }, [supabase, sedes, categorias, filterSede]);

  useEffect(() => {
    if (sedes.length > 0) loadAlbums();
  }, [sedes, loadAlbums]);

  const filteredCats = categorias.filter((c) => !sedeId || c.sede_id === sedeId);

  function resetForm() {
    setConcepto(""); setMes(""); setTipo("FOTO"); setLinkDrive("");
    setSedeId(""); setCatId(""); setShowForm(false);
  }

  async function handleCrear() {
    if (!concepto.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("albums").insert({
      concepto: concepto.trim(),
      mes: mes || null,
      tipo,
      link_drive: linkDrive.trim() || null,
      sede_id: sedeId || null,
      categoria_id: catId || null,
    });
    setSaving(false);
    if (!error) {
      setGuardado(true);
      setTimeout(() => { setGuardado(false); resetForm(); loadAlbums(); }, 1000);
    }
  }

  async function handleEliminar(id: string) {
    await supabase.from("albums").delete().eq("id", id);
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Fotos y Videos</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo álbum
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterSede} onValueChange={(v: string | null) => setFilterSede(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las sedes">{filterSede ? sedes.find((s) => s.id === filterSede)?.nombre : "Todas las sedes"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las sedes</SelectItem>
            {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Concepto *</Label>
                <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Torneo Copa Chile" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mes</Label>
                <Input value={mes} onChange={(e) => setMes(e.target.value)} placeholder="Noviembre 2026" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={(v: string | null) => setTipo(v ?? "FOTO")}>
                  <SelectTrigger>
                    <SelectValue>{tipo === "FOTO" ? "Fotos" : "Video"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOTO">Fotos</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sede</Label>
                <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCatId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Opcional"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin sede</SelectItem>
                    {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link Google Drive</Label>
              <Input value={linkDrive} onChange={(e) => setLinkDrive(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
              <Button onClick={handleCrear} disabled={saving || !concepto.trim()} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : guardado ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? "Guardando..." : guardado ? "¡Guardado!" : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : albums.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Camera className="mx-auto h-8 w-8 mb-2" />
          <p>No hay álbumes registrados</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {albums.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {a.tipo === "FOTO" ? (
                      <Camera className="h-4 w-4 text-primary" />
                    ) : (
                      <Video className="h-4 w-4 text-primary" />
                    )}
                    <h3 className="text-sm font-bold">{a.concepto}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                  {a.mes && <span>{a.mes}</span>}
                  {a.sede_nombre && <span>· {a.sede_nombre}</span>}
                  {a.categoria_nombre && <span>· {a.categoria_nombre}</span>}
                </div>
                <div className="flex gap-2">
                  {a.link_drive && (
                    <a
                      href={a.link_drive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir en Drive
                    </a>
                  )}
                  <button
                    onClick={() => handleEliminar(a.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
