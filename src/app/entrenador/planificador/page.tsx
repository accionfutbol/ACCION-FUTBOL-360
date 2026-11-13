"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
  Check,
  Calendar,
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  Target,
  Users,
  MapPin,
  BookOpen,
  Search,
  ImagePlus,
  Download,
} from "lucide-react";

interface Sede { id: string; nombre: string }
interface Categoria { id: string; nombre: string; sede_id: string }
interface Planificacion {
  id?: string;
  sede_id: string;
  categoria_id: string;
  fecha: string;
  contenido: string;
  tipo: string;
  titulo?: string;
  objetivo?: string;
  observaciones?: string;
  materiales?: string;
  espacio_cancha?: string;
  cantidad_jugadores?: string;
  horario?: string;
  sede_nombre?: string;
}

interface Ejercicio {
  id?: string;
  nombre: string;
  descripcion: string;
  duracion_min: number | null;
  materiales: string;
  espacio_cancha: string;
  imagen_url?: string | null;
  _file?: File;
}

interface BibliotecaEjercicio {
  id: number;
  categoria: string;
  subcategoria: string | null;
  nombre: string;
  fase_modelo: string;
  momento_juego: string;
  objetivo: string;
  formato: string;
  imagen_url: string | null;
}

const DIAS_HEADER = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_CONFIG = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];
const DIAS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPOS = ["ENTRENAMIENTO", "TORNEO", "AMISTOSO", "PRUEBA", "OTRO"];

const RANGOS_JUGADORES = [
  { value: "10-20", label: "10 a 20 jugadores" },
  { value: "20-30", label: "20 a 30 jugadores" },
  { value: "30-40", label: "30 a 40 jugadores" },
  { value: "40-50", label: "40 a 50 jugadores" },
  { value: "50-60", label: "50 a 60 jugadores" },
];

const tipoBg: Record<string, string> = {
  ENTRENAMIENTO: "bg-primary/15 border-primary/30",
  TORNEO: "bg-yellow-500/15 border-yellow-500/30",
  AMISTOSO: "bg-emerald-500/15 border-emerald-500/30",
  PRUEBA: "bg-blue-500/15 border-blue-500/30",
  OTRO: "bg-zinc-500/10 border-zinc-500/30",
};
const tipoText: Record<string, string> = {
  ENTRENAMIENTO: "text-primary",
  TORNEO: "text-yellow-500",
  AMISTOSO: "text-emerald-500",
  PRUEBA: "text-blue-500",
  OTRO: "text-zinc-400",
};

type Vista = "mes" | "semana";

export default function PlanificadorPage() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth());
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [vista, setVista] = useState<Vista>("mes");
  const [configDays, setConfigDays] = useState<number[]>([6]);
  const [planes, setPlanes] = useState<Planificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTipo, setEditTipo] = useState("ENTRENAMIENTO");
  const [editTitulo, setEditTitulo] = useState("");
  const [editObjetivo, setEditObjetivo] = useState("");
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editMateriales, setEditMateriales] = useState("");
  const [editEspacio, setEditEspacio] = useState("");
  const [editCantJugadores, setEditCantJugadores] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editSedeNombre, setEditSedeNombre] = useState("");
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loadingEjercicios, setLoadingEjercicios] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const [bibSearch, setBibSearch] = useState("");
  const [bibCategoria, setBibCategoria] = useState("");
  const [bibFase, setBibFase] = useState("");
  const [bibResults, setBibResults] = useState<BibliotecaEjercicio[]>([]);
  const [bibLoading, setBibLoading] = useState(false);
  const [bibCategorias, setBibCategorias] = useState<string[]>([]);
  const [bibFases, setBibFases] = useState<string[]>([]);
  const [previewImg, setPreviewImg] = useState<{url: string; nombre: string} | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("categorias").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
      ]);
      if (s) setSedes(s);
      if (c) setCategorias(c);
      setLoading(false);
    })();
  }, [supabase]);

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const loadPlan = useCallback(async () => {
    if (!sedeId || !categoriaId) return;
    const firstDay = new Date(anio, mes, 1);
    const lastDay = new Date(anio, mes + 1, 0);
    const desde = toDateStr(firstDay);
    const hasta = toDateStr(lastDay);

    const [{ data: dias }, { data: plan }] = await Promise.all([
      supabase.from("dias_entrenamiento").select("dia_semana").eq("sede_id", sedeId).eq("categoria_id", categoriaId),
      supabase.from("planificacion").select("id, sede_id, categoria_id, fecha, contenido, tipo, titulo, objetivo, observaciones, materiales, espacio_cancha, cantidad_jugadores, horario, sede_nombre").eq("sede_id", sedeId).eq("categoria_id", categoriaId).gte("fecha", desde).lte("fecha", hasta),
    ]);

    if (dias && dias.length > 0) {
      const d = dias.map((x: any) => x.dia_semana as number);
      if (!d.includes(6)) d.push(6);
      setConfigDays(d);
    } else {
      setConfigDays([6]);
    }
    setPlanes(plan ?? []);
  }, [supabase, sedeId, categoriaId, anio, mes]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const trainingDaySet = useMemo(() => new Set(configDays), [configDays]);

  const planMap = useMemo(() => {
    const m: Record<string, Planificacion> = {};
    for (const p of planes) m[p.fecha] = p;
    return m;
  }, [planes]);

  // ── Calendar grid for month view ──
  const calendarGrid = useMemo(() => {
    const first = new Date(anio, mes, 1);
    const last = new Date(anio, mes + 1, 0);
    const startPad = first.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(anio, mes, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [anio, mes]);

  // ── Week view dates ──
  const weekDates = useMemo(() => {
    const first = new Date(anio, mes, 1);
    const dayOfWeek = first.getDay();
    const weekStart = new Date(first);
    weekStart.setDate(weekStart.getDate() - dayOfWeek + semanaOffset * 7);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [anio, mes, semanaOffset]);

  function changeMonth(delta: number) {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
    setSemanaOffset(0);
  }

  async function openEdit(date: Date) {
    const key = toDateStr(date);
    const existing = planMap[key];
    setEditDate(key);
    setEditContent(existing?.contenido ?? "");
    setEditTipo(existing?.tipo ?? (date.getDay() === 6 ? "TORNEO" : "ENTRENAMIENTO"));
    setEditTitulo(existing?.titulo ?? "");
    setEditObjetivo(existing?.objetivo ?? "");
    setEditObservaciones(existing?.observaciones ?? "");
    setEditMateriales(existing?.materiales ?? "");
    setEditEspacio(existing?.espacio_cancha ?? "");
    setEditCantJugadores(existing?.cantidad_jugadores ?? "");
    setEditHorario(existing?.horario ?? "");
    setEditSedeNombre(existing?.sede_nombre ?? sedeNombre);
    setEjercicios([]);

    if (existing?.id) {
      setLoadingEjercicios(true);
      const { data } = await supabase
        .from("planificacion_ejercicios")
        .select("id, nombre, descripcion, duracion_min, materiales, espacio_cancha, imagen_url")
        .eq("planificacion_id", existing.id)
        .order("orden");
      setEjercicios((data ?? []).map((e: any) => ({
        id: e.id,
        nombre: e.nombre ?? "",
        descripcion: e.descripcion ?? "",
        duracion_min: e.duracion_min,
        materiales: e.materiales ?? "",
        espacio_cancha: e.espacio_cancha ?? "",
        imagen_url: e.imagen_url ?? null,
      })));
      setLoadingEjercicios(false);
    }
  }

  async function saveEdit() {
    if (!editDate || !sedeId || !categoriaId) return;
    setSaving(true);
    const existing = planMap[editDate];
    const planData = {
      sede_id: sedeId,
      categoria_id: categoriaId,
      fecha: editDate,
      contenido: editContent,
      tipo: editTipo,
      titulo: editTitulo || null,
      objetivo: editObjetivo || null,
      observaciones: editObservaciones || null,
      materiales: editMateriales || null,
      espacio_cancha: editEspacio || null,
      cantidad_jugadores: editCantJugadores || null,
      horario: editHorario || null,
      sede_nombre: editSedeNombre || null,
      updated_at: new Date().toISOString(),
    };

    let planId = existing?.id;
    if (planId) {
      await supabase.from("planificacion").update(planData).eq("id", planId);
    } else {
      const { data } = await supabase
        .from("planificacion")
        .upsert(planData, { onConflict: "sede_id,categoria_id,fecha" })
        .select("id")
        .single();
      planId = data?.id;
    }

    if (planId && ejercicios.length > 0) {
      const uploadedUrls: (string | null)[] = [];
      for (const e of ejercicios) {
        if (e._file) {
          const ext = e._file.name.split(".").pop() ?? "jpg";
          const path = `${planId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { data: upData, error: upErr } = await supabase.storage.from("ejercicios").upload(path, e._file, { upsert: true });
          if (upErr) { uploadedUrls.push(e.imagen_url ?? null); }
          else {
            const { data: urlData } = supabase.storage.from("ejercicios").getPublicUrl(upData.path);
            uploadedUrls.push(urlData.publicUrl);
          }
        } else {
          uploadedUrls.push(e.imagen_url ?? null);
        }
      }
      await supabase.from("planificacion_ejercicios").delete().eq("planificacion_id", planId);
      const rows = ejercicios.map((e, i) => ({
        planificacion_id: planId,
        orden: i,
        nombre: e.nombre,
        descripcion: e.descripcion || null,
        duracion_min: e.duracion_min,
        materiales: e.materiales || null,
        espacio_cancha: e.espacio_cancha || null,
        imagen_url: uploadedUrls[i] || null,
      }));
      await supabase.from("planificacion_ejercicios").insert(rows);
    } else if (planId && ejercicios.length === 0) {
      await supabase.from("planificacion_ejercicios").delete().eq("planificacion_id", planId);
    }

    await loadPlan();
    setEditDate(null);
    setSaving(false);
  }

  function addEjercicio() {
    setEjercicios((prev) => [...prev, { nombre: "", descripcion: "", duracion_min: null, materiales: "", espacio_cancha: "", imagen_url: null }]);
  }

  function updateEjercicio(idx: number, field: keyof Ejercicio, value: any) {
    setEjercicios((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function removeEjercicio(idx: number) {
    setEjercicios((prev) => prev.filter((_, i) => i !== idx));
  }

  async function openBiblioteca() {
    setShowBiblioteca(true);
    setBibSearch("");
    setBibCategoria("");
    setBibFase("");
    setBibLoading(true);
    const [{ data: all }, { data: cats }, { data: fases }] = await Promise.all([
      supabase.from("biblioteca_ejercicios").select("*").order("categoria").order("nombre").limit(50),
      supabase.from("biblioteca_ejercicios").select("categoria").order("categoria"),
      supabase.from("biblioteca_ejercicios").select("fase_modelo").order("fase_modelo"),
    ]);
    setBibResults(all ?? []);
    const uniqueCats = [...new Set((cats ?? []).map((r: any) => r.categoria))].sort();
    const uniqueFases = [...new Set((fases ?? []).map((r: any) => r.fase_modelo))].sort();
    setBibCategorias(uniqueCats);
    setBibFases(uniqueFases);
    setBibLoading(false);
  }

  async function searchBiblioteca() {
    setBibLoading(true);
    let q = supabase.from("biblioteca_ejercicios").select("*");
    if (bibCategoria) q = q.eq("categoria", bibCategoria);
    if (bibFase) q = q.eq("fase_modelo", bibFase);
    if (bibSearch.trim()) q = q.ilike("nombre", `%${bibSearch.trim()}%`);
    q = q.order("categoria").order("nombre").limit(100);
    const { data } = await q;
    setBibResults(data ?? []);
    setBibLoading(false);
  }

  function addFromBiblioteca(bej: BibliotecaEjercicio) {
    setEjercicios((prev) => [
      ...prev,
      {
        nombre: bej.nombre,
        descripcion: `${bej.categoria}${bej.subcategoria ? " — " + bej.subcategoria : ""}\nObjetivo: ${bej.objetivo}\nMomento: ${bej.momento_juego}`,
        duracion_min: null,
        materiales: "",
        espacio_cancha: "",
      },
    ]);
  }

  async function saveConfig() {
    if (!sedeId || !categoriaId) return;
    setSaving(true);
    await supabase.from("dias_entrenamiento").delete().eq("sede_id", sedeId).eq("categoria_id", categoriaId);
    const allDays = new Set(configDays);
    allDays.add(6);
    const rows = Array.from(allDays).map((dia) => ({ sede_id: sedeId, categoria_id: categoriaId, dia_semana: dia }));
    await supabase.from("dias_entrenamiento").insert(rows);
    await loadPlan();
    setShowConfig(false);
    setSaving(false);
  }

  function toggleDay(day: number) {
    if (day === 6) return;
    setConfigDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  async function exportPDF() {
    if (!editDate) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pw - margin * 2;
    let y = 15;

    // Logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
        logoImg.src = "/logo-af.jpg";
      });
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      canvas.getContext("2d")!.drawImage(logoImg, 0, 0);
      const logoData = canvas.toDataURL("image/jpeg");
      const logoW = 25;
      const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
      doc.addImage(logoData, "JPEG", pw / 2 - logoW / 2, y, logoW, logoH);
      y += logoH + 4;
    } catch { y += 5; }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ACCIÓN FÚTBOL", pw / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Planificación de Entrenamiento", pw / 2, y, { align: "center" });
    y += 10;

    // Línea magenta
    doc.setDrawColor(255, 46, 147);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    // Info general
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const infoLeft = [
      ["Fecha:", formatDateLong(editDate)],
      ["Sede:", editSedeNombre || sedeNombre],
      ["Categoría:", catNombre],
    ];
    const infoRight = [
      ["Tipo:", editTipo],
      ["Horario:", editHorario || "—"],
      ["Jugadores:", editCantJugadores || "—"],
    ];
    for (let i = 0; i < infoLeft.length; i++) {
      doc.setFont("helvetica", "bold");
      doc.text(infoLeft[i][0], margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(infoLeft[i][1], margin + 25, y);
      doc.setFont("helvetica", "bold");
      doc.text(infoRight[i][0], pw / 2 + 5, y);
      doc.setFont("helvetica", "normal");
      doc.text(infoRight[i][1], pw / 2 + 30, y);
      y += 6;
    }
    y += 4;

    // Título
    if (editTitulo) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(editTitulo, pw / 2, y, { align: "center" });
      y += 8;
    }

    // Objetivo
    if (editObjetivo) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Objetivo:", margin, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(editObjetivo, contentW - 22);
      doc.text(lines, margin + 22, y);
      y += lines.length * 5 + 4;
    }

    // Materiales / Espacio
    if (editMateriales || editEspacio) {
      doc.setFontSize(10);
      if (editMateriales) {
        doc.setFont("helvetica", "bold");
        doc.text("Materiales:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(editMateriales, margin + 27, y);
      }
      if (editEspacio) {
        doc.setFont("helvetica", "bold");
        doc.text("Espacio:", pw / 2 + 5, y);
        doc.setFont("helvetica", "normal");
        doc.text(editEspacio, pw / 2 + 25, y);
      }
      y += 8;
    }

    // Ejercicios
    if (ejercicios.length > 0) {
      doc.setDrawColor(255, 46, 147);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 6;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Ejercicios", margin, y);
      y += 7;

      for (let i = 0; i < ejercicios.length; i++) {
        const ej = ejercicios[i];
        if (y > 260) { doc.addPage(); y = 15; }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. ${ej.nombre}`, margin, y);
        y += 6;

        if (ej.descripcion) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(ej.descripcion, contentW - 5);
          for (const line of descLines) {
            if (y > 275) { doc.addPage(); y = 15; }
            doc.text(line, margin + 5, y);
            y += 4.5;
          }
          y += 2;
        }

        // Imagen del ejercicio
        if (ej.imagen_url && !ej._file) {
          try {
            const imgEl = new Image();
            imgEl.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
              imgEl.onload = () => resolve();
              imgEl.onerror = () => reject();
              imgEl.src = ej.imagen_url! + (ej.imagen_url!.includes("lh3.googleusercontent.com") ? "=w600" : "");
            });
            const c = document.createElement("canvas");
            c.width = imgEl.naturalWidth;
            c.height = imgEl.naturalHeight;
            c.getContext("2d")!.drawImage(imgEl, 0, 0);
            const imgData = c.toDataURL("image/jpeg");
            const imgW = Math.min(80, contentW - 10);
            const imgH = (imgEl.naturalHeight / imgEl.naturalWidth) * imgW;
            if (y + imgH > 270) { doc.addPage(); y = 15; }
            doc.addImage(imgData, "JPEG", margin + 5, y, imgW, imgH);
            y += imgH + 5;
          } catch { /* skip if image fails */ }
        }

        const meta = [
          ej.duracion_min ? `${ej.duracion_min} min` : "",
          ej.materiales || "",
          ej.espacio_cancha || "",
        ].filter(Boolean).join(" · ");
        if (meta) {
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(meta, margin + 5, y);
          doc.setTextColor(0, 0, 0);
          y += 5;
        }
        y += 3;
      }
    }

    // Notas adicionales
    if (editContent) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pw - margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Notas adicionales:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(editContent, contentW);
      for (const line of notesLines) {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.text(line, margin, y);
        y += 4.5;
      }
    }

    // Observaciones
    if (editObservaciones) {
      y += 4;
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Observaciones:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const obsLines = doc.splitTextToSize(editObservaciones, contentW);
      for (const line of obsLines) {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.text(line, margin, y);
        y += 4.5;
      }
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Acción Fútbol — ${catNombre} — ${formatDateLong(editDate)}`, margin, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Página ${p}/${pages}`, pw - margin, doc.internal.pageSize.getHeight() - 8, { align: "right" });
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`Planificacion_${catNombre.replace(/\s/g, "_")}_${editDate}.pdf`);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const sedeNombre = sedes.find((s) => s.id === sedeId)?.nombre ?? "";
  const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? "";
  const ready = sedeId && categoriaId;

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-xl font-bold">Planificador</h1>

      {/* Selectores */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Sede</label>
          <Select value={sedeId} onValueChange={(v: string | null) => { setSedeId(v ?? ""); setCategoriaId(""); setPlanes([]); setSemanaOffset(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar sede">{sedeId ? sedes.find((s) => s.id === sedeId)?.nombre : "Seleccionar sede"}</SelectValue>
            </SelectTrigger>
            <SelectContent>{sedes.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
          <Select value={categoriaId} onValueChange={(v: string | null) => { setCategoriaId(v ?? ""); setSemanaOffset(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar">{categoriaId ? categorias.find((c) => c.id === categoriaId)?.nombre : "Seleccionar"}</SelectValue>
            </SelectTrigger>
            <SelectContent>{categoriasFiltered.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {ready && (
        <>
          {/* Toolbar: nav + vista toggle + config */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => vista === "mes" ? changeMonth(-1) : setSemanaOffset((p) => p - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="min-w-0 flex-1 text-center text-lg font-semibold">
              {vista === "mes"
                ? `${MESES[mes]} ${anio}`
                : (() => {
                    const f = weekDates[0];
                    const l = weekDates[6];
                    return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)} – ${l.getDate()} ${MESES[l.getMonth()].slice(0, 3)} ${l.getFullYear()}`;
                  })()
              }
            </h2>
            <Button variant="ghost" size="icon" onClick={() => vista === "mes" ? changeMonth(1) : setSemanaOffset((p) => p + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div className="flex rounded-lg border border-border">
              <button
                onClick={() => setVista("mes")}
                className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-xs font-medium transition-colors ${vista === "mes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar className="h-3.5 w-3.5" /> Mes
              </button>
              <button
                onClick={() => { setVista("semana"); setSemanaOffset(0); }}
                className={`flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-xs font-medium transition-colors ${vista === "semana" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Semana
              </button>
            </div>

            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowConfig(!showConfig)}>
              <Settings2 className="h-4 w-4" /> Días
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {sedeNombre} · {catNombre}
          </p>

          {/* Config días */}
          {showConfig && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">Días de entrenamiento</p>
                <Button size="sm" onClick={saveConfig} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA_CONFIG.map((d) => {
                  const active = configDays.includes(d.value) || d.value === 6;
                  return (
                    <button key={d.value} onClick={() => toggleDay(d.value)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95 ${active ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30"} ${d.value === 6 ? "cursor-default opacity-80" : "cursor-pointer"}`}>
                      {d.label}
                      {d.value === 6 && <span className="ml-1 text-[10px] text-muted-foreground">(fijo)</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Sábado siempre incluido (torneos / amistosos)</p>
            </div>
          )}

          {/* ═══ VISTA MES — Calendario grilla ═══ */}
          {vista === "mes" && (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {/* Encabezado días */}
              <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                {DIAS_HEADER.map((d, i) => (
                  <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 || i === 6 ? "text-primary" : "text-muted-foreground"}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Celdas */}
              <div className="grid grid-cols-7">
                {calendarGrid.map((date, i) => {
                  if (!date) {
                    return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-border bg-muted/20 md:min-h-[110px]" />;
                  }
                  const key = toDateStr(date);
                  const plan = planMap[key];
                  const isTraining = trainingDaySet.has(date.getDay());
                  const isSabado = date.getDay() === 6;
                  const tipo = plan?.tipo ?? (isSabado ? "TORNEO" : "ENTRENAMIENTO");
                  const today = toDateStr(new Date()) === key;

                  return (
                    <button
                      key={key}
                      onClick={() => openEdit(date)}
                      className={`relative min-h-[90px] border-b border-r border-border p-1.5 text-left transition-colors md:min-h-[110px] md:p-2 cursor-pointer hover:bg-muted/40 active:scale-[0.98] ${
                        !isTraining ? "bg-muted/10 opacity-60" : ""
                      } ${today ? "ring-2 ring-inset ring-primary/40" : ""}`}
                    >
                      {/* Número del día */}
                      <div className="flex items-start justify-between">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${today ? "bg-primary text-primary-foreground" : ""}`}>
                          {date.getDate()}
                        </span>
                        {(isTraining || plan) && (
                          <span className={`hidden rounded px-1 py-0.5 text-[9px] font-semibold md:inline-block ${tipoText[tipo] ?? ""}`}>
                            {tipo === "ENTRENAMIENTO" ? "ENT" : tipo === "TORNEO" ? "TOR" : tipo === "AMISTOSO" ? "AMI" : tipo.slice(0, 3)}
                          </span>
                        )}
                      </div>
                      {/* Contenido */}
                      {(plan?.titulo || plan?.contenido) ? (
                        <p className="mt-0.5 line-clamp-3 text-[10px] leading-tight md:text-xs md:leading-snug">
                          {plan.titulo ? <span className="font-semibold">{plan.titulo}</span> : plan.contenido}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[10px] italic text-muted-foreground md:text-xs">+</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ VISTA SEMANA ═══ */}
          {vista === "semana" && (
            <div className="space-y-0 rounded-lg border border-border bg-card">
              {weekDates.map((date, i) => {
                const key = toDateStr(date);
                const plan = planMap[key];
                const isTraining = trainingDaySet.has(date.getDay());
                const isSabado = date.getDay() === 6;
                const tipo = plan?.tipo ?? (isSabado ? "TORNEO" : "ENTRENAMIENTO");
                const today = toDateStr(new Date()) === key;
                const inMonth = date.getMonth() === mes;

                return (
                  <button
                    key={key}
                    onClick={() => openEdit(date)}
                    className={`flex w-full items-center gap-3 border-b border-border text-left transition-colors last:border-b-0 cursor-pointer p-3 hover:bg-muted/40 active:scale-[0.995] md:p-4 items-start ${
                      !isTraining ? "opacity-50" : ""
                    } ${today ? "bg-primary/5" : ""} ${!inMonth ? "opacity-50" : ""}`}
                  >
                    {/* Fecha columna */}
                    <div className={`flex shrink-0 flex-col items-center ${isTraining ? "w-14" : "w-14"}`}>
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {DIAS_FULL[date.getDay()].slice(0, 3)}
                      </span>
                      <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${today ? "bg-primary text-primary-foreground" : ""}`}>
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      {(isTraining || plan) && (
                        <span className={`mb-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${tipoBg[tipo] ?? ""} ${tipoText[tipo] ?? ""}`}>
                          {tipo}
                        </span>
                      )}
                      {(plan?.titulo || plan?.contenido) ? (
                        <div>
                          {plan.titulo && <p className="text-sm font-semibold">{plan.titulo}</p>}
                          {plan.objetivo && <p className="text-xs text-muted-foreground">{plan.objetivo}</p>}
                          {!plan.titulo && plan.contenido && <p className="whitespace-pre-wrap text-sm leading-relaxed">{plan.contenido}</p>}
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">Sin planificación — toca para agregar</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 text-[10px]">
            {TIPOS.slice(0, 4).map((t) => (
              <span key={t} className={`rounded border px-1.5 py-0.5 font-medium ${tipoBg[t] ?? ""} ${tipoText[t] ?? ""}`}>{t}</span>
            ))}
          </div>
        </>
      )}

      {/* ═══ Modal de edición ═══ */}
      {editDate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditDate(null)} />
          <div className="fixed inset-x-2 inset-y-4 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl md:inset-x-auto md:inset-y-8 md:left-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-lg font-bold text-primary">{formatDateLong(editDate)}</h3>
              <button onClick={() => setEditDate(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* Fila: Tipo + Título */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de actividad</label>
                  <Select value={editTipo} onValueChange={(v: string | null) => setEditTipo(v ?? "ENTRENAMIENTO")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Título</label>
                  <Input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} placeholder="Ej: Técnica de pase y recepción" />
                </div>
              </div>

              {/* Objetivo */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target className="h-3.5 w-3.5" /> Objetivo de la sesión
                </label>
                <Textarea value={editObjetivo} onChange={(e) => setEditObjetivo(e.target.value)} placeholder="Ej: Mejorar la precisión en el pase corto y la recepción orientada" rows={2} />
              </div>

              {/* Materiales y Espacio */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Materiales generales</label>
                  <Input value={editMateriales} onChange={(e) => setEditMateriales(e.target.value)} placeholder="Ej: Conos, petos, balones" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Espacio de cancha</label>
                  <Input value={editEspacio} onChange={(e) => setEditEspacio(e.target.value)} placeholder="Ej: Media cancha, área chica" />
                </div>
              </div>

              {/* Cantidad de jugadores, Horario, Sede */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Jugadores en cancha
                  </label>
                  <Select value={editCantJugadores} onValueChange={(v: string | null) => setEditCantJugadores(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {RANGOS_JUGADORES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Horario
                  </label>
                  <Input value={editHorario} onChange={(e) => setEditHorario(e.target.value)} placeholder="Ej: 18:00 - 19:30" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Sede / Lugar
                  </label>
                  <Input value={editSedeNombre} onChange={(e) => setEditSedeNombre(e.target.value)} placeholder="Ej: Cancha Las Condes" />
                </div>
              </div>

              {/* ── Ejercicios ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Ejercicios</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openBiblioteca} className="gap-1.5 text-xs">
                      <BookOpen className="h-3.5 w-3.5" /> Biblioteca
                    </Button>
                    <Button variant="outline" size="sm" onClick={addEjercicio} className="gap-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Manual
                    </Button>
                  </div>
                </div>

                {loadingEjercicios && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {ejercicios.length === 0 && !loadingEjercicios && (
                  <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                    Sin ejercicios — agrega uno con el botón de arriba
                  </p>
                )}

                {/* ── Panel Biblioteca ── */}
                {showBiblioteca && (
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">Biblioteca de Ejercicios</p>
                      <button onClick={() => setShowBiblioteca(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="mb-3 flex flex-col gap-2 md:flex-row">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={bibSearch}
                          onChange={(e) => setBibSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchBiblioteca()}
                          placeholder="Buscar ejercicio..."
                          className="pl-8 text-sm"
                        />
                      </div>
                      <Select value={bibCategoria} onValueChange={(v: string | null) => setBibCategoria(v === "__all__" ? "" : (v ?? ""))}>
                        <SelectTrigger className="w-full text-xs md:w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas las categorías</SelectItem>
                          {bibCategorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={bibFase} onValueChange={(v: string | null) => setBibFase(v === "__all__" ? "" : (v ?? ""))}>
                        <SelectTrigger className="w-full text-xs md:w-40"><SelectValue placeholder="Fase" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas las fases</SelectItem>
                          {bibFases.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={searchBiblioteca} className="gap-1 text-xs">
                        <Search className="h-3.5 w-3.5" /> Buscar
                      </Button>
                    </div>
                    <div className="max-h-60 space-y-1 overflow-y-auto">
                      {bibLoading && (
                        <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                      )}
                      {!bibLoading && bibResults.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
                      )}
                      {!bibLoading && bibResults.map((bej) => (
                        <button
                          key={bej.id}
                          onClick={() => addFromBiblioteca(bej)}
                          className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card p-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]"
                        >
                          {bej.imagen_url ? (
                            <img
                              src={bej.imagen_url + "=w120"}
                              alt={bej.nombre}
                              className="h-14 w-14 shrink-0 cursor-zoom-in rounded-md border border-border object-cover"
                              loading="lazy"
                              onClick={(e) => { e.stopPropagation(); setPreviewImg({url: bej.imagen_url + "=w800", nombre: bej.nombre}); }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{bej.nombre}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {bej.categoria} · {bej.fase_modelo}
                            </p>
                            <p className="mt-0.5 text-[10px] text-primary/70">{bej.momento_juego}</p>
                          </div>
                          <Plus className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        </button>
                      ))}
                    </div>
                    {!bibLoading && bibResults.length > 0 && (
                      <p className="mt-2 text-center text-[10px] text-muted-foreground">{bibResults.length} ejercicios — toca uno para agregarlo</p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {ejercicios.map((ej, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <Input
                          value={ej.nombre}
                          onChange={(e) => updateEjercicio(idx, "nombre", e.target.value)}
                          placeholder="Nombre del ejercicio"
                          className="flex-1 font-medium"
                        />
                        <button onClick={() => removeEjercicio(idx)} className="shrink-0 text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mb-2">
                        <Textarea
                          value={ej.descripcion}
                          onChange={(e) => updateEjercicio(idx, "descripcion", e.target.value)}
                          placeholder="Descripción del ejercicio, instrucciones, variantes..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      {/* Imagen del ejercicio */}
                      <div className="mb-2">
                        {(ej.imagen_url || ej._file) ? (
                          <div className="flex items-start gap-2">
                            <img
                              src={ej._file ? URL.createObjectURL(ej._file) : (ej.imagen_url ?? "")}
                              alt={ej.nombre}
                              className="h-20 w-28 cursor-zoom-in rounded-md border border-border object-cover"
                              onClick={() => setPreviewImg({url: ej._file ? URL.createObjectURL(ej._file) : (ej.imagen_url ?? ""), nombre: ej.nombre})}
                            />
                            <div className="flex flex-col gap-1">
                              <label className="cursor-pointer rounded border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                                Cambiar
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) updateEjercicio(idx, "_file", e.target.files[0]); }} />
                              </label>
                              <button onClick={() => { updateEjercicio(idx, "imagen_url", null); updateEjercicio(idx, "_file", undefined); }} className="text-[10px] text-red-400 hover:text-red-500">Quitar</button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                            <ImagePlus className="h-4 w-4" />
                            <span>Subir imagen del ejercicio</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) updateEjercicio(idx, "_file", e.target.files[0]); }} />
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[10px] text-muted-foreground"><Clock className="mr-0.5 inline h-3 w-3" />Duración (min)</label>
                          <Input
                            type="number"
                            min={1}
                            max={120}
                            value={ej.duracion_min ?? ""}
                            onChange={(e) => updateEjercicio(idx, "duracion_min", e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="15"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] text-muted-foreground">Materiales</label>
                          <Input
                            value={ej.materiales}
                            onChange={(e) => updateEjercicio(idx, "materiales", e.target.value)}
                            placeholder="Conos, petos"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] text-muted-foreground">Espacio</label>
                          <Input
                            value={ej.espacio_cancha}
                            onChange={(e) => updateEjercicio(idx, "espacio_cancha", e.target.value)}
                            placeholder="20x20m"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contenido libre (legacy + notas extra) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas adicionales</label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Notas libres, recordatorios, ajustes de último minuto..."
                  rows={3}
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Observaciones</label>
                <Textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  placeholder="Observaciones post-entrenamiento, qué funcionó, qué mejorar..."
                  rows={2}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-border px-5 py-4">
              <Button variant="outline" onClick={() => setEditDate(null)} className="flex-1">Cancelar</Button>
              <Button variant="outline" onClick={exportPDF} className="gap-2">
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button onClick={saveEdit} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Lightbox imagen ejercicio ═══ */}
      {previewImg && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/70" onClick={() => setPreviewImg(null)} />
          <div className="fixed inset-4 z-[61] flex flex-col items-center justify-center" onClick={() => setPreviewImg(null)}>
            <div className="mb-2 flex w-full max-w-2xl items-center justify-between px-1">
              <p className="truncate text-sm font-semibold text-white">{previewImg.nombre}</p>
              <button onClick={() => setPreviewImg(null)} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <img
              src={previewImg.url}
              alt={previewImg.nombre}
              className="max-h-[80vh] max-w-full rounded-lg border border-white/20 object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}
    </div>
  );
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}
