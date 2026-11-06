import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const lunes = new Date(now);
  lunes.setDate(now.getDate() - now.getDay() - 6);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const desde = fmt(lunes);
  const hasta = fmt(domingo);

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre, sede_id")
    .eq("activa", true);

  const { data: sedes } = await supabase.from("sedes").select("id, nombre");
  const sedeMap = new Map((sedes ?? []).map((s: any) => [s.id, s.nombre]));

  const { data: sesiones } = await supabase
    .from("sesiones_entrenamiento")
    .select("id, fecha, categoria_id")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const sesionIds = (sesiones ?? []).map((s: any) => s.id);

  let asistencias: any[] = [];
  if (sesionIds.length > 0) {
    const { data } = await supabase
      .from("asistencia")
      .select("sesion_id, marca")
      .in("sesion_id", sesionIds);
    asistencias = data ?? [];
  }

  const sesionCatMap = new Map(
    (sesiones ?? []).map((s: any) => [s.id, s.categoria_id])
  );

  const reportePorCategoria: Record<
    string,
    { ok: number; f: number; j: number; l: number; sesiones: number }
  > = {};

  (categorias ?? []).forEach((c: any) => {
    reportePorCategoria[c.id] = { ok: 0, f: 0, j: 0, l: 0, sesiones: 0 };
  });

  (sesiones ?? []).forEach((s: any) => {
    if (reportePorCategoria[s.categoria_id]) {
      reportePorCategoria[s.categoria_id].sesiones++;
    }
  });

  asistencias.forEach((a: any) => {
    const catId = sesionCatMap.get(a.sesion_id);
    if (!catId || !reportePorCategoria[catId]) return;
    const r = reportePorCategoria[catId];
    if (a.marca === "OK") r.ok++;
    else if (a.marca === "F") r.f++;
    else if (a.marca === "J") r.j++;
    else if (a.marca === "L") r.l++;
  });

  const resumen = (categorias ?? []).map((c: any) => {
    const r = reportePorCategoria[c.id];
    const total = r.ok + r.f + r.j + r.l;
    return {
      categoria: c.nombre,
      sede: sedeMap.get(c.sede_id) ?? "",
      sesiones: r.sesiones,
      total_marcas: total,
      asistencia: total > 0 ? Math.round((r.ok / total) * 100) : 0,
      faltas: r.f,
      justificadas: r.j,
      lesionados: r.l,
    };
  });

  const reporteTexto = resumen
    .filter((r) => r.sesiones > 0)
    .map(
      (r) =>
        `${r.sede} — ${r.categoria}: ${r.sesiones} sesiones, ${r.asistencia}% asistencia, ${r.faltas} faltas, ${r.justificadas} justificadas`
    )
    .join("\n");

  await supabase.from("comunicaciones").insert({
    titulo: `Reporte Semanal ${desde} al ${hasta}`,
    contenido: reporteTexto || "Sin sesiones registradas esta semana.",
    tipo: "REPORTE",
    para_todos: false,
  });

  return new Response(
    JSON.stringify({
      periodo: `${desde} — ${hasta}`,
      categorias: resumen.filter((r) => r.sesiones > 0),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
