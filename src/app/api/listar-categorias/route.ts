import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: sedes } = await supabase
    .from("sedes")
    .select("id, nombre, activa")
    .order("nombre");

  const { data: cats } = await supabase
    .from("categorias")
    .select("id, nombre, sede_id, activa, tipo")
    .order("nombre");

  const { data: jugadores } = await supabase
    .from("jugadores")
    .select("categoria_id");

  const jugPorCat: Record<string, number> = {};
  (jugadores ?? []).forEach((j) => {
    jugPorCat[j.categoria_id] = (jugPorCat[j.categoria_id] || 0) + 1;
  });

  const result = (sedes ?? []).map((s) => ({
    sede: s.nombre,
    sedeActiva: s.activa,
    categorias: (cats ?? [])
      .filter((c) => c.sede_id === s.id)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        activa: c.activa,
        jugadores: jugPorCat[c.id] || 0,
      })),
  }));

  return NextResponse.json(result);
}
