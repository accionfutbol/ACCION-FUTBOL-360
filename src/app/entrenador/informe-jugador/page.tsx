"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileText,
  Download,
  Search,
} from "lucide-react";

interface Sede { id: string; nombre: string; }
interface Categoria { id: string; nombre: string; sede_id: string; }
interface Jugador {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
  fecha_nacimiento: string | null;
  posicion_principal: string | null;
  pie_dominante: string | null;
  numero_camiseta: string | null;
}

export default function InformeJugadorPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [catId, setCatId] = useState("");
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

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

  const loadJugadores = useCallback(async () => {
    if (!catId) return;
    setLoading(true);
    const { data } = await supabase
      .from("jugadores")
      .select("id, nombre, rut, estado, fecha_nacimiento, posicion_principal, pie_dominante, numero_camiseta")
      .eq("categoria_id", catId)
      .neq("estado", "DESACTIVADO")
      .order("nombre") as { data: any[]; error: any };
    setJugadores((data ?? []) as Jugador[]);
    setLoading(false);
  }, [catId, supabase]);

  useEffect(() => { if (catId) loadJugadores(); }, [catId, loadJugadores]);

  const jugadoresFiltrados = jugadores.filter(
    (j) => !busqueda || j.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function generarInforme(jug: Jugador) {
    setGenerating(jug.id);

    const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre ?? "";
    const catNombre = filteredCats.find((c) => c.id === catId)?.nombre ?? "";

    const [{ data: asistData }, { data: partidosData }, { data: evalTecData }, { data: evalFisData }] = await Promise.all([
      supabase.from("asistencia").select("marca").eq("jugador_id", jug.id),
      supabase.from("partido_jugador")
        .select("minutos, goles, asistencias_gol, tarj_amarilla, tarj_roja, estado")
        .eq("jugador_id", jug.id),
      supabase.from("evaluaciones")
        .select("semestre, anio, nota_tecnica, nota_fisica, nota_actitudinal, promedio, comentario")
        .eq("jugador_id", jug.id)
        .order("anio", { ascending: false })
        .order("semestre", { ascending: false }),
      supabase.from("eval_fisicas")
        .select("fecha, altura, peso, imc, salto, velocidad_30m, ift, flexibilidad")
        .eq("jugador_id", jug.id)
        .order("fecha", { ascending: false })
        .limit(1),
    ]);

    const asist = asistData ?? [];
    const totalSesiones = asist.length;
    const ok = asist.filter((a: any) => a.marca === "OK").length;
    const faltas = asist.filter((a: any) => a.marca === "F").length;
    const justif = asist.filter((a: any) => a.marca === "J").length;
    const pctAsist = totalSesiones > 0 ? Math.round((ok / totalSesiones) * 100) : 0;

    const partidos = partidosData ?? [];
    const totalPartidos = partidos.length;
    const totalMinutos = partidos.reduce((s: number, p: any) => s + (p.minutos ?? 0), 0);
    const totalGoles = partidos.reduce((s: number, p: any) => s + (p.goles ?? 0), 0);
    const totalAsist = partidos.reduce((s: number, p: any) => s + (p.asistencias_gol ?? 0), 0);
    const totalTA = partidos.reduce((s: number, p: any) => s + (p.tarj_amarilla ?? 0), 0);
    const totalTR = partidos.reduce((s: number, p: any) => s + (p.tarj_roja ?? 0), 0);

    const evalTec = evalTecData ?? [];
    const evalFis = (evalFisData ?? [])[0] ?? null;

    const jsPDF = (await import("jspdf" as any)).default;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

    const w = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header bar
    doc.setFillColor(199, 15, 110);
    doc.rect(0, 0, w, 25, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("ACCIÓN FÚTBOL — INFORME DE JUGADOR", w / 2, 16, { align: "center" });

    y = 35;

    // Player info
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(18);
    doc.text(jug.nombre, 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const infoLine = [
      `RUT: ${jug.rut}`,
      jug.fecha_nacimiento ? `Nacimiento: ${jug.fecha_nacimiento}` : null,
      `Estado: ${jug.estado}`,
    ].filter(Boolean).join("  |  ");
    doc.text(infoLine, 15, y);
    y += 5;

    const infoLine2 = [
      `Sede: ${sedeNombre}`,
      `Categoría: ${catNombre}`,
      jug.posicion_principal ? `Posición: ${jug.posicion_principal}` : null,
      jug.pie_dominante ? `Pie: ${jug.pie_dominante}` : null,
      jug.numero_camiseta ? `N°: ${jug.numero_camiseta}` : null,
    ].filter(Boolean).join("  |  ");
    doc.text(infoLine2, 15, y);
    y += 5;

    doc.setDrawColor(199, 15, 110);
    doc.setLineWidth(0.5);
    doc.line(15, y, w - 15, y);
    y += 8;

    // Section: Asistencia
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(199, 15, 110);
    doc.text("ASISTENCIA", 15, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Sesiones totales: ${totalSesiones}`, 15, y);
    doc.text(`Asistencia: ${ok} (${pctAsist}%)`, 80, y);
    y += 5;
    doc.text(`Faltas: ${faltas}`, 15, y);
    doc.text(`Justificadas: ${justif}`, 80, y);
    y += 10;

    // Section: Partidos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(199, 15, 110);
    doc.text("PARTIDOS Y ESTADÍSTICAS", 15, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Partidos jugados: ${totalPartidos}`, 15, y);
    doc.text(`Minutos totales: ${totalMinutos}`, 80, y);
    y += 5;
    doc.text(`Goles: ${totalGoles}`, 15, y);
    doc.text(`Asistencias: ${totalAsist}`, 80, y);
    doc.text(`TA: ${totalTA} | TR: ${totalTR}`, 145, y);
    y += 10;

    // Section: Evaluaciones Técnicas
    if (evalTec.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(199, 15, 110);
      doc.text("EVALUACIONES TÉCNICAS", 15, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      // Table header
      doc.setFont("helvetica", "bold");
      doc.text("Período", 15, y);
      doc.text("Técnica", 50, y);
      doc.text("Física", 80, y);
      doc.text("Actitud", 110, y);
      doc.text("Promedio", 140, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      evalTec.forEach((e: any) => {
        doc.text(`S${e.semestre} ${e.anio}`, 15, y);
        doc.text(e.nota_tecnica?.toFixed(1) ?? "—", 50, y);
        doc.text(e.nota_fisica?.toFixed(1) ?? "—", 80, y);
        doc.text(e.nota_actitudinal?.toFixed(1) ?? "—", 110, y);
        doc.setFont("helvetica", "bold");
        doc.text(e.promedio?.toFixed(1) ?? "—", 140, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        if (e.comentario) {
          doc.setTextColor(120, 120, 120);
          doc.text(`   "${e.comentario}"`, 15, y);
          doc.setTextColor(80, 80, 80);
          y += 5;
        }
      });
      y += 5;
    }

    // Section: Evaluación Física
    if (evalFis) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(199, 15, 110);
      doc.text("ÚLTIMA EVALUACIÓN FÍSICA", 15, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Fecha: ${evalFis.fecha}`, 15, y);
      y += 5;

      const metrics = [
        ["Altura", evalFis.altura ? `${evalFis.altura} cm` : "—"],
        ["Peso", evalFis.peso ? `${evalFis.peso} kg` : "—"],
        ["IMC", evalFis.imc ? `${evalFis.imc}` : "—"],
        ["Salto", evalFis.salto ? `${evalFis.salto} cm` : "—"],
        ["30m", evalFis.velocidad_30m ? `${evalFis.velocidad_30m}s` : "—"],
        ["IFT", evalFis.ift ? `${evalFis.ift}` : "—"],
        ["Flexibilidad", evalFis.flexibilidad ? `${evalFis.flexibilidad} cm` : "—"],
      ];

      metrics.forEach(([label, val], i) => {
        const col = i % 3;
        if (col === 0 && i > 0) y += 5;
        doc.text(`${label}: ${val}`, 15 + col * 60, y);
      });
      y += 10;
    }

    // Footer
    const hoy = new Date();
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generado el ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()} — Academia Acción Fútbol`,
      w / 2, doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    doc.save(`informe_${jug.nombre.replace(/\s/g, "_")}.pdf`);
    setGenerating(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Informe por Jugador</h1>
        <Badge variant="outline" className="text-xs">
          <FileText className="mr-1 h-3 w-3" /> PDF
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Genera un informe PDF completo con datos, asistencia, partidos y evaluaciones de cada jugador.
      </p>

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

      {catId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jugador..."
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
      ) : catId && jugadoresFiltrados.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-8 w-8 mb-2" />
          <p>No hay jugadores en esta categoría</p>
        </div>
      ) : catId ? (
        <div className="space-y-2">
          {jugadoresFiltrados.map((j) => (
            <Card key={j.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{j.nombre}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{j.rut}</span>
                    <Badge variant="outline" className="text-[10px]">{j.estado}</Badge>
                    {j.posicion_principal && (
                      <span className="text-[10px] text-muted-foreground">{j.posicion_principal}</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generarInforme(j)}
                  disabled={generating === j.id}
                  className="gap-1 shrink-0"
                >
                  {generating === j.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Generar PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
