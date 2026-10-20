"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MarcaAsistencia } from "@/lib/types";

interface JugadorAsistencia {
  jugador_id: string;
  nombre: string;
  rut: string;
  estado: string;
  telefono_jugador: string | null;
  telefono_apoderado: string | null;
  marca: MarcaAsistencia;
  asistencia_id: string | null;
}

interface Sede {
  id: string;
  nombre: string;
}

interface Categoria {
  id: string;
  nombre: string;
  sede_id: string;
  dias_entrenamiento: number[];
}

export function useAsistencia() {
  const supabase = createClient();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split("T")[0];
  });
  const [jugadores, setJugadores] = useState<JugadorAsistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdmin = profile?.role === "admin";

      const { data: allSedes } = await supabase
        .from("sedes")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");

      const { data: allCats } = await supabase
        .from("categorias")
        .select("id, nombre, sede_id, dias_entrenamiento")
        .eq("activa", true)
        .order("nombre");

      if (!allSedes || !allCats) return;

      if (isAdmin) {
        setSedes(allSedes);
        setCategorias(allCats);
      } else {
        const { data: entrenador } = await supabase
          .from("entrenadores")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!entrenador) return;

        const { data: permisos } = await supabase
          .from("entrenador_categoria")
          .select("categoria_id")
          .eq("entrenador_id", entrenador.id);

        const catIds = new Set((permisos ?? []).map((p) => p.categoria_id));
        const filteredCats = allCats.filter((c) => catIds.has(c.id));
        const sedeIds = new Set(filteredCats.map((c) => c.sede_id));
        const filteredSedes = allSedes.filter((s) => sedeIds.has(s.id));

        setSedes(filteredSedes);
        setCategorias(filteredCats);
      }
    }
    loadConfig();
  }, [supabase]);

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  const categoriaActual = categorias.find((c) => c.id === categoriaId);
  const diasEntrenamiento = categoriaActual?.dias_entrenamiento ?? [];

  function findNearestTrainingDay(fromDate: string, direction: "prev" | "next" | "nearest"): string {
    if (diasEntrenamiento.length === 0) return fromDate;
    const d = new Date(fromDate + "T12:00:00");
    if (direction === "nearest") {
      const dow = d.getDay();
      if (diasEntrenamiento.includes(dow)) return fromDate;
      for (let i = 1; i <= 7; i++) {
        const prev = new Date(d);
        prev.setDate(prev.getDate() - i);
        if (diasEntrenamiento.includes(prev.getDay())) return prev.toISOString().split("T")[0];
        const next = new Date(d);
        next.setDate(next.getDate() + i);
        if (diasEntrenamiento.includes(next.getDay())) return next.toISOString().split("T")[0];
      }
    } else {
      const step = direction === "prev" ? -1 : 1;
      const candidate = new Date(d);
      for (let i = 0; i < 7; i++) {
        candidate.setDate(candidate.getDate() + step);
        if (diasEntrenamiento.includes(candidate.getDay())) return candidate.toISOString().split("T")[0];
      }
    }
    return fromDate;
  }

  function fechaAnterior() {
    setFecha((f) => findNearestTrainingDay(f, "prev"));
  }

  function fechaSiguiente() {
    setFecha((f) => findNearestTrainingDay(f, "next"));
  }

  useEffect(() => {
    if (categoriaId && diasEntrenamiento.length > 0) {
      setFecha((f) => findNearestTrainingDay(f, "nearest"));
    }
  }, [categoriaId]);

  const loadRoster = useCallback(async () => {
    if (!categoriaId || !fecha) return;
    setLoading(true);

    const { data: jugadoresData } = await supabase
      .from("jugadores")
      .select("id, nombre, rut, estado, telefono_jugador, telefono_apoderado")
      .eq("categoria_id", categoriaId)
      .neq("estado", "DESACTIVADO")
      .order("nombre");

    if (!jugadoresData) {
      setLoading(false);
      return;
    }

    const sedeActual = sedes.find((s) => s.id === sedeId);
    const { data: sesion } = await supabase
      .from("sesiones_entrenamiento")
      .select("id")
      .eq("categoria_id", categoriaId)
      .eq("fecha", fecha)
      .maybeSingle();

    let asistenciaMap: Record<
      string,
      { marca: MarcaAsistencia; id: string }
    > = {};

    if (sesion) {
      const { data: marcas } = await supabase
        .from("asistencia")
        .select("id, jugador_id, marca")
        .eq("sesion_id", sesion.id);

      if (marcas) {
        marcas.forEach((m) => {
          asistenciaMap[m.jugador_id] = {
            marca: m.marca as MarcaAsistencia,
            id: m.id,
          };
        });
      }
    }

    const roster: JugadorAsistencia[] = jugadoresData.map((j) => ({
      jugador_id: j.id,
      nombre: j.nombre,
      rut: j.rut,
      estado: j.estado,
      telefono_jugador: j.telefono_jugador,
      telefono_apoderado: j.telefono_apoderado,
      marca: asistenciaMap[j.id]?.marca ?? "F",
      asistencia_id: asistenciaMap[j.id]?.id ?? null,
    }));

    setJugadores(roster);
    setDirty(false);
    setLoading(false);
  }, [categoriaId, fecha, sedeId, sedes, supabase]);

  useEffect(() => {
    if (categoriaId && fecha) loadRoster();
  }, [categoriaId, fecha, loadRoster]);

  function setMarca(jugadorId: string, marca: MarcaAsistencia) {
    setJugadores((prev) =>
      prev.map((j) =>
        j.jugador_id === jugadorId ? { ...j, marca } : j
      )
    );
    setDirty(true);
  }

  async function guardar(): Promise<boolean> {
    if (!categoriaId || !fecha) return false;
    setSaving(true);

    let sesionId: string;
    const { data: sesionExistente } = await supabase
      .from("sesiones_entrenamiento")
      .select("id")
      .eq("categoria_id", categoriaId)
      .eq("fecha", fecha)
      .maybeSingle();

    if (sesionExistente) {
      sesionId = sesionExistente.id;
    } else {
      const { data: nuevaSesion, error } = await supabase
        .from("sesiones_entrenamiento")
        .insert({
          fecha,
          sede_id: sedeId,
          categoria_id: categoriaId,
        })
        .select("id")
        .single();

      if (error || !nuevaSesion) {
        setSaving(false);
        return false;
      }
      sesionId = nuevaSesion.id;
    }

    const upserts = jugadores.map((j) => ({
      sesion_id: sesionId,
      jugador_id: j.jugador_id,
      marca: j.marca,
    }));

    const { error } = await supabase.from("asistencia").upsert(upserts, {
      onConflict: "sesion_id,jugador_id",
    });

    setSaving(false);

    if (!error) {
      setDirty(false);
      await loadRoster();
      return true;
    }
    return false;
  }

  const resumen = {
    total: jugadores.length,
    ok: jugadores.filter((j) => j.marca === "OK").length,
    f: jugadores.filter((j) => j.marca === "F").length,
    j: jugadores.filter((j) => j.marca === "J").length,
    l: jugadores.filter((j) => j.marca === "L").length,
  };

  return {
    sedes,
    categorias: categoriasFiltered,
    sedeId,
    setSedeId,
    categoriaId,
    setCategoriaId,
    fecha,
    setFecha,
    diasEntrenamiento,
    fechaAnterior,
    fechaSiguiente,
    jugadores,
    loading,
    saving,
    dirty,
    setMarca,
    guardar,
    resumen,
  };
}
