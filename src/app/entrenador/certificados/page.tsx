"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Award,
  Download,
  Search,
  Plus,
  Save,
  CheckCircle2,
  FileText,
} from "lucide-react";

const TIPOS_CERT = [
  { value: "PARTICIPACION", label: "Participación" },
  { value: "PERTENENCIA", label: "Pertenencia" },
  { value: "LOGRO", label: "Logro Deportivo" },
  { value: "ASISTENCIA", label: "Asistencia Destacada" },
  { value: "OTRO", label: "Otro" },
];

interface Sede { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; sede_id: string; }
interface Jugador { id: string; nombre: string; rut: string; }

interface CertificadoRow {
  id: string;
  jugador_id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  fecha_emision: string;
  jugador_nombre: string;
}

export default function CertificadosPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [certificados, setCertificados] = useState<CertificadoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  // Form fields
  const [jugadorId, setJugadorId] = useState("");
  const [tipo, setTipo] = useState("PARTICIPACION");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function init() {
      const [{ data: sed }, { data: cat }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      setSedes((sed ?? []) as Sede[]);
      setCategorias((cat ?? []) as Categoria[]);
    }
    init();
  }, [supabase]);

  const filteredCats = categorias.filter((c) => c.sede_id === sedeId);

  const loadData = useCallback(async () => {
    if (!catId) return;
    setLoading(true);

    const { data: jugs } = await supabase
      .from("jugadores")
      .select("id, nombre, rut")
      .eq("categoria_id", catId)
      .neq("estado", "DESACTIVADO")
      .order("nombre") as { data: any[]; error: any };

    setJugadores((jugs ?? []) as Jugador[]);

    const jugIds = (jugs ?? []).map((j: any) => j.id);
    if (jugIds.length > 0) {
      const { data: certs } = await supabase
        .from("certificados")
        .select("id, jugador_id, tipo, titulo, descripcion, fecha_emision")
        .in("jugador_id", jugIds)
        .order("fecha_emision", { ascending: false }) as { data: any[]; error: any };

      const jugMap = new Map((jugs ?? []).map((j: any) => [j.id, j.nombre]));
      setCertificados(
        (certs ?? []).map((c: any) => ({
          ...c,
          jugador_nombre: jugMap.get(c.jugador_id) ?? "",
        }))
      );
    } else {
      setCertificados([]);
    }
    setLoading(false);
  }, [catId, supabase]);

  useEffect(() => { if (catId) loadData(); }, [catId, loadData]);

  function resetForm() {
    setJugadorId(""); setTipo("PARTICIPACION"); setTitulo(""); setDescripcion("");
    setShowForm(false);
  }

  async function handleCrear() {
    if (!jugadorId || !titulo.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("certificados").insert({
      jugador_id: jugadorId,
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      emitido_por: user?.id ?? null,
      fecha_emision: new Date().toISOString().slice(0, 10),
    });

    setSaving(false);
    if (!error) {
      setGuardado(true);
      setTimeout(() => { setGuardado(false); resetForm(); loadData(); }, 1000);
    }
  }

  async function generarPDF(cert: CertificadoRow) {
    setGenerating(cert.id);

    const jsPDF = (await import("jspdf" as any)).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Border
    doc.setDrawColor(199, 15, 110);
    doc.setLineWidth(2);
    doc.rect(10, 10, w - 20, h - 20);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, w - 28, h - 28);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(199, 15, 110);
    doc.text("ACADEMIA ACCIÓN FÚTBOL", w / 2, 35, { align: "center" });

    // Title
    doc.setFontSize(28);
    doc.setTextColor(40, 40, 40);
    doc.text("CERTIFICADO", w / 2, 55, { align: "center" });

    // Tipo
    const tipoLabel = TIPOS_CERT.find((t) => t.value === cert.tipo)?.label ?? cert.tipo;
    doc.setFontSize(14);
    doc.setTextColor(199, 15, 110);
    doc.text(`DE ${tipoLabel.toUpperCase()}`, w / 2, 65, { align: "center" });

    // Body
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("Se certifica que", w / 2, 85, { align: "center" });

    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(cert.jugador_nombre.toUpperCase(), w / 2, 100, { align: "center" });

    // Line under name
    doc.setDrawColor(199, 15, 110);
    doc.setLineWidth(0.7);
    const nameWidth = doc.getTextWidth(cert.jugador_nombre.toUpperCase());
    doc.line((w - nameWidth) / 2 - 10, 104, (w + nameWidth) / 2 + 10, 104);

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    const descText = cert.titulo + (cert.descripcion ? `\n${cert.descripcion}` : "");
    const lines = doc.splitTextToSize(descText, w - 80);
    doc.text(lines, w / 2, 118, { align: "center" });

    // Date
    const fecha = new Date(cert.fecha_emision + "T12:00:00");
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const fechaStr = `Santiago, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
    doc.setFontSize(10);
    doc.text(fechaStr, w / 2, h - 45, { align: "center" });

    // Signature line
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(w / 2 - 40, h - 35, w / 2 + 40, h - 35);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Director Técnico", w / 2, h - 30, { align: "center" });
    doc.text("Academia Acción Fútbol", w / 2, h - 25, { align: "center" });

    doc.save(`certificado_${cert.jugador_nombre.replace(/\s/g, "_")}.pdf`);
    setGenerating(null);
  }

  const certsFiltrados = certificados.filter(
    (c) => !busqueda || c.jugador_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Certificados</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-4 w-4" /> Emitir certificado
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Sede</Label>
          <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCatId(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona sede">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Selecciona sede"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select value={catId} onValueChange={(v: string | null) => setCatId(v ?? "")} disabled={!sedeId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría">{catId ? filteredCats.find((c) => c.id === catId)?.nombre : "Selecciona categoría"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showForm && catId && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Jugador *</Label>
                <Select value={jugadorId} onValueChange={(v: string | null) => setJugadorId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona jugador">{jugadorId ? jugadores.find((j) => j.id === jugadorId)?.nombre : "Selecciona jugador"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {jugadores.map((j) => <SelectItem key={j.id} value={j.id}>{j.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={(v: string | null) => setTipo(v ?? "PARTICIPACION")}>
                  <SelectTrigger>
                    <SelectValue>{TIPOS_CERT.find((t) => t.value === tipo)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CERT.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título del certificado *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Participación en Copa Primavera 2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción adicional</Label>
              <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles adicionales..." rows={2} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
              <Button onClick={handleCrear} disabled={saving || !jugadorId || !titulo.trim()} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : guardado ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? "Emitiendo..." : guardado ? "¡Emitido!" : "Emitir"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {catId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar certificado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : catId && certsFiltrados.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Award className="mx-auto h-8 w-8 mb-2" />
          <p>No hay certificados emitidos</p>
          <p className="text-xs mt-1">Emite el primer certificado con el botón de arriba</p>
        </div>
      ) : catId ? (
        <div className="space-y-2">
          {certsFiltrados.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.jugador_nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.titulo}</p>
                  <div className="flex gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {TIPOS_CERT.find((t) => t.value === c.tipo)?.label ?? c.tipo}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{c.fecha_emision}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generarPDF(c)}
                  disabled={generating === c.id}
                  className="gap-1 shrink-0"
                >
                  {generating === c.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
