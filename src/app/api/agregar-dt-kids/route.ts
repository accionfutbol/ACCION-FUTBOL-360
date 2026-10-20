import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await serverSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Not admin" }, { status: 403 });

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find KIDS category in LAS CONDES
  const { data: sede } = await adminSupabase.from("sedes").select("id").eq("nombre", "LAS CONDES").single();
  if (!sede) return NextResponse.json({ error: "Sede not found" }, { status: 500 });

  const { data: kidsCategory } = await adminSupabase
    .from("categorias").select("id").eq("sede_id", sede.id).eq("nombre", "KIDS").single();
  if (!kidsCategory) return NextResponse.json({ error: "KIDS category not found" }, { status: 500 });

  const results: Record<string, string> = {};

  // 1. Sebastián Mardones — already exists, add KIDS category
  const { data: mardones } = await adminSupabase
    .from("entrenadores").select("id").eq("email", "sebastian.mardones@accionfutbol.cl").single();
  if (mardones) {
    const { error } = await adminSupabase.from("entrenador_categoria")
      .upsert({ entrenador_id: mardones.id, categoria_id: kidsCategory.id }, { onConflict: "entrenador_id,categoria_id" });
    results["sebastian.mardones"] = error ? error.message : "KIDS agregado";
  } else {
    results["sebastian.mardones"] = "No encontrado";
  }

  // 2. Alexis Arancibia — already exists, add KIDS category
  const { data: alexis } = await adminSupabase
    .from("entrenadores").select("id").eq("email", "alexis.arancibia@accionfutbol.cl").single();
  if (alexis) {
    const { error } = await adminSupabase.from("entrenador_categoria")
      .upsert({ entrenador_id: alexis.id, categoria_id: kidsCategory.id }, { onConflict: "entrenador_id,categoria_id" });
    results["alexis.arancibia"] = error ? error.message : "KIDS agregado";
  } else {
    results["alexis.arancibia"] = "No encontrado";
  }

  // 3. Miguel Negretti — NEW, create everything
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: "miguel.negretti@accionfutbol.cl",
    password: "AccionFutbol2026!",
    email_confirm: true,
  });

  if (authError) {
    results["miguel.negretti"] = "Auth error: " + authError.message;
  } else {
    const userId = authData.user.id;
    await adminSupabase.from("profiles").update({ role: "entrenador", nombre: "Miguel Negretti" }).eq("id", userId);

    const { data: entRow, error: entError } = await adminSupabase.from("entrenadores").insert({
      nombre: "Miguel Negretti",
      email: "miguel.negretti@accionfutbol.cl",
      rol: "DT",
      user_id: userId,
    }).select("id").single();

    if (entError) {
      results["miguel.negretti"] = "Entrenador error: " + entError.message;
    } else {
      const { error } = await adminSupabase.from("entrenador_categoria")
        .insert({ entrenador_id: entRow.id, categoria_id: kidsCategory.id });
      results["miguel.negretti"] = error ? error.message : "Creado + KIDS asignado";
    }
  }

  return NextResponse.json({ kidsId: kidsCategory.id, results });
}
