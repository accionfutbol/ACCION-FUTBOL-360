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

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lcSede } = await admin
    .from("sedes").select("id").eq("nombre", "LAS CONDES").single();
  if (!lcSede) return NextResponse.json({ error: "LAS CONDES not found" }, { status: 500 });

  const categoriasAMover = ["FEMENINO", "SENIOR AM", "SENIOR PM", "PRO ELITE", "PROYECCION"];
  const results: Record<string, string> = {};

  for (const nombre of categoriasAMover) {
    // Find the category (currently under PEÑALOLÉN)
    const { data: cat } = await admin
      .from("categorias")
      .select("id, sede_id")
      .eq("nombre", nombre)
      .single();

    if (!cat) {
      results[nombre] = "No encontrada";
      continue;
    }

    if (cat.sede_id === lcSede.id) {
      results[nombre] = "Ya está en LAS CONDES";
      continue;
    }

    // Move category to LAS CONDES and re-activate
    const { error: catError } = await admin
      .from("categorias")
      .update({ sede_id: lcSede.id, activa: true })
      .eq("id", cat.id);

    if (catError) {
      results[nombre] = "Error cat: " + catError.message;
      continue;
    }

    // Move jugadores to LAS CONDES sede
    const { error: jugError, count } = await admin
      .from("jugadores")
      .update({ sede_id: lcSede.id })
      .eq("categoria_id", cat.id);

    results[nombre] = jugError
      ? "Cat movida, error jugadores: " + jugError.message
      : `Movida a LAS CONDES (${count ?? "?"} jugadores actualizados)`;
  }

  return NextResponse.json({ lcSedeId: lcSede.id, results });
}
