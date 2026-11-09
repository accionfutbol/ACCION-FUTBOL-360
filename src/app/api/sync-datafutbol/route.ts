import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SPREADSHEET_ID = "196dXsAPdaJIQEnBV5ieI51kaGfWzhCxHCZJULN6np7M";
const SHEET_RANGE = "Base!A4:BL1800";

const VALID_ESTADOS = ["ACTIVO", "FULL", "NEW", "LESIONADO", "DESACTIVADO", "BECADO"];

const SEDE_MAP: Record<string, string> = {
  "LAS CONDES": "LAS CONDES",
  "LA FLORIDA": "LA FLORIDA",
  "PEÑALOLÉN": "PEÑALOLÉN",
  "PEÑALOLEN": "PEÑALOLÉN",
  "MAIPÚ": "MAIPÚ",
  "MAIPU": "MAIPÚ",
};

function parseDate(raw: string): string | null {
  if (!raw || raw === "#N/A" || raw === "N/A") return null;
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseNum(raw: string): number | null {
  if (!raw || raw === "#N/A" || raw === "N/A" || raw === "#DIV/0!" || raw === "SIN DATA" || raw === "") return null;
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? null : n;
}

function normalizeEstado(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  if (VALID_ESTADOS.includes(upper)) return upper;
  if (upper === "NO CIERRE" || upper === "DESACTIVAR") return "DESACTIVADO";
  return "DESACTIVADO";
}

function normalizeEstadoMes(raw: string): string | null {
  const upper = (raw || "").toUpperCase().trim();
  if (upper === "SEGURO") return "SEGURO";
  if (upper === "INSEGURO") return "INSEGURO";
  if (upper === "OUT") return "OUT";
  return null;
}

export async function POST() {
  // Auth check: only admin
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  // Service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Read Google Sheets
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_API_KEY no configurada" }, { status: 500 });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${apiKey}`;
  const sheetsRes = await fetch(url);
  if (!sheetsRes.ok) {
    const text = await sheetsRes.text();
    return NextResponse.json({ error: "Error leyendo Google Sheets", detail: text }, { status: 502 });
  }
  const sheetsData = await sheetsRes.json();
  const rows: string[][] = sheetsData.values || [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "Sin datos en la planilla" }, { status: 400 });
  }

  // Load sedes and categorias for FK lookups
  const { data: sedes } = await supabase.from("sedes").select("id, nombre");
  const { data: categorias } = await supabase.from("categorias").select("id, sede_id, nombre");

  const sedeByName = new Map<string, string>();
  (sedes ?? []).forEach((s: any) => sedeByName.set(s.nombre.toUpperCase(), s.id));

  const catKey = (sedeId: string, catName: string) => `${sedeId}||${catName.toUpperCase()}`;
  const catMap = new Map<string, string>();
  (categorias ?? []).forEach((c: any) => catMap.set(catKey(c.sede_id, c.nombre), c.id));

  // Find a default categoria for fallback
  const { data: defaultCat } = await supabase
    .from("categorias")
    .select("id")
    .limit(1)
    .single();

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const rut = (row[0] || "").trim();
    const nombre = (row[1] || "").trim();
    if (!nombre) continue;

    // Skip rows without name
    const estadoGen = normalizeEstado(row[2]);
    const estadoMes = normalizeEstadoMes(row[3]);
    const pagoMensual = (row[4] || "").trim() || null;
    const numMorosidad = parseNum(row[5] || "");
    const fechaNac = parseDate(row[6] || "");
    const anioNac = parseNum(row[7] || "");
    const sedeRaw = (row[9] || "").toUpperCase().trim();
    const tipo = (row[10] || "").trim() || null;
    const catRaw = (row[11] || "").trim();
    const nivel = (row[12] || "").trim() || null;
    const subnivel = (row[13] || "").trim() || null;
    const posicion = (row[20] || "").trim() || null;
    const pie = (row[21] || "").trim() || null;
    const emailJug = (row[22] || "").trim() || null;
    const telJug = (row[23] || "").trim() || null;
    const nombreApo = (row[24] || "").trim() || null;
    const telApo = (row[25] || "").trim() || null;
    const emailApo = (row[26] || "").trim() || null;

    // Uniformes (cols AO=40, AP=41, AQ=42)
    const poleron = (row[40] || "").trim() || null;
    const uniformeNegro = (row[41] || "").trim() || null;
    const uniformeRosado = (row[42] || "").trim() || null;

    // Resolve sede
    const sedeName = SEDE_MAP[sedeRaw] || sedeRaw;
    const sedeId = sedeByName.get(sedeName);
    if (!sedeId) {
      skipped++;
      continue;
    }

    // Resolve categoria
    let categoriaId = catMap.get(catKey(sedeId, catRaw));
    if (!categoriaId) {
      // Try creating the category
      if (catRaw && catRaw !== "N/A" && catRaw !== "#N/A") {
        const { data: newCat, error: catErr } = await supabase
          .from("categorias")
          .upsert({ sede_id: sedeId, nombre: catRaw, activa: true }, { onConflict: "sede_id,nombre" })
          .select("id")
          .single();
        if (newCat) {
          categoriaId = newCat.id;
          catMap.set(catKey(sedeId, catRaw), newCat.id);
        }
      }
      if (!categoriaId) categoriaId = defaultCat?.id;
    }

    if (!categoriaId) {
      errors.push(`${nombre}: sin categoría`);
      skipped++;
      continue;
    }

    // Build jugador record
    const jugadorRut = rut || `SIN-RUT-${nombre.replace(/\s+/g, "-").substring(0, 30)}`;

    const jugadorData: Record<string, unknown> = {
      rut: jugadorRut,
      nombre,
      estado: estadoGen,
      sede_id: sedeId,
      categoria_id: categoriaId,
      fecha_nacimiento: fechaNac,
      posicion_principal: posicion,
      pie_dominante: pie,
      email_jugador: emailJug,
      telefono_jugador: telJug,
      telefono_apoderado: telApo,
      nombre_apoderado: nombreApo,
      email_apoderado: emailApo,
      pago_mensual: pagoMensual,
      numero_morosidad: numMorosidad != null ? Math.max(0, Math.round(numMorosidad)) : 0,
      tipo,
      nivel,
      subnivel,
      anio_nacimiento: anioNac != null ? Math.round(anioNac) : null,
      poleron,
      uniforme_negro: uniformeNegro,
      uniforme_rosado: uniformeRosado,
    };

    if (estadoMes) {
      jugadorData.estado_mes = estadoMes;
    }

    // Upsert by RUT
    const { data: upserted, error: upsertErr } = await supabase
      .from("jugadores")
      .upsert(jugadorData, { onConflict: "rut" })
      .select("id")
      .single();

    if (upsertErr) {
      errors.push(`${nombre} (${jugadorRut}): ${upsertErr.message}`);
      continue;
    }

    // Sync eval_fisicas if data exists (cols BB=53, BD=55, BF=57, BH=59, BI=60, BJ=61, BK=62)
    const salto = parseNum(row[53] || "");
    const vel30m = parseNum(row[55] || "");
    const ift = parseNum(row[57] || "");
    const altura = parseNum(row[59] || "");
    const peso = parseNum(row[60] || "");
    const imc = parseNum(row[61] || "");
    const gc = parseNum(row[62] || "");

    const hasEvalFisica = salto != null || vel30m != null || ift != null || altura != null || peso != null;

    if (hasEvalFisica && upserted) {
      const evalData: Record<string, unknown> = {
        jugador_id: upserted.id,
        fecha: new Date().toISOString().slice(0, 10),
        salto,
        velocidad_30m: vel30m,
        ift,
        altura,
        peso,
        imc,
        grasa_corporal: gc,
      };

      await supabase
        .from("eval_fisicas")
        .upsert(evalData, { onConflict: "jugador_id,fecha" })
        .select("id");
    }

    // Sync evaluaciones (cols BH2=63..., actually BL=63, BM=64, BN=65, BO=66 based on the header)
    // Headers show: TECNICA-TACTICA (col 63), FISICA (64), ACTITUDINAL (65), PROMEDIO (66)
    const notaTec = parseNum(row[63] || "");
    const notaFis = parseNum(row[64] || "");
    const notaAct = parseNum(row[65] || "");
    const promedio = parseNum(row[66] || "");

    const hasEval = notaTec != null || notaFis != null || notaAct != null;

    if (hasEval && upserted) {
      const evalTecData: Record<string, unknown> = {
        jugador_id: upserted.id,
        semestre: new Date().getMonth() < 6 ? 1 : 2,
        anio: new Date().getFullYear(),
        nota_tecnica: notaTec,
        nota_fisica: notaFis,
        nota_actitudinal: notaAct,
        promedio,
      };

      await supabase
        .from("evaluaciones")
        .upsert(evalTecData, { onConflict: "jugador_id,semestre,anio" })
        .select("id");
    }

    updated++;
  }

  return NextResponse.json({
    ok: true,
    total_filas: rows.length,
    actualizados: updated,
    omitidos: skipped,
    errores: errors.length,
    detalle_errores: errors.slice(0, 50),
    timestamp: new Date().toISOString(),
  });
}
