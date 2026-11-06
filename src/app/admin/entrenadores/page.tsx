"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  UserCog,
  Plus,
  X,
  Users,
  Mail,
  Phone,
} from "lucide-react";

interface Entrenador {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  categorias: { id: string; nombre: string; sede_nombre: string }[];
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
  sede_nombre: string;
}

export default function EntrenadoresPage() {
  const supabase = createClient();
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [allCats, setAllCats] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState("");

  async function loadData() {
    setLoading(true);
    const [{ data: ents }, { data: cats }, { data: sedes }, { data: asigs }] =
      (await Promise.all([
        supabase.from("entrenadores").select("id, nombre, email, telefono, rol").order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
        supabase.from("sedes").select("id, nombre").eq("activa", true),
        supabase.from("entrenador_categoria").select("entrenador_id, categoria_id"),
      ])) as { data: any[] | null; error: any }[];

    const sedeMap = new Map<string, string>(
      (sedes ?? []).map((s: any) => [s.id, s.nombre])
    );
    const catMap = new Map<string, any>(
      (cats ?? []).map((c: any) => [
        c.id,
        { ...c, sede_nombre: sedeMap.get(c.sede_id) ?? "" },
      ])
    );

    setAllCats(
      (cats ?? []).map((c: any) => ({
        ...c,
        sede_nombre: sedeMap.get(c.sede_id) ?? "",
      }))
    );

    const asigMap = new Map<string, string[]>();
    (asigs ?? []).forEach((a: any) => {
      if (!asigMap.has(a.entrenador_id)) asigMap.set(a.entrenador_id, []);
      asigMap.get(a.entrenador_id)!.push(a.categoria_id);
    });

    setEntrenadores(
      (ents ?? []).map((e: any) => ({
        ...e,
        categorias: (asigMap.get(e.id) ?? [])
          .map((cid: string) => catMap.get(cid))
          .filter(Boolean),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  async function handleAsignar(entrenadorId: string) {
    if (!selectedCat) return;
    await supabase.from("entrenador_categoria").insert({
      entrenador_id: entrenadorId,
      categoria_id: selectedCat,
    });
    setAssigning(null);
    setSelectedCat("");
    loadData();
  }

  async function handleRemover(entrenadorId: string, categoriaId: string) {
    await supabase
      .from("entrenador_categoria")
      .delete()
      .eq("entrenador_id", entrenadorId)
      .eq("categoria_id", categoriaId);
    loadData();
  }

  const rolColor: Record<string, string> = {
    DT: "bg-primary/20 text-primary",
    ASISTENTE: "bg-blue-500/20 text-blue-400",
    PF: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Entrenadores</h1>
        <Badge variant="outline" className="text-xs">
          <Users className="mr-1 h-3 w-3" /> {entrenadores.length} registrados
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {entrenadores.map((e) => {
            const assignedIds = new Set(e.categorias.map((c) => c.id));
            const availableCats = allCats.filter((c) => !assignedIds.has(c.id));

            return (
              <Card key={e.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCog className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-sm">{e.nombre}</CardTitle>
                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {e.email}
                          </span>
                          {e.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {e.telefono}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={rolColor[e.rol] ?? "bg-muted text-muted-foreground"}>
                      {e.rol}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {e.categorias.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sin categorías asignadas</span>
                    ) : (
                      e.categorias.map((c) => (
                        <Badge
                          key={c.id}
                          variant="outline"
                          className="gap-1 text-[10px] pr-1"
                        >
                          {c.sede_nombre} — {c.nombre}
                          <button
                            onClick={() => handleRemover(e.id, c.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>

                  {assigning === e.id ? (
                    <div className="flex gap-2">
                      <Select
                        value={selectedCat}
                        onValueChange={(v: string | null) => setSelectedCat(v ?? "")}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="Seleccionar categoría">
                            {selectedCat
                              ? (() => {
                                  const c = allCats.find((x) => x.id === selectedCat);
                                  return c ? `${c.sede_nombre} — ${c.nombre}` : "";
                                })()
                              : "Seleccionar categoría"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableCats.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.sede_nombre} — {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleAsignar(e.id)}
                        disabled={!selectedCat}
                      >
                        Asignar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setAssigning(null);
                          setSelectedCat("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1"
                      onClick={() => setAssigning(e.id)}
                    >
                      <Plus className="h-3 w-3" /> Asignar categoría
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
