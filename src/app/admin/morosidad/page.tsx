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
import {
  Loader2,
  AlertCircle,
  DollarSign,
  Phone,
  TrendingDown,
  Search,
  Users,
} from "lucide-react";

interface MorosoRow {
  id: string;
  nombre: string;
  rut: string;
  sede_nombre: string;
  categoria_nombre: string;
  numero_morosidad: number;
  pago_mensual: string | null;
  telefono_apoderado: string | null;
  nombre_apoderado: string | null;
  telefono_jugador: string | null;
  estado: string;
  estado_mes: string | null;
}

export default function MorosidadPage() {
  const supabase = createClient();
  const [morosos, setMorosos] = useState<MorosoRow[]>([]);
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
          .select("id, nombre, rut, sede_id, categoria_id, numero_morosidad, pago_mensual, telefono_apoderado, nombre_apoderado, telefono_jugador, estado, estado_mes, sedes(nombre), categorias(nombre)")
          .gt("numero_morosidad", 0)
          .in("estado", ["ACTIVO", "FULL", "NEW", "BECADO"])
          .order("numero_morosidad", { ascending: false }),
      ]);

      setSedes((sed ?? []) as { id: string; nombre: string }[]);
      setCategorias((cats ?? []) as { id: string; nombre: string; sede_id: string }[]);

      const rows: MorosoRow[] = (jugs ?? []).map((j: any) => ({
        id: j.id,
        nombre: j.nombre,
        rut: j.rut ?? "",
        sede_nombre: j.sedes?.nombre ?? "",
        categoria_nombre: j.categorias?.nombre ?? "",
        numero_morosidad: j.numero_morosidad ?? 0,
        pago_mensual: j.pago_mensual,
        telefono_apoderado: j.telefono_apoderado,
        nombre_apoderado: j.nombre_apoderado,
        telefono_jugador: j.telefono_jugador,
        estado: j.estado,
        estado_mes: j.estado_mes,
      }));

      setMorosos(rows);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const catsForFilter = categorias.filter(
    (c) => !sedeFilter || sedes.find((s) => s.nombre === sedeFilter)?.id === c.sede_id
  );

  const filtered = morosos.filter((m) => {
    const matchSede = !sedeFilter || m.sede_nombre === sedeFilter;
    const matchCat = !catFilter || m.categoria_nombre === catFilter;
    const matchSearch =
      !search ||
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.rut.toLowerCase().includes(search.toLowerCase());
    return matchSede && matchCat && matchSearch;
  });

  const totalMorosos = filtered.length;
  const con3Plus = filtered.filter((m) => m.numero_morosidad >= 3).length;
  const con1 = filtered.filter((m) => m.numero_morosidad === 1).length;
  const con2 = filtered.filter((m) => m.numero_morosidad === 2).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Morosidad</h1>
        <Badge variant="outline" className="text-xs">
          <AlertCircle className="mr-1 h-3 w-3" /> Datos sincronizados desde Data Fútbol
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

      {!loading && totalMorosos > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingDown className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400">{totalMorosos}</p>
                <p className="text-xs text-muted-foreground">Jugadores morosos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{con3Plus}</p>
                <p className="text-xs text-muted-foreground">Con 3+ meses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-orange-400">{con2}</p>
                <p className="text-xs text-muted-foreground">Con 2 meses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">{con1}</p>
                <p className="text-xs text-muted-foreground">Con 1 mes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : totalMorosos === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <DollarSign className="h-8 w-8 text-emerald-400" />
          <p className="text-emerald-400 font-medium">Sin morosos</p>
          <p className="text-xs">Todos los jugadores activos están al día</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalle de morosidad ({totalMorosos} jugadores)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Sede / Categoría</TableHead>
                    <TableHead className="text-center">Meses moroso</TableHead>
                    <TableHead>Estado pago</TableHead>
                    <TableHead>Contacto apoderado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{m.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">{m.rut}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.sede_nombre}
                        <br />
                        <span className="text-muted-foreground">{m.categoria_nombre}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={
                          m.numero_morosidad >= 3
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : m.numero_morosidad >= 2
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }>
                          {m.numero_morosidad} {m.numero_morosidad === 1 ? "mes" : "meses"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{m.pago_mensual ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {m.nombre_apoderado && (
                            <p className="text-xs text-muted-foreground">{m.nombre_apoderado}</p>
                          )}
                          {m.telefono_apoderado ? (
                            <a
                              href={`https://wa.me/56${m.telefono_apoderado.replace(/\D/g, "").replace(/^56/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                            >
                              <Phone className="h-3 w-3" /> {m.telefono_apoderado}
                            </a>
                          ) : m.telefono_jugador ? (
                            <a
                              href={`https://wa.me/56${m.telefono_jugador.replace(/\D/g, "").replace(/^56/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                            >
                              <Phone className="h-3 w-3" /> {m.telefono_jugador}
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
