"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";

interface Jugador {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
  sede: string;
  categoria: string;
  posicion_principal: string | null;
}

export default function JugadoresPage() {
  const supabase = createClient();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [sedeFilter, setSedeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase
        .from("sedes")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");
      if (s) setSedes(s);

      const { data } = await supabase
        .from("jugadores")
        .select("id, nombre, rut, estado, sedes(nombre), categorias(nombre)")
        .neq("estado", "DESACTIVADO")
        .order("nombre");

      if (data) {
        setJugadores(
          data.map((j: any) => ({
            id: j.id,
            nombre: j.nombre,
            rut: j.rut,
            estado: j.estado,
            sede: j.sedes?.nombre ?? "",
            categoria: j.categorias?.nombre ?? "",
            posicion_principal: j.posicion_principal ?? null,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = jugadores.filter((j) => {
    const matchSearch =
      !search ||
      j.nombre.toLowerCase().includes(search.toLowerCase()) ||
      j.rut.includes(search);
    const matchSede = sedeFilter === "all" || j.sede === sedeFilter;
    return matchSearch && matchSede;
  });

  const estadoColor: Record<string, string> = {
    ACTIVO: "border-emerald-500/30 text-emerald-400",
    FULL: "border-emerald-500/30 text-emerald-400",
    NEW: "border-blue-500/30 text-blue-400",
    LESIONADO: "border-red-500/30 text-red-400",
    BECADO: "border-purple-500/30 text-purple-400",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Jugadores</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={sedeFilter} onValueChange={(v: string | null) => setSedeFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.nombre}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} jugador{filtered.length !== 1 ? "es" : ""}
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((j) => (
            <div
              key={j.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{j.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {j.rut} · {j.sede} · {j.categoria}
                </p>
              </div>
              <Badge
                variant="outline"
                className={estadoColor[j.estado] ?? ""}
              >
                {j.estado}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
