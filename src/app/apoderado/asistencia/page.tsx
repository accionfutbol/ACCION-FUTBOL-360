"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface AsistenciaDetalle {
  fecha: string;
  marca: string;
}

interface HijoAsistencia {
  nombre: string;
  rut: string;
  detalle: AsistenciaDetalle[];
}

export default function ApoderadoAsistenciaPage() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoAsistencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apoderado } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!apoderado) {
        setLoading(false);
        return;
      }

      const { data: relaciones } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id, jugadores(nombre, rut)")
        .eq("apoderado_id", apoderado.id);

      if (!relaciones) {
        setLoading(false);
        return;
      }

      const result: HijoAsistencia[] = [];

      for (const rel of relaciones) {
        const jugador = (rel as any).jugadores;
        const { data: marcas } = await supabase
          .from("asistencia")
          .select("marca, sesiones_entrenamiento(fecha)")
          .eq("jugador_id", rel.jugador_id)
          .order("created_at", { ascending: false })
          .limit(30);

        result.push({
          nombre: jugador?.nombre ?? "",
          rut: jugador?.rut ?? "",
          detalle:
            marcas?.map((m: any) => ({
              fecha: m.sesiones_entrenamiento?.fecha ?? "",
              marca: m.marca,
            })) ?? [],
        });
      }

      setHijos(result);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const marcaColor: Record<string, string> = {
    OK: "bg-emerald-500 text-white",
    F: "bg-red-500 text-white",
    J: "bg-yellow-500 text-black",
    L: "bg-blue-500 text-white",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Detalle de Asistencia</h1>

      {hijos.map((hijo) => (
        <Card key={hijo.rut}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{hijo.nombre}</CardTitle>
            <p className="text-xs text-muted-foreground">{hijo.rut}</p>
          </CardHeader>
          <CardContent>
            {hijo.detalle.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin registros de asistencia.
              </p>
            ) : (
              <div className="space-y-1">
                {hijo.detalle.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm odd:bg-muted/30"
                  >
                    <span>{d.fecha}</span>
                    <Badge className={marcaColor[d.marca] ?? ""}>
                      {d.marca}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
