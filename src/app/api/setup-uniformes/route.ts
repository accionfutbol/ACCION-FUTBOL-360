import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count, error } = await supabase
    .from("uniformes")
    .select("*", { count: "exact", head: true });

  if (error?.message?.includes("Could not find")) {
    return NextResponse.json({
      ok: false,
      tabla_existe: false,
      message: "La tabla 'uniformes' NO existe. Créala en el SQL Editor de Supabase.",
      sql_editor: "https://supabase.com/dashboard/project/mokilrdjmsvpjbrewaih/sql/new",
    });
  }

  return NextResponse.json({
    ok: true,
    tabla_existe: true,
    total_registros: count,
  });
}
