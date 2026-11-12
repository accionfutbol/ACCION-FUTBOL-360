import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const fixes = [
    { old: "MAIPU", new: "MAIPÚ" },
    { old: "PEÑALOLEN", new: "PEÑALOLÉN" },
  ];

  const results: string[] = [];

  for (const fix of fixes) {
    const { data, error } = await supabase
      .from("sedes")
      .update({ nombre: fix.new })
      .eq("nombre", fix.old)
      .select("id, nombre");

    if (error) {
      results.push(`Error ${fix.old} → ${fix.new}: ${error.message}`);
    } else if (data && data.length > 0) {
      results.push(`OK: ${fix.old} → ${fix.new} (${data.length} sede actualizada)`);
    } else {
      results.push(`Sin cambios: ${fix.old} (ya estaba correcta o no existe)`);
    }
  }

  const { data: sedes } = await supabase.from("sedes").select("id, nombre").order("nombre");

  return NextResponse.json({ ok: true, results, sedes_actuales: sedes });
}
