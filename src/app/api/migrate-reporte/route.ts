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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const sql = `
    ALTER TABLE sesiones_entrenamiento
      ADD COLUMN IF NOT EXISTS jugadores_no_inscritos JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS entrenador_nombre TEXT;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'sesiones_entrenamiento'
        AND policyname = 'entrenador_update_sesiones'
      ) THEN
        CREATE POLICY "entrenador_update_sesiones" ON sesiones_entrenamiento
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM entrenador_categoria ec
              JOIN entrenadores e ON e.id = ec.entrenador_id
              WHERE e.user_id = auth.uid() AND ec.categoria_id = sesiones_entrenamiento.categoria_id
            )
          );
      END IF;
    END $$;
  `;

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });

  // Try direct SQL via pg_net or similar — but supabase-js doesn't support raw SQL
  // Instead, let's just try to select the column and report
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceKey);

  // Check if columns exist by trying to query them
  const { error: checkError } = await admin
    .from("sesiones_entrenamiento")
    .select("jugadores_no_inscritos, entrenador_nombre")
    .limit(0);

  if (checkError) {
    return NextResponse.json({
      status: "needs_migration",
      message: "Ejecuta este SQL en el SQL Editor de Supabase Dashboard",
      sql: sql.trim(),
    });
  }

  return NextResponse.json({ status: "ok", message: "Columnas ya existen" });
}
