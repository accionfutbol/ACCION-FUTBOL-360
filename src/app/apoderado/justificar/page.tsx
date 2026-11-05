"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, CheckCircle2, Send } from "lucide-react";

interface HijoBasic {
  id: string;
  nombre: string;
}

interface Justificacion {
  id: string;
  fecha: string;
  motivo: string;
  informado_entrenador: boolean;
  created_at: string;
}

const MOTIVOS_SUGERIDOS = [
  "Enfermedad / malestar",
  "Lesión",
  "Compromiso escolar",
  "Viaje familiar",
  "Problema de transporte",
  "Otro",
];

export default function JustificarInasistencia() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoBasic[]>([]);
  const [jugadorId, setJugadorId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [historial, setHistorial] = useState<Justificacion[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: apoderado } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!apoderado) { setLoading(false); return; }

      const { data: rels } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id")
        .eq("apoderado_id", apoderado.id);

      if (!rels?.length) { setLoading(false); return; }

      const ids = rels.map((r) => r.jugador_id);
      const { data: jugadores } = await supabase
        .from("jugadores")
        .select("id, nombre")
        .in("id", ids)
        .neq("estado", "DESACTIVADO")
        .order("nombre");

      const list = (jugadores ?? []) as HijoBasic[];
      setHijos(list);
      if (list.length === 1) setJugadorId(list[0].id);
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    if (!jugadorId) return;
    async function loadHistory() {
      const { data } = await supabase
        .from("justificaciones")
        .select("id, fecha, motivo, informado_entrenador, created_at")
        .eq("jugador_id", jugadorId)
        .order("fecha", { ascending: false })
        .limit(20);
      setHistorial((data ?? []) as Justificacion[]);
    }
    loadHistory();
  }, [jugadorId, supabase, success]);

  async function handleSubmit() {
    if (!jugadorId || !fecha || !motivo) return;
    setSaving(true);
    setSuccess(false);

    const textoMotivo = motivo === "Otro" ? motivoDetalle : motivo + (motivoDetalle ? ` — ${motivoDetalle}` : "");

    await supabase.from("justificaciones").insert({
      jugador_id: jugadorId,
      fecha,
      motivo: textoMotivo,
      informado_entrenador: false,
      reportado_por: "APODERADO",
    });

    setSaving(false);
    setSuccess(true);
    setMotivo("");
    setMotivoDetalle("");

    setTimeout(() => setSuccess(false), 4000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hijos.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No hay jugadores asociados.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Justificar Inasistencia</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nueva justificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hijos.length > 1 && (
            <div className="space-y-2">
              <Label>Jugador</Label>
              <Select value={jugadorId} onValueChange={(v: string | null) => setJugadorId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar jugador">
                    {jugadorId && hijos.find((h) => h.id === jugadorId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {hijos.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fecha de inasistencia</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={(v: string | null) => setMotivo(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo">{motivo || "Seleccionar motivo"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_SUGERIDOS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{motivo === "Otro" ? "Describe el motivo" : "Detalle adicional (opcional)"}</Label>
            <Textarea
              value={motivoDetalle}
              onChange={(e) => setMotivoDetalle(e.target.value)}
              placeholder={motivo === "Otro" ? "Explique el motivo..." : "Información adicional..."}
              rows={3}
            />
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Justificación enviada correctamente.
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={saving || !jugadorId || !fecha || !motivo || (motivo === "Otro" && !motivoDetalle.trim())}
            className="w-full gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar justificación
          </Button>
        </CardContent>
      </Card>

      {/* Historial */}
      {jugadorId && historial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historial de justificaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Informado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-xs whitespace-nowrap">{j.fecha}</TableCell>
                      <TableCell className="text-sm">{j.motivo}</TableCell>
                      <TableCell>
                        <Badge className={j.informado_entrenador ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}>
                          {j.informado_entrenador ? "Sí" : "Pendiente"}
                        </Badge>
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
