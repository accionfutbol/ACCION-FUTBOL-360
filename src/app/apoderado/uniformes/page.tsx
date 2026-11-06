"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shirt, CheckCircle2, Clock } from "lucide-react";

interface UniformeRow {
  id: string;
  tipo: string;
  talla: string | null;
  entregado: boolean;
  fecha_entrega: string | null;
}

interface HijoUniforme {
  jugador_id: string;
  nombre: string;
  uniformes: UniformeRow[];
}

export default function UniformesApoderadoPage() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoUniforme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apo } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!apo) { setLoading(false); return; }

      const { data: rels } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id")
        .eq("apoderado_id", apo.id);

      const jugIds = (rels ?? []).map((r) => r.jugador_id);
      if (!jugIds.length) { setLoading(false); return; }

      const [{ data: jugs }, uniRes] = await Promise.all([
        supabase.from("jugadores").select("id, nombre").in("id", jugIds),
        supabase.from("uniformes").select("*").in("jugador_id", jugIds),
      ]) as any[];

      const unis = (uniRes?.data ?? []) as UniformeRow[];
      const jugMap = new Map<string, string>((jugs ?? []).map((j: any) => [j.id, j.nombre]));

      const result: HijoUniforme[] = jugIds.map((jid) => ({
        jugador_id: jid,
        nombre: jugMap.get(jid) ?? "",
        uniformes: unis.filter((u: any) => u.jugador_id === jid),
      }));

      setHijos(result);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const tipoLabel: Record<string, string> = {
    NEGRO: "Camiseta Negra",
    ROSADO: "Camiseta Rosada",
    POLERON: "Polerón",
    SHORT: "Short",
    MEDIAS: "Medias",
    OTRO: "Otro",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Uniformes</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : hijos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Shirt className="mx-auto h-8 w-8 mb-2" />
          <p>Sin datos de uniformes</p>
        </div>
      ) : (
        hijos.map((h) => (
          <Card key={h.jugador_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{h.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              {h.uniformes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin uniformes registrados</p>
              ) : (
                <div className="space-y-2">
                  {h.uniformes.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Shirt className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {tipoLabel[u.tipo] ?? u.tipo}
                          </p>
                          {u.talla && (
                            <p className="text-[10px] text-muted-foreground">
                              Talla: {u.talla}
                            </p>
                          )}
                        </div>
                      </div>
                      {u.entregado ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Entregado
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 gap-1">
                          <Clock className="h-3 w-3" /> Pendiente
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
