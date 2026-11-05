import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await serverSupabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Not admin" }, { status: 403 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: cats } = await adminSupabase
    .from("categorias").select("id, nombre, sede_id").eq("activa", true);
  const { data: jugadores } = await adminSupabase
    .from("jugadores").select("categoria_id");

  const jugPorCat = new Set((jugadores ?? []).map((j) => j.categoria_id));

  const sinJugadores = (cats ?? []).filter((c) => !jugPorCat.has(c.id));

  const idsDesactivar = sinJugadores.map((c) => c.id);

  if (idsDesactivar.length === 0) {
    return NextResponse.json({ message: "No hay categorías vacías", desactivadas: 0 });
  }

  const { error } = await adminSupabase
    .from("categorias")
    .update({ activa: false })
    .in("id", idsDesactivar);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: sedes } = await adminSupabase.from("sedes").select("id, nombre");
  const sedeMap = Object.fromEntries((sedes ?? []).map((s) => [s.id, s.nombre]));

  const detalle = sinJugadores.map((c) => `${sedeMap[c.sede_id]} → ${c.nombre}`);

  return NextResponse.json({
    desactivadas: idsDesactivar.length,
    detalle,
  });
}
