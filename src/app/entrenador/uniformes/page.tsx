"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Shirt,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Save,
} from "lucide-react";

const TIPOS_UNIFORME = [
  { value: "NEGRO", label: "Uniforme Negro" },
  { value: "ROSADO", label: "Uniforme Rosado" },
  { value: "POLERON", label: "Polerón" },
  { value: "SHORT", label: "Short" },
  { value: "MEDIAS", label: "Medias" },
  { value: "OTRO", label: "Otro" },
];

interface Sede { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; sede_id: string; }

interface UniformeRow {
  jugador_id: string;
  jugador_nombre: string;
  uniformes: {
    id: string;
    tipo: string;
    talla: string | null;
    entregado: boolean;
    fecha_entrega: string | null;
  }[];
}

export default function UniformesPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UniformeRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

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

  const filteredCats = categorias.filter((c) => c.sede_id === sedeId);

  const loadData = useCallback(async () => {
    if (!catId) return;
    setLoading(true);

    const { data: jugs } = await supabase
      .from("jugadores")
      .select("id, nombre")
      .eq("categoria_id", catId)
      .neq("estado", "DESACTIVADO")
      .order("nombre") as { data: any[]; error: any };

    if (!jugs?.length) { setRows([]); setLoading(false); return; }

    const jugIds = jugs.map((j: any) => j.id);
    const { data: unis } = await supabase
      .from("uniformes")
      .select("id, jugador_id, tipo, talla, entregado, fecha_entrega")
      .in("jugador_id", jugIds) as { data: any[]; error: any };

    const uniMap = new Map<string, any[]>();
    (unis ?? []).forEach((u: any) => {
      if (!uniMap.has(u.jugador_id)) uniMap.set(u.jugador_id, []);
      uniMap.get(u.jugador_id)!.push(u);
    });

    setRows(jugs.map((j: any) => ({
      jugador_id: j.id,
      jugador_nombre: j.nombre,
      uniformes: uniMap.get(j.id) ?? [],
    })));
    setLoading(false);
  }, [catId, supabase]);

  useEffect(() => { if (catId) loadData(); }, [catId, loadData]);

  async function toggleEntrega(uniId: string, jugId: string, current: boolean) {
    setSaving(uniId);
    await supabase.from("uniformes").update({
      entregado: !current,
      fecha_entrega: !current ? new Date().toISOString().slice(0, 10) : null,
    }).eq("id", uniId);

    setRows((prev) =>
      prev.map((r) =>
        r.jugador_id === jugId
          ? {
              ...r,
              uniformes: r.uniformes.map((u) =>
                u.id === uniId
                  ? { ...u, entregado: !current, fecha_entrega: !current ? new Date().toISOString().slice(0, 10) : null }
                  : u
              ),
            }
          : r
      )
    );
    setSaving(null);
  }

  async function addUniforme(jugId: string, tipo: string) {
    setSaving(`add-${jugId}`);
    const { data } = await supabase.from("uniformes").insert({
      jugador_id: jugId,
      tipo,
      entregado: false,
    }).select("id, jugador_id, tipo, talla, entregado, fecha_entrega").single();

    if (data) {
      setRows((prev) =>
        prev.map((r) =>
          r.jugador_id === jugId
            ? { ...r, uniformes: [...r.uniformes, data as any] }
            : r
        )
      );
    }
    setSaving(null);
  }

  const rowsFiltrados = rows.filter(
    (r) => !busqueda || r.jugador_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalEntregados = rows.reduce(
    (acc, r) => acc + r.uniformes.filter((u) => u.entregado).length, 0
  );
  const totalPendientes = rows.reduce(
    (acc, r) => acc + r.uniformes.filter((u) => !u.entregado).length, 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Uniformes</h1>
        <Badge variant="outline" className="text-xs">
          <Shirt className="mr-1 h-3 w-3" /> Control de entrega
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCatId(""); setRows([]); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona sede">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Selecciona sede"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select value={catId} onValueChange={(v: string | null) => setCatId(v ?? "")} disabled={!sedeId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría">{catId ? filteredCats.find((c) => c.id === catId)?.nombre : "Selecciona categoría"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {catId && (
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

      {catId && !loading && rows.length > 0 && (
        <div className="flex gap-4">
          <Badge className="bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" /> {totalEntregados} entregados
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-400">
            <XCircle className="mr-1 h-3 w-3" /> {totalPendientes} pendientes
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : catId && rows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Shirt className="mx-auto h-8 w-8 mb-2" />
          <p>No hay jugadores en esta categoría</p>
        </div>
      ) : catId ? (
        <div className="space-y-3">
          {rowsFiltrados.map((r) => (
            <Card key={r.jugador_id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{r.jugador_nombre}</p>
                  <Select onValueChange={(v: string | null) => v && addUniforme(r.jugador_id, v)}>
                    <SelectTrigger className="h-7 w-auto gap-1 text-xs">
                      <Plus className="h-3 w-3" />
                      <SelectValue placeholder="Agregar" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_UNIFORME.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {r.uniformes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin uniformes registrados</p>
                ) : (
                  <div className="space-y-1">
                    {r.uniformes.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          {u.entregado ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-yellow-400" />
                          )}
                          <span className="text-xs font-medium">
                            {TIPOS_UNIFORME.find((t) => t.value === u.tipo)?.label ?? u.tipo}
                          </span>
                          {u.talla && <Badge variant="outline" className="text-[10px]">{u.talla}</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {u.fecha_entrega && (
                            <span className="text-[10px] text-muted-foreground">{u.fecha_entrega}</span>
                          )}
                          <Button
                            size="sm"
                            variant={u.entregado ? "outline" : "default"}
                            className="h-6 text-[10px] px-2"
                            disabled={saving === u.id}
                            onClick={() => toggleEntrega(u.id, r.jugador_id, u.entregado)}
                          >
                            {saving === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.entregado ? "Revertir" : "Entregar"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
