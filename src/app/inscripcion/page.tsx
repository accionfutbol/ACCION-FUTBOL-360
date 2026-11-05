"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, CheckCircle2, Trophy } from "lucide-react";
import Image from "next/image";

interface Sede {
  id: string;
  nombre: string;
}

const COMO_LLEGO_OPTIONS = [
  "Recomendación de otro apoderado",
  "Redes sociales (Instagram, Facebook)",
  "Búsqueda en Google",
  "Vive cerca de la sede",
  "Evento / torneo",
  "Otro",
];

export default function InscripcionPublica() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form
  const [nombreJugador, setNombreJugador] = useState("");
  const [rutJugador, setRutJugador] = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [sexo, setSexo] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [categoriaPreferida, setCategoriaPreferida] = useState("");
  const [nombreApoderado, setNombreApoderado] = useState("");
  const [emailApoderado, setEmailApoderado] = useState("");
  const [telefonoApoderado, setTelefonoApoderado] = useState("");
  const [rutApoderado, setRutApoderado] = useState("");
  const [comuna, setComuna] = useState("");
  const [comoLlego, setComoLlego] = useState("");
  const [antecedentes, setAntecedentes] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    supabase
      .from("sedes")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre")
      .then(({ data }) => {
        setSedes((data ?? []) as Sede[]);
        setLoading(false);
      });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreJugador.trim() || !nombreApoderado.trim() || !emailApoderado.trim() || !telefonoApoderado.trim()) return;
    setSaving(true);

    await supabase.from("inscripciones").insert({
      nombre_jugador: nombreJugador.trim(),
      rut_jugador: rutJugador.trim() || null,
      fecha_nacimiento: fechaNac || null,
      sexo: sexo || null,
      sede_id: sedeId || null,
      categoria_preferida: categoriaPreferida.trim() || null,
      nombre_apoderado: nombreApoderado.trim(),
      email_apoderado: emailApoderado.trim(),
      telefono_apoderado: telefonoApoderado.trim(),
      rut_apoderado: rutApoderado.trim() || null,
      comuna: comuna.trim() || null,
      como_llego: comoLlego || null,
      antecedentes_deportivos: antecedentes.trim() || null,
      observaciones: observaciones.trim() || null,
    });

    setSaving(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
            <h2 className="mb-2 text-2xl font-bold">Inscripción enviada</h2>
            <p className="text-muted-foreground">
              Hemos recibido tu solicitud. El equipo de Acción Fútbol la revisará y te contactaremos pronto.
            </p>
            <Button className="mt-6" onClick={() => { setSuccess(false); setNombreJugador(""); setRutJugador(""); setFechaNac(""); setSexo(""); setSedeId(""); setCategoriaPreferida(""); setNombreApoderado(""); setEmailApoderado(""); setTelefonoApoderado(""); setRutApoderado(""); setComuna(""); setComoLlego(""); setAntecedentes(""); setObservaciones(""); }}>
              Enviar otra inscripción
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 pb-12">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-6">
          <Image src="/logo-af.jpg" alt="Acción Fútbol" width={56} height={56} className="rounded-lg" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Inscripción Online</h1>
            <p className="text-sm text-muted-foreground">Academia Acción Fútbol</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del jugador */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" /> Datos del jugador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo del jugador *</Label>
                <Input value={nombreJugador} onChange={(e) => setNombreJugador(e.target.value)} placeholder="Ej: Matías Pérez González" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>RUT del jugador</Label>
                  <Input value={rutJugador} onChange={(e) => setRutJugador(e.target.value)} placeholder="12.345.678-9" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={sexo} onValueChange={(v: string | null) => setSexo(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar">{sexo || "Seleccionar"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sede de interés</Label>
                  <Select value={sedeId} onValueChange={(v: string | null) => setSedeId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Seleccionar"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría preferida</Label>
                <Input value={categoriaPreferida} onChange={(e) => setCategoriaPreferida(e.target.value)} placeholder="Ej: Sub-10, Sub-12, etc." />
              </div>
              <div className="space-y-2">
                <Label>Antecedentes deportivos</Label>
                <Textarea value={antecedentes} onChange={(e) => setAntecedentes(e.target.value)} placeholder="¿Ha jugado en otro club o academia?" rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Datos del apoderado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Datos del apoderado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={nombreApoderado} onChange={(e) => setNombreApoderado(e.target.value)} placeholder="Nombre del apoderado" required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={emailApoderado} onChange={(e) => setEmailApoderado(e.target.value)} placeholder="correo@ejemplo.cl" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input value={telefonoApoderado} onChange={(e) => setTelefonoApoderado(e.target.value)} placeholder="+569 1234 5678" required />
                </div>
                <div className="space-y-2">
                  <Label>RUT apoderado</Label>
                  <Input value={rutApoderado} onChange={(e) => setRutApoderado(e.target.value)} placeholder="12.345.678-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Comuna</Label>
                <Input value={comuna} onChange={(e) => setComuna(e.target.value)} placeholder="Ej: Ñuñoa" />
              </div>
              <div className="space-y-2">
                <Label>¿Cómo llegó a Acción Fútbol?</Label>
                <Select value={comoLlego} onValueChange={(v: string | null) => setComoLlego(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar">{comoLlego || "Seleccionar"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COMO_LLEGO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observaciones adicionales</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Algo que quieras contarnos..." rows={2} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving || loading} className="w-full gap-2 py-6 text-base">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Enviar inscripción
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Al enviar este formulario aceptas que Acción Fútbol procese los datos proporcionados con el fin de evaluar la inscripción.
          </p>
        </form>
      </div>
    </div>
  );
}
