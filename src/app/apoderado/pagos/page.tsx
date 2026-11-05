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
import { Loader2, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

interface Mensualidad {
  id: string;
  mes: string;
  monto: number | null;
  estado: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  observacion: string | null;
}

interface HijoPagos {
  nombre: string;
  jugadorId: string;
  mensualidades: Mensualidad[];
  alDia: number;
  pendientes: number;
  atrasados: number;
}

function estadoColor(estado: string) {
  switch (estado) {
    case "PAGADO": return "bg-emerald-500/20 text-emerald-400";
    case "PENDIENTE": return "bg-yellow-500/20 text-yellow-400";
    case "ATRASADO": return "bg-red-500/20 text-red-400";
    case "BECADO": return "bg-blue-500/20 text-blue-400";
    case "CONGELADO": return "bg-muted text-muted-foreground";
    default: return "";
  }
}

function formatMes(mes: string) {
  const meses: Record<string, string> = {
    "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
    "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
    "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
  };
  const [y, m] = mes.split("-");
  return `${meses[m] ?? m} ${y}`;
}

export default function ApoderadoPagosPage() {
  const supabase = createClient();
  const [hijosData, setHijosData] = useState<HijoPagos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apoderado } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!apoderado) { setLoading(false); return; }

      const { data: relaciones } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id, jugadores(nombre)")
        .eq("apoderado_id", apoderado.id) as { data: any[] | null; error: any };

      if (!relaciones?.length) { setLoading(false); return; }

      const result: HijoPagos[] = [];

      for (const rel of relaciones) {
        const { data: msgs } = await supabase
          .from("mensualidades")
          .select("id, mes, monto, estado, fecha_pago, metodo_pago, observacion")
          .eq("jugador_id", rel.jugador_id)
          .order("mes", { ascending: false });

        const mensualidades = (msgs ?? []) as Mensualidad[];
        const alDia = mensualidades.filter(m => m.estado === "PAGADO" || m.estado === "BECADO").length;
        const pendientes = mensualidades.filter(m => m.estado === "PENDIENTE").length;
        const atrasados = mensualidades.filter(m => m.estado === "ATRASADO").length;

        result.push({
          nombre: rel.jugadores?.nombre ?? "",
          jugadorId: rel.jugador_id,
          mensualidades,
          alDia,
          pendientes,
          atrasados,
        });
      }

      setHijosData(result);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hijosData.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay jugadores asociados a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Estado de Pagos</h1>

      {hijosData.map((hijo) => (
        <div key={hijo.jugadorId} className="space-y-4">
          <h2 className="text-lg font-semibold">{hijo.nombre}</h2>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold">{hijo.alDia}</p>
                  <p className="text-xs text-muted-foreground">Al día</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{hijo.pendientes}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-2xl font-bold">{hijo.atrasados}</p>
                  <p className="text-xs text-muted-foreground">Atrasados</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de mensualidades */}
          {hijo.mensualidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros de pago.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mes</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Fecha pago</TableHead>
                        <TableHead>Método</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hijo.mensualidades.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{formatMes(m.mes)}</TableCell>
                          <TableCell>
                            <Badge className={estadoColor(m.estado)}>{m.estado}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {m.monto !== null ? `$${m.monto.toLocaleString("es-CL")}` : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {m.fecha_pago ?? "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {m.metodo_pago ?? "-"}
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
      ))}
    </div>
  );
}
