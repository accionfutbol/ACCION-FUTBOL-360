"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Eye,
} from "lucide-react";

interface Inscripcion {
  id: string;
  nombre_jugador: string;
  rut_jugador: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  sede_id: string | null;
  categoria_preferida: string | null;
  nombre_apoderado: string;
  email_apoderado: string;
  telefono_apoderado: string;
  rut_apoderado: string | null;
  comuna: string | null;
  como_llego: string | null;
  antecedentes_deportivos: string | null;
  observaciones: string | null;
  estado: string;
  created_at: string;
}

interface Sede {
  id: string;
  nombre: string;
}

function estadoColor(e: string) {
  switch (e) {
    case "PENDIENTE": return "bg-yellow-500/20 text-yellow-400";
    case "APROBADA": return "bg-emerald-500/20 text-emerald-400";
    case "RECHAZADA": return "bg-red-500/20 text-red-400";
    default: return "";
  }
}

function estadoIcon(e: string) {
  switch (e) {
    case "PENDIENTE": return Clock;
    case "APROBADA": return CheckCircle2;
    case "RECHAZADA": return XCircle;
    default: return Clock;
  }
}

export default function InscripcionesAdminPage() {
  const supabase = createClient();
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("PENDIENTE");
  const [selected, setSelected] = useState<Inscripcion | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("inscripciones").select("*").order("created_at", { ascending: false }).limit(100);
    if (filtroEstado) q = q.eq("estado", filtroEstado);
    const [{ data: ins }, { data: sed }] = await Promise.all([
      q,
      supabase.from("sedes").select("id, nombre").order("nombre"),
    ]);
    setInscripciones((ins ?? []) as Inscripcion[]);
    setSedes((sed ?? []) as Sede[]);
    setLoading(false);
  }, [supabase, filtroEstado]);

  useEffect(() => { loadData(); }, [loadData]);

  const b = busqueda.toLowerCase();
  const filtered = inscripciones.filter(
    (i) => !b || i.nombre_jugador.toLowerCase().includes(b) || i.nombre_apoderado.toLowerCase().includes(b) || (i.email_apoderado ?? "").toLowerCase().includes(b)
  );

  async function updateEstado(id: string, estado: string) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("inscripciones").update({
      estado,
      revisado_por: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSaving(false);
    setSelected(null);
    loadData();
  }

  const totalPendientes = inscripciones.filter((i) => i.estado === "PENDIENTE").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inscripciones Online</h1>
        {filtroEstado === "PENDIENTE" && totalPendientes > 0 && (
          <Badge className="bg-yellow-500/20 text-yellow-400">
            {totalPendientes} pendientes
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filtroEstado} onValueChange={(v: string | null) => setFiltroEstado(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos">{filtroEstado || "Todos"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendientes</SelectItem>
            <SelectItem value="APROBADA">Aprobadas</SelectItem>
            <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar jugador o apoderado..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <UserPlus className="h-8 w-8" />
          <p>No hay inscripciones {filtroEstado ? filtroEstado.toLowerCase() + "s" : ""}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Apoderado</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const Icon = estadoIcon(i.estado);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.nombre_jugador}</TableCell>
                        <TableCell className="text-xs">{i.nombre_apoderado}</TableCell>
                        <TableCell className="text-xs">{i.telefono_apoderado}</TableCell>
                        <TableCell className="text-xs">{i.sede_id ? sedes.find((s) => s.id === i.sede_id)?.nombre ?? "—" : "—"}</TableCell>
                        <TableCell>
                          <Badge className={estadoColor(i.estado)}>
                            <Icon className="mr-1 h-3 w-3" /> {i.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(i.created_at).toLocaleDateString("es-CL")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelected(i)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inscripción — {selected?.nombre_jugador}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="RUT jugador" value={selected.rut_jugador} />
                <InfoRow label="Fecha nac." value={selected.fecha_nacimiento} />
                <InfoRow label="Sexo" value={selected.sexo === "M" ? "Masculino" : selected.sexo === "F" ? "Femenino" : null} />
                <InfoRow label="Sede" value={selected.sede_id ? sedes.find((s) => s.id === selected.sede_id)?.nombre : null} />
                <InfoRow label="Categoría" value={selected.categoria_preferida} />
                <InfoRow label="Comuna" value={selected.comuna} />
              </div>

              <div className="border-t border-border pt-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">APODERADO</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Nombre" value={selected.nombre_apoderado} />
                  <InfoRow label="Email" value={selected.email_apoderado} />
                  <InfoRow label="Teléfono" value={selected.telefono_apoderado} />
                  <InfoRow label="RUT" value={selected.rut_apoderado} />
                </div>
              </div>

              {selected.antecedentes_deportivos && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">ANTECEDENTES</p>
                  <p className="mt-1">{selected.antecedentes_deportivos}</p>
                </div>
              )}

              {selected.como_llego && (
                <InfoRow label="¿Cómo llegó?" value={selected.como_llego} />
              )}

              {selected.observaciones && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">OBSERVACIONES</p>
                  <p className="mt-1">{selected.observaciones}</p>
                </div>
              )}

              <div className="flex gap-3 border-t border-border pt-4">
                {selected.estado === "PENDIENTE" && (
                  <>
                    <Button
                      onClick={() => updateEstado(selected.id, "APROBADA")}
                      disabled={saving}
                      className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateEstado(selected.id, "RECHAZADA")}
                      disabled={saving}
                      className="flex-1 gap-2 text-red-400 hover:text-red-300"
                    >
                      <XCircle className="h-4 w-4" /> Rechazar
                    </Button>
                  </>
                )}
                {selected.estado !== "PENDIENTE" && (
                  <Badge className={`mx-auto ${estadoColor(selected.estado)}`}>
                    {selected.estado}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}
