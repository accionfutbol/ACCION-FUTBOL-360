"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface HijoResumen {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
  sede: string;
  categoria: string;
  asistencia: { ok: number; f: number; j: number; l: number };
}

export default function ApoderadoDashboard() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<HijoResumen[]>([]);
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
        .select("jugador_id")
        .eq("apoderado_id", apoderado.id);

      if (!relaciones || relaciones.length === 0) {
        setLoading(false);
        return;
      }

      const jugadorIds = relaciones.map((r) => r.jugador_id);

      const { data: jugadores } = await supabase
        .from("jugadores")
        .select("id, nombre, rut, estado, sedes(nombre), categorias(nombre)")
        .in("id", jugadorIds);

      if (!jugadores) {
        setLoading(false);
        return;
      }

      const { data: marcas } = await supabase
        .from("asistencia")
        .select("jugador_id, marca")
        .in("jugador_id", jugadorIds);

      const asistenciaMap: Record<
        string,
        { ok: number; f: number; j: number; l: number }
      > = {};
      marcas?.forEach((m) => {
        if (!asistenciaMap[m.jugador_id]) {
          asistenciaMap[m.jugador_id] = { ok: 0, f: 0, j: 0, l: 0 };
        }
        const key = m.marca.toLowerCase() as "ok" | "f" | "j" | "l";
        if (key in asistenciaMap[m.jugador_id]) {
          asistenciaMap[m.jugador_id][key]++;
        }
      });

      setHijos(
        jugadores.map((j: any) => ({
          id: j.id,
          nombre: j.nombre,
          rut: j.rut,
          estado: j.estado,
          sede: j.sedes?.nombre ?? "",
          categoria: j.categorias?.nombre ?? "",
          asistencia: asistenciaMap[j.id] ?? { ok: 0, f: 0, j: 0, l: 0 },
        }))
      );
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

  if (hijos.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay jugadores asociados a tu cuenta.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mis Jugadores</h1>

      {hijos.map((hijo) => {
        const total =
          hijo.asistencia.ok +
          hijo.asistencia.f +
          hijo.asistencia.j +
          hijo.asistencia.l;
        const pct =
          total > 0
            ? Math.round((hijo.asistencia.ok / total) * 100)
            : 0;

        return (
          <Card key={hijo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{hijo.nombre}</CardTitle>
                <Badge variant="outline">{hijo.estado}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {hijo.rut} · {hijo.sede} · {hijo.categoria}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex h-2 overflow-hidden rounded-full bg-muted">
                    {total > 0 && (
                      <>
                        <div
                          className="bg-emerald-500"
                          style={{
                            width: `${(hijo.asistencia.ok / total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-yellow-500"
                          style={{
                            width: `${(hijo.asistencia.j / total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-blue-500"
                          style={{
                            width: `${(hijo.asistencia.l / total) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>OK: {hijo.asistencia.ok}</span>
                    <span>F: {hijo.asistencia.f}</span>
                    <span>J: {hijo.asistencia.j}</span>
                    <span>L: {hijo.asistencia.l}</span>
                  </div>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    pct >= 80
                      ? "text-emerald-400"
                      : pct >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {pct}%
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
