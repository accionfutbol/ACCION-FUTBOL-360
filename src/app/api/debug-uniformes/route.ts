import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SPREADSHEET_ID = "196dXsAPdaJIQEnBV5ieI51kaGfWzhCxHCZJULN6np7M";

export async function GET() {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check uniformes count
  const { count, error: countErr } = await supabase
    .from("uniformes")
    .select("*", { count: "exact", head: true });

  const { data: sample, error: sampleErr } = await supabase
    .from("uniformes")
    .select("id, jugador_id, tipo, talla, entregado, fecha_entrega")
    .limit(5);

  // Check spreadsheet columns 40-42 for a few rows
  const apiKey = process.env.GOOGLE_API_KEY;
  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("Base!A4:AQ10")}?key=${apiKey}`;
  const sheetsRes = await fetch(sheetUrl);
  const sheetsData = await sheetsRes.json();
  const rows = sheetsData.values || [];

  const sheetSample = rows.slice(0, 6).map((row: string[], i: number) => ({
    row: i + 4,
    rut: row[0],
    nombre: row[1],
    col40_poleron: row[40] || "(vacío)",
    col41_negro: row[41] || "(vacío)",
    col42_rosado: row[42] || "(vacío)",
  }));

  // Try inserting one test record to see if it works
  const { data: testJug } = await supabase
    .from("jugadores")
    .select("id, rut, nombre")
    .limit(1)
    .single();

  let testInsert = null;
  if (testJug) {
    const { data: ins, error: insErr } = await supabase
      .from("uniformes")
      .insert({
        jugador_id: testJug.id,
        tipo: "POLERON",
        talla: null,
        entregado: true,
        fecha_entrega: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    testInsert = { data: ins, error: insErr?.message, jugador: testJug.rut };

    // Clean up test record
    if (ins) {
      await supabase.from("uniformes").delete().eq("id", ins.id);
    }
  }

  return NextResponse.json({
    total_uniformes: count,
    count_error: countErr?.message,
    sample_error: sampleErr?.message,
    muestra: sample,
    sheet_sample: sheetSample,
    test_insert: testInsert,
  });
}
