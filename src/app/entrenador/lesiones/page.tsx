"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, AlertTriangle, HeartPulse, Search, Phone, MapPin } from "lucide-react";

interface LesionadoRow {
  id: string;
  nombre: string;
  rut: string;
  sede_nombre: string;
  categoria_nombre: string;
  sede_id: string;
  telefono_jugador: string | null;
  telefono_apoderado: string | null;
  nombre_apoderado: string | null;
  posicion_principal: string | null;
  anio_nacimiento: number | null;
}

export default function LesionesPage() {
  const supabase = createClient();
  const [lesionados, setLesionados] = useState<LesionadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string; sede_id: string }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [{ data: sed }, { data: cats }, { data: jugs }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
        supabase
          .from("jugadores")
          .select("id, nombre, rut, sede_id, categoria_id, telefono_jugador, telefono_apoderado, nombre_apoderado, posicion_principal, anio_nacimiento, sedes(nombre), categorias(nombre)")
          .eq("estado", "LESIONADO")
          .order("nombre"),
      ]);

      setSedes((sed ?? []) as { id: string; nombre: string }[]);
      setCategorias((cats ?? []) as { id: string; nombre: string; sede_id: string }[]);

      const rows: LesionadoRow[] = (jugs ?? []).map((j: any) => ({
        id: j.id,
        nombre: j.nombre,
        rut: j.rut ?? "",
        sede_nombre: j.sedes?.nombre ?? "",
        categoria_nombre: j.categorias?.nombre ?? "",
        sede_id: j.sede_id,
        telefono_jugador: j.telefono_jugador,
        telefono_apoderado: j.telefono_apoderado,
        nombre_apoderado: j.nombre_apoderado,
        posicion_principal: j.posicion_principal,
        anio_nacimiento: j.anio_nacimiento,
      }));

      setLesionados(rows);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const catsForFilter = categorias.filter(
    (c) => !sedeFilter || sedes.find((s) => s.nombre === sedeFilter)?.id === c.sede_id
  );

  const filtered = lesionados.filter((l) => {
    const matchSede = !sedeFilter || l.sede_nombre === sedeFilter;
    const matchCat = !catFilter || l.categoria_nombre === catFilter;
    const matchSearch =
      !search ||
      l.nombre.toLowerCase().includes(search.toLowerCase()) ||
      l.rut.toLowerCase().includes(search.toLowerCase());
    return matchSede && matchCat && matchSearch;
  });

  const porSede = sedes.map((s) => ({
    nombre: s.nombre,
    cantidad: lesionados.filter((l) => l.sede_nombre === s.nombre).length,
  })).filter((s) => s.cantidad > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Jugadores Lesionados</h1>
        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
          <HeartPulse className="mr-1 h-3 w-3" /> {lesionados.length} lesionados
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={sedeFilter} onValueChange={(v) => { setSedeFilter(v === "all" ? "" : v); setCatFilter(""); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las sedes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sedes</SelectItem>
            {sedes.map((s) => <SelectItem key={s.id} value={s.nombre}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {catsForFilter.map((c) => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!loading && porSede.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <HeartPulse className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400">{filtered.length}</p>
                <p className="text-xs text-muted-foreground">Total lesionados</p>
              </div>
            </CardContent>
          </Card>
          {porSede.map((s) => (
            <Card key={s.nombre}>
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{s.cantidad}</p>
                  <p className="text-xs text-muted-foreground">{s.nombre}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <HeartPulse className="h-8 w-8 text-emerald-400" />
          <p className="text-emerald-400 font-medium">Sin lesionados</p>
          <p className="text-xs">No hay jugadores con estado LESIONADO</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              {filtered.length} jugador{filtered.length !== 1 ? "es" : ""} lesionado{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Sede / Categoría</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Año nac.</TableHead>
                  <TableHead>Contacto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{l.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">{l.rut}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.sede_nombre}
                      <br />
                      <span className="text-muted-foreground">{l.categoria_nombre}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.posicion_principal ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.anio_nacimiento ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {l.nombre_apoderado && (
                          <p className="text-xs text-muted-foreground">{l.nombre_apoderado}</p>
                        )}
                        {(l.telefono_apoderado || l.telefono_jugador) ? (
                          <a
                            href={`https://wa.me/56${(l.telefono_apoderado || l.telefono_jugador || "").replace(/\D/g, "").replace(/^56/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {l.telefono_apoderado || l.telefono_jugador}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin contacto</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
