"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Plus,
  ChevronLeft,
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Shield,
  Shirt,
  Heart,
  X,
  CheckCircle2,
  DollarSign,
  Upload,
} from "lucide-react";
import type { EstadoJugador, EstadoMes } from "@/lib/types";
import { CargaMasiva } from "@/components/jugadores/carga-masiva";

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
}

interface Jugador {
  id: string;
  rut: string;
  nombre: string;
  fecha_nacimiento: string | null;
  estado: EstadoJugador;
  estado_mes: EstadoMes | null;
  tipo: string | null;
  sede_id: string;
  categoria_id: string;
  nivel: string | null;
  subnivel: string | null;
  posicion_principal: string | null;
  posicion_secundaria: string | null;
  pie_dominante: string | null;
  email_jugador: string | null;
  telefono_jugador: string | null;
  telefono_apoderado: string | null;
  foto_url: string | null;
  fecha_ingreso: string | null;
  fecha_salida: string | null;
  anio_nacimiento: number | null;
  sexo: string | null;
  nacionalidad: string | null;
  comuna: string | null;
  direccion: string | null;
  colegio: string | null;
  comuna_colegio: string | null;
  talla_ropa: string | null;
  nombre_camiseta: string | null;
  numero_camiseta: string | null;
  antecedentes_deportivos: string | null;
  como_llego: string | null;
  objetivo: string | null;
  centro_salud_emergencia: string | null;
  situacion_pagos: string | null;
  pago_mensual: string | null;
  numero_morosidad: number | null;
  grupo_whatsapp: string | null;
  nombre_apoderado: string | null;
  email_apoderado: string | null;
  rut_apoderado: string | null;
  profesion_apoderado: string | null;
  comuna_apoderado: string | null;
  uniforme_negro: string | null;
  uniforme_rosado: string | null;
  poleron: string | null;
  sede_nombre?: string;
  categoria_nombre?: string;
}

type Vista = "lista" | "ficha" | "nuevo";

const ESTADOS: EstadoJugador[] = ["ACTIVO", "FULL", "NEW", "LESIONADO", "DESACTIVADO", "BECADO"];
const ESTADOS_MES: EstadoMes[] = ["SEGURO", "INSEGURO", "OUT"];
const TIPOS = ["PRO", "ADULTO", "RECREATIVO"];
const POSICIONES = [
  "ARQUERO", "DEFENSA CENTRAL", "LATERAL DERECHO", "LATERAL IZQUIERDO",
  "MEDIOCAMPISTA CENTRAL", "MEDIOCAMPISTA OFENSIVO", "MEDIOCAMPISTA DEFENSIVO",
  "EXTREMO DERECHO", "EXTREMO IZQUIERDO", "MEDIAPUNTA", "CENTRO DELANTERO",
];
const PIES = ["DERECHO", "IZQUIERDO", "AMBIDIESTRO"];

const estadoColor: Record<string, string> = {
  ACTIVO: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  FULL: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  NEW: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  LESIONADO: "border-red-500/30 text-red-400 bg-red-500/10",
  DESACTIVADO: "border-zinc-500/30 text-zinc-400 bg-zinc-500/10",
  BECADO: "border-purple-500/30 text-purple-400 bg-purple-500/10",
};

const estadoMesColor: Record<string, string> = {
  SEGURO: "border-emerald-500/30 text-emerald-400",
  INSEGURO: "border-yellow-500/30 text-yellow-400",
  OUT: "border-red-500/30 text-red-400",
};

function emptyJugador(): Partial<Jugador> {
  return {
    rut: "",
    nombre: "",
    estado: "NEW",
    estado_mes: "SEGURO",
    tipo: "PRO",
    sede_id: "",
    categoria_id: "",
  };
}

export default function JugadoresPage() {
  const supabase = createClient();
  const [vista, setVista] = useState<Vista>("lista");
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sedeFilter, setSedeFilter] = useState("all");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [selected, setSelected] = useState<Jugador | null>(null);
  const [form, setForm] = useState<Partial<Jugador>>(emptyJugador());
  const [asistenciaStats, setAsistenciaStats] = useState<Record<string, { ok: number; total: number }>>({});
  const [showCargaMasiva, setShowCargaMasiva] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single();
    setIsAdmin(profile?.role === "admin");

    const { data: s } = await supabase
      .from("sedes")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre");
    if (s) setSedes(s);

    const { data: c } = await supabase
      .from("categorias")
      .select("id, nombre, sede_id")
      .eq("activa", true)
      .order("nombre");
    if (c) setCategorias(c);

    let query = supabase
      .from("jugadores")
      .select("*, sedes(nombre), categorias(nombre)")
      .order("nombre");

    const { data } = await query;
    if (data) {
      setJugadores(
        data.map((j: any) => ({
          ...j,
          sede_nombre: j.sedes?.nombre ?? "",
          categoria_nombre: j.categorias?.nombre ?? "",
        }))
      );

      const { data: marks } = await supabase
        .from("asistencia")
        .select("jugador_id, marca");
      if (marks) {
        const stats: Record<string, { ok: number; total: number }> = {};
        for (const m of marks) {
          if (!stats[m.jugador_id]) stats[m.jugador_id] = { ok: 0, total: 0 };
          stats[m.jugador_id].total++;
          if (m.marca === "OK") stats[m.jugador_id].ok++;
        }
        setAsistenciaStats(stats);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoriasForFilter = categorias.filter(
    (c) => sedeFilter === "all" || sedes.find((s) => s.nombre === sedeFilter)?.id === c.sede_id
  );

  const filtered = jugadores.filter((j) => {
    const matchSearch =
      !search ||
      j.nombre.toLowerCase().includes(search.toLowerCase()) ||
      j.rut.toLowerCase().includes(search.toLowerCase());
    const matchSede =
      sedeFilter === "all" || j.sede_nombre === sedeFilter;
    const matchCategoria =
      categoriaFilter === "all" || j.categoria_id === categoriaFilter;
    const matchEstado =
      estadoFilter === "todos" || j.estado === estadoFilter;
    return matchSearch && matchSede && matchCategoria && matchEstado;
  });

  function openFicha(j: Jugador) {
    setSelected(j);
    setForm({ ...j });
    setVista("ficha");
    setSaveMsg("");
  }

  function openNuevo() {
    setSelected(null);
    setForm(emptyJugador());
    setVista("nuevo");
    setSaveMsg("");
  }

  function updateForm(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value || null }));
    setSaveMsg("");
  }

  async function handleSave() {
    if (!form.rut || !form.nombre || !form.sede_id || !form.categoria_id) {
      setSaveMsg("Faltan campos obligatorios: RUT, Nombre, Sede y Categoría");
      return;
    }
    setSaving(true);
    setSaveMsg("");

    const {
      id, created_at, updated_at, sede_nombre, categoria_nombre,
      sedes: _s, categorias: _c, ...payload
    } = form as any;

    if (vista === "nuevo") {
      const { error } = await supabase.from("jugadores").insert(payload);
      if (error) {
        setSaveMsg(error.message.includes("duplicate")
          ? "Ya existe un jugador con ese RUT"
          : `Error: ${error.message}`);
      } else {
        setSaveMsg("ok");
        await loadData();
        setTimeout(() => setVista("lista"), 800);
      }
    } else if (selected) {
      const { error } = await supabase
        .from("jugadores")
        .update(payload)
        .eq("id", selected.id);
      if (error) {
        setSaveMsg(`Error: ${error.message}`);
      } else {
        setSaveMsg("ok");
        await loadData();
      }
    }
    setSaving(false);
  }

  const categoriasFiltered = categorias.filter(
    (c) => c.sede_id === form.sede_id
  );

  // ─── LISTA ───
  if (vista === "lista") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Data Jugadores</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCargaMasiva(true)} className="gap-1">
              <Upload className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={openNuevo} className="gap-1">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={sedeFilter} onValueChange={(v) => { setSedeFilter(v ?? "all"); setCategoriaFilter("all"); }}>
            <SelectTrigger>
              <SelectValue>
                {sedeFilter === "all" ? "Sede" : sedeFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.nombre}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoriaFilter} onValueChange={(v) => setCategoriaFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue>
                {categoriaFilter === "all"
                  ? "Categoría"
                  : categorias.find((c) => c.id === categoriaFilter)?.nombre ?? "Categoría"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categoriasForFilter.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v ?? "todos")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground">
          {filtered.length} jugador{filtered.length !== 1 ? "es" : ""}
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((j) => {
              const stats = asistenciaStats[j.id];
              const pct = stats && stats.total > 0 ? Math.round((stats.ok / stats.total) * 100) : null;
              return (
                <button
                  key={j.id}
                  onClick={() => openFicha(j)}
                  className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-card/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{j.nombre}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" className={estadoColor[j.estado] ?? ""}>
                        {j.estado}
                      </Badge>
                      {j.estado_mes && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${estadoMesColor[j.estado_mes] ?? ""}`}>
                          {j.estado_mes}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {j.rut} · {j.sede_nombre} · {j.categoria_nombre}
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {j.telefono_jugador && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{j.telefono_jugador}</span>
                      </div>
                    )}
                    {j.telefono_apoderado && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{j.telefono_apoderado}</span>
                      </div>
                    )}
                    {j.email_apoderado && (
                      <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{j.email_apoderado}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                      {pct !== null ? (
                        <span className={pct >= 75 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}>
                          Asistencia: {pct}% ({stats!.ok}/{stats!.total})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin registros</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 shrink-0" />
                      {j.pago_mensual ? (
                        <span className={
                          j.pago_mensual.toUpperCase().includes("MOROS")
                            ? "text-red-400"
                            : j.pago_mensual.toUpperCase().includes("DI") || j.pago_mensual.toUpperCase().includes("DÍ")
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                        }>
                          {j.pago_mensual}
                          {j.numero_morosidad && j.numero_morosidad > 0 ? ` (${j.numero_morosidad} mes${j.numero_morosidad > 1 ? "es" : ""})` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin info pago</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {showCargaMasiva && (
          <CargaMasiva
            sedes={sedes}
            categorias={categorias}
            onDone={loadData}
            onClose={() => setShowCargaMasiva(false)}
          />
        )}
      </div>
    );
  }

  // ─── FICHA / NUEVO ───
  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setVista("lista"); setSaveMsg(""); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-primary">
          {vista === "nuevo" ? "NUEVO JUGADOR" : "FICHA JUGADOR"}
        </h1>
      </div>

      {vista === "ficha" && (
        <h2 className="text-xl font-bold">{selected?.nombre}</h2>
      )}

      {/* Estado general + Estado mes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado General</label>
          <Select
            value={form.estado ?? "ACTIVO"}
            onValueChange={(v) => updateForm("estado", v)}
            disabled={!isAdmin}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado Mes</label>
          <Select
            value={form.estado_mes ?? "SEGURO"}
            onValueChange={(v) => updateForm("estado_mes", v)}
            disabled={!isAdmin}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS_MES.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sección: Datos personales */}
      <Section icon={User} title="Datos del Jugador">
        <Field label="RUT *" value={form.rut} onChange={(v) => updateForm("rut", v)} placeholder="12345678-9" disabled={vista === "ficha"} />
        <Field label="Nombre Completo *" value={form.nombre} onChange={(v) => updateForm("nombre", v)} placeholder="Nombre Apellido" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha Nacimiento" value={form.fecha_nacimiento} onChange={(v) => updateForm("fecha_nacimiento", v)} type="date" />
          <Field label="Sexo" value={form.sexo} onChange={(v) => updateForm("sexo", v)} placeholder="MASCULINO" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nacionalidad" value={form.nacionalidad} onChange={(v) => updateForm("nacionalidad", v)} placeholder="CHILENA" />
          <Field label="Talla de Ropa" value={form.talla_ropa} onChange={(v) => updateForm("talla_ropa", v)} placeholder="S / M / L / XL" />
        </div>
      </Section>

      {/* Sección: Contacto jugador */}
      <Section icon={Phone} title="Contacto Jugador">
        <Field label="Correo Jugador" value={form.email_jugador} onChange={(v) => updateForm("email_jugador", v)} type="email" placeholder="jugador@gmail.com" />
        <Field label="Teléfono Jugador" value={form.telefono_jugador} onChange={(v) => updateForm("telefono_jugador", v)} placeholder="+56912345678" />
      </Section>

      {/* Sección: Ubicación */}
      <Section icon={MapPin} title="Ubicación">
        <Field label="Dirección" value={form.direccion} onChange={(v) => updateForm("direccion", v)} placeholder="Calle 123, depto 456" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comuna" value={form.comuna} onChange={(v) => updateForm("comuna", v)} placeholder="La Florida" />
          <Field label="Comuna Apoderado" value={form.comuna_apoderado} onChange={(v) => updateForm("comuna_apoderado", v)} placeholder="Peñalolén" />
        </div>
      </Section>

      {/* Sección: Colegio */}
      <Section icon={GraduationCap} title="Educación">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Colegio / Universidad" value={form.colegio} onChange={(v) => updateForm("colegio", v)} />
          <Field label="Comuna Colegio" value={form.comuna_colegio} onChange={(v) => updateForm("comuna_colegio", v)} />
        </div>
      </Section>

      {/* Sección: Deportiva */}
      <Section icon={Shield} title="Datos Deportivos">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sede *</label>
            <Select value={form.sede_id ?? ""} onValueChange={(v) => { updateForm("sede_id", v); updateForm("categoria_id", ""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar">
                  {sedes.find((s) => s.id === form.sede_id)?.nombre ?? "Seleccionar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sedes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría *</label>
            <Select value={form.categoria_id ?? ""} onValueChange={(v) => updateForm("categoria_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar">
                  {categorias.find((c) => c.id === form.categoria_id)?.nombre ?? "Seleccionar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoriasFiltered.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={form.tipo ?? "PRO"} onValueChange={(v) => updateForm("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Nivel" value={form.nivel} onChange={(v) => updateForm("nivel", v)} placeholder="COMP. / A.R." />
        </div>
        <Field label="Subnivel" value={form.subnivel} onChange={(v) => updateForm("subnivel", v)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Posición Principal</label>
            <Select value={form.posicion_principal ?? ""} onValueChange={(v) => updateForm("posicion_principal", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {POSICIONES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Posición Secundaria</label>
            <Select value={form.posicion_secundaria ?? ""} onValueChange={(v) => updateForm("posicion_secundaria", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {POSICIONES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Pie Hábil</label>
            <Select value={form.pie_dominante ?? ""} onValueChange={(v) => updateForm("pie_dominante", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {PIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Fecha Ingreso" value={form.fecha_ingreso} onChange={(v) => updateForm("fecha_ingreso", v)} type="date" />
        </div>
        <Field label="Fecha Salida" value={form.fecha_salida} onChange={(v) => updateForm("fecha_salida", v)} type="date" />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Antecedentes Deportivos</label>
          <Textarea
            value={form.antecedentes_deportivos ?? ""}
            onChange={(e) => updateForm("antecedentes_deportivos", e.target.value)}
            placeholder="Dónde ha jugado, selecciones, escuelas..."
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="¿Cómo llegó a AF?" value={form.como_llego} onChange={(v) => updateForm("como_llego", v)} placeholder="Instagram, amigo..." />
          <Field label="Objetivo" value={form.objetivo} onChange={(v) => updateForm("objetivo", v)} placeholder="Fútbol profesional..." />
        </div>
      </Section>

      {/* Sección: Apoderado */}
      <Section icon={Mail} title="Datos del Apoderado">
        <Field label="Nombre Apoderado" value={form.nombre_apoderado} onChange={(v) => updateForm("nombre_apoderado", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="RUT Apoderado" value={form.rut_apoderado} onChange={(v) => updateForm("rut_apoderado", v)} placeholder="12345678-9" />
          <Field label="Profesión" value={form.profesion_apoderado} onChange={(v) => updateForm("profesion_apoderado", v)} />
        </div>
        <Field label="Teléfono Apoderado" value={form.telefono_apoderado} onChange={(v) => updateForm("telefono_apoderado", v)} placeholder="+56912345678" />
        <Field label="Correo Apoderado" value={form.email_apoderado} onChange={(v) => updateForm("email_apoderado", v)} type="email" placeholder="apoderado@gmail.com" />
      </Section>

      {/* Sección: Uniformes */}
      <Section icon={Shirt} title="Indumentaria">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre Camiseta" value={form.nombre_camiseta} onChange={(v) => updateForm("nombre_camiseta", v)} />
          <Field label="Número Camiseta" value={form.numero_camiseta} onChange={(v) => updateForm("numero_camiseta", v)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Uniforme Negro" value={form.uniforme_negro} onChange={(v) => updateForm("uniforme_negro", v)} placeholder="OK / NO" />
          <Field label="Uniforme Rosado" value={form.uniforme_rosado} onChange={(v) => updateForm("uniforme_rosado", v)} placeholder="OK / NO" />
          <Field label="Polerón" value={form.poleron} onChange={(v) => updateForm("poleron", v)} placeholder="OK / NO" />
        </div>
      </Section>

      {/* Sección: Emergencia */}
      <Section icon={DollarSign} title="Pagos">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pago Mensual" value={form.pago_mensual} onChange={(v) => updateForm("pago_mensual", v)} placeholder="AL DIA / MOROSO" />
          <Field label="Nº Morosidad (meses)" value={form.numero_morosidad != null ? String(form.numero_morosidad) : ""} onChange={(v) => updateForm("numero_morosidad", v ? Number(v) : null)} placeholder="0" type="number" />
        </div>
        <Field label="Situación de Pagos (detalle)" value={form.situacion_pagos} onChange={(v) => updateForm("situacion_pagos", v)} placeholder="Observaciones..." />
      </Section>

      <Section icon={Heart} title="Emergencia y Otros">
        <Field label="Centro de Salud Emergencia" value={form.centro_salud_emergencia} onChange={(v) => updateForm("centro_salud_emergencia", v)} />
        <Field label="Grupo WhatsApp" value={form.grupo_whatsapp} onChange={(v) => updateForm("grupo_whatsapp", v)} />
      </Section>

      {/* Guardar */}
      <div className="sticky bottom-0 flex gap-3 border-t border-border bg-background pt-3 pb-2">
        <Button
          variant="outline"
          onClick={() => { setVista("lista"); setSaveMsg(""); }}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveMsg === "ok" ? (
            <>✓ ¡Guardado!</>
          ) : (
            <><Save className="h-4 w-4" /> {vista === "nuevo" ? "Crear Jugador" : "Guardar Cambios"}</>
          )}
        </Button>
      </div>

      {saveMsg && saveMsg !== "ok" && (
        <p className="text-sm text-red-400">{saveMsg}</p>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
