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

  const results: Record<string, string> = {};

  // 1. Delete Miguel Negretti completely
  const { data: miguel } = await adminSupabase
    .from("entrenadores").select("id, user_id").eq("email", "miguel.negretti@accionfutbol.cl").single();

  if (miguel) {
    await adminSupabase.from("entrenador_categoria").delete().eq("entrenador_id", miguel.id);
    await adminSupabase.from("entrenadores").delete().eq("id", miguel.id);
    await adminSupabase.from("profiles").delete().eq("id", miguel.user_id);
    const { error } = await adminSupabase.auth.admin.deleteUser(miguel.user_id);
    results["miguel.negretti"] = error ? "Auth delete error: " + error.message : "Eliminado completamente";
  } else {
    results["miguel.negretti"] = "No encontrado";
  }

  // 2. Add Marcelo Negretti to KIDS
  const { data: sede } = await adminSupabase.from("sedes").select("id").eq("nombre", "LAS CONDES").single();
  const { data: kidsCategory } = await adminSupabase
    .from("categorias").select("id").eq("sede_id", sede!.id).eq("nombre", "KIDS").single();

  const { data: marcelo } = await adminSupabase
    .from("entrenadores").select("id").eq("email", "marcelo.negretti@accionfutbol.cl").single();

  if (marcelo && kidsCategory) {
    const { error } = await adminSupabase.from("entrenador_categoria")
      .upsert({ entrenador_id: marcelo.id, categoria_id: kidsCategory.id }, { onConflict: "entrenador_id,categoria_id" });
    results["marcelo.negretti"] = error ? error.message : "KIDS agregado";
  } else {
    results["marcelo.negretti"] = "No encontrado";
  }

  return NextResponse.json({ results });
}
