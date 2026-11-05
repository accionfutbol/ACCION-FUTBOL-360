"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Download,
  IdCard,
  Trophy,
  MapPin,
  Calendar,
  User,
} from "lucide-react";

interface Hijo {
  id: string;
  nombre: string;
  rut: string;
  fecha_nacimiento: string | null;
  estado: string;
  posicion_principal: string | null;
  numero_camiseta: string | null;
  foto_url: string | null;
  sede_nombre: string;
  categoria_nombre: string;
  fecha_ingreso: string | null;
}

export default function CredencialPage() {
  const supabase = createClient();
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: apo } = await supabase
        .from("apoderados")
        .select("id")
        .eq("user_id", user.id)
        .single() as { data: any; error: any };
      if (!apo) { setLoading(false); return; }

      const { data: rels } = await supabase
        .from("jugador_apoderado")
        .select("jugador_id")
        .eq("apoderado_id", apo.id);
      const ids = (rels ?? []).map((r: any) => r.jugador_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data: jugs } = await supabase
        .from("jugadores")
        .select("id, nombre, rut, fecha_nacimiento, estado, posicion_principal, numero_camiseta, foto_url, sede_id, categoria_id, fecha_ingreso")
        .in("id", ids) as { data: any[]; error: any };

      // Get sedes and categorias names
      const sedeIds = [...new Set((jugs ?? []).map((j: any) => j.sede_id))];
      const catIds = [...new Set((jugs ?? []).map((j: any) => j.categoria_id))];

      const [{ data: sedes }, { data: cats }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").in("id", sedeIds),
        supabase.from("categorias").select("id, nombre").in("id", catIds),
      ]);

      const sedeMap = new Map((sedes ?? []).map((s: any) => [s.id, s.nombre]));
      const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.nombre]));

      const result: Hijo[] = (jugs ?? []).map((j: any) => ({
        id: j.id,
        nombre: j.nombre,
        rut: j.rut,
        fecha_nacimiento: j.fecha_nacimiento,
        estado: j.estado,
        posicion_principal: j.posicion_principal,
        numero_camiseta: j.numero_camiseta,
        foto_url: j.foto_url,
        sede_nombre: sedeMap.get(j.sede_id) ?? "—",
        categoria_nombre: catMap.get(j.categoria_id) ?? "—",
        fecha_ingreso: j.fecha_ingreso,
      }));

      setHijos(result);
      if (result.length > 0) setSelectedId(result[0].id);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const hijo = hijos.find((h) => h.id === selectedId);

  function calcularEdad(fechaNac: string | null): string {
    if (!fechaNac) return "—";
    const nac = new Date(fechaNac);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return `${edad} años`;
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas" as any)).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `credencial-${hijo?.nombre.replace(/\s+/g, "-").toLowerCase() ?? "jugador"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("No se pudo generar la imagen. Intenta de nuevo.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (hijos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <IdCard className="h-8 w-8" />
        <p>No hay jugadores vinculados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Credencial Digital</h1>

      {hijos.length > 1 && (
        <Select value={selectedId} onValueChange={(v: string | null) => setSelectedId(v ?? "")}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar hijo">
              {hijo?.nombre ?? "Seleccionar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {hijos.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hijo && (
        <>
          {/* Credential Card */}
          <div className="flex justify-center">
            <div
              ref={cardRef}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                aspectRatio: "1.586",
              }}
            >
              {/* Header stripe */}
              <div
                className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-3"
                style={{ background: "linear-gradient(90deg, #ff2e93, #c70f6e)" }}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-white" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Acción Fútbol
                  </span>
                </div>
                <span className="text-[10px] font-medium text-white/80">
                  CREDENCIAL JUGADOR
                </span>
              </div>

              {/* Content */}
              <div className="flex h-full items-end px-5 pb-4 pt-14">
                <div className="flex w-full items-end gap-4">
                  {/* Photo placeholder */}
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                    {hijo.foto_url ? (
                      <img
                        src={hijo.foto_url}
                        alt={hijo.nombre}
                        className="h-full w-full rounded-xl object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <User className="h-10 w-10 text-white/40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <h2 className="text-base font-bold leading-tight text-white">
                      {hijo.nombre}
                    </h2>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-[11px] text-white/60">
                        RUT: {hijo.rut}
                      </span>
                      <span className="text-[11px] text-white/60">
                        {calcularEdad(hijo.fecha_nacimiento)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-white/70">
                        <MapPin className="h-3 w-3" /> {hijo.sede_nombre}
                      </span>
                      <span className="text-[11px] font-medium text-white/90">
                        {hijo.categoria_nombre}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {hijo.posicion_principal && (
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: "rgba(255,46,147,0.4)" }}
                        >
                          {hijo.posicion_principal}
                        </span>
                      )}
                      {hijo.numero_camiseta && (
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: "rgba(255,255,255,0.15)" }}
                        >
                          #{hijo.numero_camiseta}
                        </span>
                      )}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          hijo.estado === "ACTIVO" || hijo.estado === "BECADO"
                            ? "bg-emerald-500/30 text-emerald-300"
                            : hijo.estado === "LESIONADO"
                            ? "bg-red-500/30 text-red-300"
                            : "bg-zinc-500/30 text-zinc-300"
                        }`}
                      >
                        {hijo.estado}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/20 px-5 py-1.5">
                <span className="text-[9px] text-white/40">
                  {hijo.fecha_ingreso
                    ? `Desde ${new Date(hijo.fecha_ingreso + "T12:00:00").toLocaleDateString("es-CL", { month: "short", year: "numeric" })}`
                    : ""}
                </span>
                <span className="text-[9px] text-white/40">
                  accionfutbol.cl
                </span>
              </div>
            </div>
          </div>

          {/* Download button */}
          <div className="flex justify-center">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Descargar credencial
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
