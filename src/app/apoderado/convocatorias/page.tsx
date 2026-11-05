"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  CalendarDays,
  Clock,
  MapPin,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
} from "lucide-react";

interface Hijo {
  id: string;
  nombre: string;
  categoria_id: string;
}

interface ConvocatoriaView {
  id: string;
  conv_id: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  rival: string | null;
  mensaje: string | null;
  estado_conv: string;
  jugador_id: string;
  jugador_nombre: string;
  respuesta: string | null;
  observacion: string | null;
  cj_id: string;
}

export default function ConvocatoriasApoderadoPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ConvocatoriaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [obsInput, setObsInput] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get apoderado
    const { data: apo } = await supabase.from("apoderados").select("id").eq("user_id", user.id).single() as { data: any; error: any };
    if (!apo) { setLoading(false); return; }

    // Get hijos
    const { data: rels } = await supabase.from("jugador_apoderado").select("jugador_id").eq("apoderado_id", apo.id);
    const hijosIds = (rels ?? []).map((r: any) => r.jugador_id);
    if (hijosIds.length === 0) { setLoading(false); return; }

    // Get convocatoria_jugador for those hijos
    const { data: cjs } = await supabase
      .from("convocatoria_jugador")
      .select("*")
      .in("jugador_id", hijosIds)
      .eq("citado", true) as { data: any[]; error: any };

    if (!cjs || cjs.length === 0) { setItems([]); setLoading(false); return; }

    // Get convocatorias
    const convIds = [...new Set(cjs.map((c: any) => c.convocatoria_id))];
    const { data: convs } = await supabase
      .from("convocatorias")
      .select("*")
      .in("id", convIds)
      .order("fecha", { ascending: false }) as { data: any[]; error: any };

    // Get jugador names
    const { data: jugs } = await supabase.from("jugadores").select("id, nombre").in("id", hijosIds);
    const jugMap = new Map<string, string>();
    (jugs ?? []).forEach((j: any) => jugMap.set(j.id, j.nombre));

    const convMap = new Map<string, any>();
    (convs ?? []).forEach((c: any) => convMap.set(c.id, c));

    const result: ConvocatoriaView[] = cjs
      .map((cj: any) => {
        const conv = convMap.get(cj.convocatoria_id);
        if (!conv) return null;
        return {
          id: `${cj.id}`,
          conv_id: conv.id,
          fecha: conv.fecha,
          hora: conv.hora,
          lugar: conv.lugar,
          rival: conv.rival,
          mensaje: conv.mensaje,
          estado_conv: conv.estado,
          jugador_id: cj.jugador_id,
          jugador_nombre: jugMap.get(cj.jugador_id) ?? "—",
          respuesta: cj.respuesta,
          observacion: cj.observacion,
          cj_id: cj.id,
        };
      })
      .filter(Boolean) as ConvocatoriaView[];

    result.sort((a, b) => b.fecha.localeCompare(a.fecha));
    setItems(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function responder(cjId: string, respuesta: string) {
    setSaving(cjId);
    await supabase.from("convocatoria_jugador").update({
      respuesta,
      respondido_por: "APODERADO",
      respondido_at: new Date().toISOString(),
      observacion: obsInput[cjId]?.trim() || null,
    }).eq("id", cjId);
    setSaving(null);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Convocatorias</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Send className="h-8 w-8" />
          <p>No hay convocatorias para tus hijos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isOpen = item.estado_conv === "ABIERTA";
            const isPending = !item.respuesta || item.respuesta === "PENDIENTE";
            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-primary" />
                      {item.rival ? `vs ${item.rival}` : "Convocatoria"}
                    </CardTitle>
                    <Badge
                      className={
                        item.estado_conv === "ABIERTA"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-500/20 text-zinc-400"
                      }
                    >
                      {item.estado_conv}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                    {item.hora && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {item.hora}
                      </span>
                    )}
                    {item.lugar && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {item.lugar}
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted/30 p-2.5 text-sm">
                    <span className="text-xs text-muted-foreground">Jugador:</span>{" "}
                    <span className="font-medium">{item.jugador_nombre}</span>
                  </div>

                  {item.mensaje && (
                    <p className="rounded-lg bg-muted/50 p-3 text-sm">{item.mensaje}</p>
                  )}

                  {/* Current status */}
                  {!isPending && (
                    <div className="flex items-center gap-2">
                      <Badge className={respuestaColor(item.respuesta)}>
                        {item.respuesta === "CONFIRMADO" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {item.respuesta === "NO_PUEDE" && <XCircle className="mr-1 h-3 w-3" />}
                        {item.respuesta}
                      </Badge>
                      {item.observacion && (
                        <span className="text-xs text-muted-foreground">{item.observacion}</span>
                      )}
                    </div>
                  )}

                  {/* Response actions */}
                  {isOpen && isPending && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <Textarea
                        placeholder="Observación (opcional)..."
                        value={obsInput[item.cj_id] ?? ""}
                        onChange={(e) => setObsInput((prev) => ({ ...prev, [item.cj_id]: e.target.value }))}
                        rows={1}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => responder(item.cj_id, "CONFIRMADO")}
                          disabled={saving === item.cj_id}
                          className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        >
                          {saving === item.cj_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => responder(item.cj_id, "NO_PUEDE")}
                          disabled={saving === item.cj_id}
                          className="flex-1 gap-1.5 text-red-400 hover:text-red-300"
                        >
                          <XCircle className="h-3.5 w-3.5" /> No puede
                        </Button>
                      </div>
                    </div>
                  )}

                  {isOpen && !isPending && (
                    <p className="text-center text-xs text-muted-foreground">
                      Ya respondiste esta convocatoria
                    </p>
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

function respuestaColor(r: string | null) {
  switch (r) {
    case "CONFIRMADO": return "bg-emerald-500/20 text-emerald-400";
    case "NO_PUEDE": return "bg-red-500/20 text-red-400";
    default: return "bg-yellow-500/20 text-yellow-400";
  }
}
