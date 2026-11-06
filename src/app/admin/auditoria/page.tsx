"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LogEntry {
  id: string;
  user_email: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: any;
  created_at: string;
}

export default function AuditoriaPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEntidad, setFiltroEntidad] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filtroEntidad) q = q.eq("entidad", filtroEntidad);

      const { data } = (await q) as { data: any[] | null; error: any };
      setLogs((data ?? []) as LogEntry[]);
      setLoading(false);
    }
    load();
  }, [supabase, filtroEntidad]);

  const filtered = busqueda
    ? logs.filter(
        (l) =>
          l.user_email?.toLowerCase().includes(busqueda.toLowerCase()) ||
          l.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
          l.entidad.toLowerCase().includes(busqueda.toLowerCase())
      )
    : logs;

  const accionColor: Record<string, string> = {
    CREATE: "bg-emerald-500/20 text-emerald-400",
    UPDATE: "bg-blue-500/20 text-blue-400",
    DELETE: "bg-red-500/20 text-red-400",
    LOGIN: "bg-primary/20 text-primary",
  };

  const entidades = [...new Set(logs.map((l) => l.entidad))].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Auditoría</h1>
        <Badge variant="outline" className="text-xs">
          <History className="mr-1 h-3 w-3" /> {filtered.length} registros
        </Badge>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por email, acción..."
            className="pl-8"
          />
        </div>
        <Select
          value={filtroEntidad}
          onValueChange={(v: string | null) => setFiltroEntidad(v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Toda entidad">
              {filtroEntidad || "Toda entidad"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {entidades.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <History className="mx-auto h-8 w-8 mb-2" />
          <p>Sin registros de auditoría</p>
          <p className="text-xs">Los cambios se registrarán aquí automáticamente</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs">{l.user_email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          accionColor[l.accion.toUpperCase()] ?? "bg-muted text-muted-foreground"
                        }
                      >
                        {l.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.entidad}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                      {l.detalle ? JSON.stringify(l.detalle).slice(0, 80) : "—"}
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
