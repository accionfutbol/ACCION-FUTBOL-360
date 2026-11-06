"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface MorosoRow {
  jugador_id: string;
  nombre: string;
  rut: string;
  sede_nombre: string;
  categoria_nombre: string;
  meses_atrasados: number;
  total_deuda: number;
  telefono_apoderado: string | null;
  nombre_apoderado: string | null;
  meses_detalle: string[];
}

export default function MorosidadPage() {
  const supabase = createClient();
  const [morosos, setMorosos] = useState<MorosoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState("");
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    async function load() {
      const [sedRes, msgsRes, jugsRes] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("mensualidades")
          .select("jugador_id, mes, monto, estado")
          .in("estado", ["PENDIENTE", "ATRASADO"]),
        supabase.from("jugadores")
          .select("id, nombre, rut, sede_id, categoria_id, telefono_apoderado, nombre_apoderado")
          .in("estado", ["ACTIVO", "FULL", "NEW"]),
      ]) as { data: any[] | null; error: any }[];

      const sed = sedRes.data ?? [];
      const msgs = msgsRes.data ?? [];
      const jugs = jugsRes.data ?? [];

      setSedes(sed as { id: string; nombre: string }[]);

      const { data: cats } = await supabase
        .from("categorias")
        .select("id, nombre");

      const sedeMap = new Map(sed.map((s: any) => [s.id, s.nombre]));
      const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.nombre]));
      const jugMap = new Map(jugs.map((j: any) => [j.id, j]));

      const deudaPorJugador = new Map<string, { meses: string[]; total: number }>();

      msgs.forEach((m: any) => {
        if (!jugMap.has(m.jugador_id)) return;
        if (!deudaPorJugador.has(m.jugador_id)) {
          deudaPorJugador.set(m.jugador_id, { meses: [], total: 0 });
        }
        const entry = deudaPorJugador.get(m.jugador_id)!;
        entry.meses.push(m.mes);
        entry.total += (m.monto ?? 0);
      });

      const result: MorosoRow[] = [];
      deudaPorJugador.forEach((deuda, jugId) => {
        const jug = jugMap.get(jugId);
        if (!jug) return;
        if (sedeFilter && jug.sede_id !== sedeFilter) return;

        result.push({
          jugador_id: jugId,
          nombre: jug.nombre,
          rut: jug.rut ?? "",
          sede_nombre: sedeMap.get(jug.sede_id) ?? "",
          categoria_nombre: catMap.get(jug.categoria_id) ?? "",
          meses_atrasados: deuda.meses.length,
          total_deuda: deuda.total,
          telefono_apoderado: jug.telefono_apoderado,
          nombre_apoderado: jug.nombre_apoderado,
          meses_detalle: deuda.meses.sort(),
        });
      });

      result.sort((a, b) => b.meses_atrasados - a.meses_atrasados);
      setMorosos(result);
      setLoading(false);
    }
    load();
  }, [supabase, sedeFilter]);

  const totalMorosos = morosos.length;
  const totalDeuda = morosos.reduce((s, m) => s + m.total_deuda, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Morosidad</h1>
        <Badge variant="outline" className="text-xs">
          <AlertCircle className="mr-1 h-3 w-3" /> Pagos pendientes
        </Badge>
      </div>

      <div className="flex gap-3">
        <Select value={sedeFilter} onValueChange={(v: string | null) => setSedeFilter(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las sedes">{sedeFilter ? sedes.find((s) => s.id === sedeFilter)?.nombre : "Todas las sedes"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las sedes</SelectItem>
            {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!loading && morosos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
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
              <DollarSign className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  ${totalDeuda.toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-muted-foreground">Deuda total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-orange-400">
                  {morosos.filter((m) => m.meses_atrasados >= 3).length}
                </p>
                <p className="text-xs text-muted-foreground">Con 3+ meses</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : morosos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <DollarSign className="h-8 w-8 text-emerald-400" />
          <p className="text-emerald-400 font-medium">Sin morosos</p>
          <p className="text-xs">Todos los jugadores activos están al día</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalle de morosidad</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead className="text-center">Meses</TableHead>
                    <TableHead className="text-right">Deuda</TableHead>
                    <TableHead>Meses detalle</TableHead>
                    <TableHead>Contacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {morosos.map((m) => (
                    <TableRow key={m.jugador_id}>
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
                          m.meses_atrasados >= 3
                            ? "bg-red-500/20 text-red-400"
                            : m.meses_atrasados >= 2
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }>
                          {m.meses_atrasados}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${m.total_deuda.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[120px] truncate">
                        {m.meses_detalle.join(", ")}
                      </TableCell>
                      <TableCell>
                        {m.telefono_apoderado ? (
                          <a
                            href={`https://wa.me/56${m.telefono_apoderado.replace(/\D/g, "").replace(/^56/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
