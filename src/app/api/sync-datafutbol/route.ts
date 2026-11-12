import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SPREADSHEET_ID = "196dXsAPdaJIQEnBV5ieI51kaGfWzhCxHCZJULN6np7M";
const SHEET_RANGE = "Base!A4:BL1800";
const BATCH_SIZE = 200;

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

function clampNota(val: number | null): number | null {
  if (val == null) return null;
  if (val < 1) return null;
  if (val > 7) return 7;
  return Math.round(val * 10) / 10;
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

export const maxDuration = 60;

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

  const { data: sedes } = await supabase.from("sedes").select("id, nombre");
  const { data: categorias } = await supabase.from("categorias").select("id, sede_id, nombre");

  const sedeByName = new Map<string, string>();
  (sedes ?? []).forEach((s: any) => sedeByName.set(s.nombre.toUpperCase(), s.id));

  const catKey = (sedeId: string, catName: string) => `${sedeId}||${catName.toUpperCase()}`;
  const catMap = new Map<string, string>();
  (categorias ?? []).forEach((c: any) => catMap.set(catKey(c.sede_id, c.nombre), c.id));

  // --- Phase 1: Create missing categories (few, so individual calls are fine) ---
  const missingCats = new Set<string>();
  for (const row of rows) {
    const sedeRaw = (row[9] || "").toUpperCase().trim();
    const sedeName = SEDE_MAP[sedeRaw] || sedeRaw;
    const sedeId = sedeByName.get(sedeName);
    if (!sedeId) continue;
    let catRaw = (row[11] || "").trim();
    if (!catRaw || catRaw === "N/A" || catRaw === "#N/A") catRaw = "SIN CATEGORÍA";
    if (!catMap.get(catKey(sedeId, catRaw))) {
      missingCats.add(`${sedeId}||${catRaw}`);
    }
  }

  for (const key of missingCats) {
    const [sedeId, catName] = key.split("||");
    const { data: newCat } = await supabase
      .from("categorias")
      .upsert({ sede_id: sedeId, nombre: catName, activa: true }, { onConflict: "sede_id,nombre" })
      .select("id")
      .single();
    if (newCat) {
      catMap.set(catKey(sedeId, catName), newCat.id);
    }
  }

  // --- Phase 2: Build all jugador records, then batch upsert ---
  const jugadorBatch: Record<string, unknown>[] = [];
  const rutToRowIdx = new Map<string, number>();
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rut = (row[0] || "").trim();
    const nombre = (row[1] || "").trim();
    if (!nombre) continue;

    const sedeRaw = (row[9] || "").toUpperCase().trim();
    const sedeName = SEDE_MAP[sedeRaw] || sedeRaw;
    const sedeId = sedeByName.get(sedeName);
    if (!sedeId) { skipped++; continue; }

    let catRaw = (row[11] || "").trim();
    if (!catRaw || catRaw === "N/A" || catRaw === "#N/A") catRaw = "SIN CATEGORÍA";
    const categoriaId = catMap.get(catKey(sedeId, catRaw));
    if (!categoriaId) { skipped++; continue; }

    const jugadorRut = rut || `SIN-RUT-${nombre.replace(/\s+/g, "-").substring(0, 30)}`;
    const estadoMes = normalizeEstadoMes(row[3]);
    const numMorosidad = parseNum(row[5] || "");

    const rec: Record<string, unknown> = {
      rut: jugadorRut,
      nombre,
      estado: normalizeEstado(row[2]),
      sede_id: sedeId,
      categoria_id: categoriaId,
      fecha_nacimiento: parseDate(row[6] || ""),
      posicion_principal: (row[20] || "").trim() || null,
      pie_dominante: (row[21] || "").trim() || null,
      email_jugador: (row[22] || "").trim() || null,
      telefono_jugador: (row[23] || "").trim() || null,
      telefono_apoderado: (row[25] || "").trim() || null,
      nombre_apoderado: (row[24] || "").trim() || null,
      email_apoderado: (row[26] || "").trim() || null,
      pago_mensual: (row[4] || "").trim() || null,
      numero_morosidad: numMorosidad != null ? Math.max(0, Math.round(numMorosidad)) : 0,
      tipo: (row[10] || "").trim() || null,
      nivel: (row[12] || "").trim() || null,
      subnivel: (row[13] || "").trim() || null,
      anio_nacimiento: (() => { const n = parseNum(row[7] || ""); return n != null ? Math.round(n) : null; })(),
      poleron: (row[40] || "").trim() || null,
      uniforme_negro: (row[41] || "").trim() || null,
      uniforme_rosado: (row[42] || "").trim() || null,
    };
    if (estadoMes) rec.estado_mes = estadoMes;

    jugadorBatch.push(rec);
    rutToRowIdx.set(jugadorRut, i);
  }

  // Deduplicate by rut (keep last occurrence)
  const dedupMap = new Map<string, Record<string, unknown>>();
  for (const rec of jugadorBatch) {
    dedupMap.set(rec.rut as string, rec);
  }
  const dedupBatch = Array.from(dedupMap.values());

  // Batch upsert jugadores in chunks
  const upsertedMap = new Map<string, string>(); // rut -> id
  for (let i = 0; i < dedupBatch.length; i += BATCH_SIZE) {
    const chunk = dedupBatch.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("jugadores")
      .upsert(chunk, { onConflict: "rut" })
      .select("id, rut");

    if (error) {
      errors.push(`Batch jugadores ${i}-${i + chunk.length}: ${error.message}`);
      continue;
    }
    (data ?? []).forEach((j: any) => upsertedMap.set(j.rut, j.id));
  }

  // --- Phase 3: Batch upsert eval_fisicas ---
  const today = new Date().toISOString().slice(0, 10);
  const evalFisicaBatch: Record<string, unknown>[] = [];

  for (const [rut, jugadorId] of upsertedMap) {
    const rowIdx = rutToRowIdx.get(rut);
    if (rowIdx == null) continue;
    const row = rows[rowIdx];

    const salto = parseNum(row[53] || "");
    const vel30m = parseNum(row[55] || "");
    const ift = parseNum(row[57] || "");
    const altura = parseNum(row[59] || "");
    const peso = parseNum(row[60] || "");
    const imc = parseNum(row[61] || "");
    const gc = parseNum(row[62] || "");

    if (salto != null || vel30m != null || ift != null || altura != null || peso != null) {
      evalFisicaBatch.push({
        jugador_id: jugadorId,
        fecha: today,
        salto, velocidad_30m: vel30m, ift, altura, peso, imc, grasa_corporal: gc,
      });
    }
  }

  for (let i = 0; i < evalFisicaBatch.length; i += BATCH_SIZE) {
    const chunk = evalFisicaBatch.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("eval_fisicas")
      .upsert(chunk, { onConflict: "jugador_id,fecha" });
    if (error) errors.push(`Batch eval_fisicas ${i}: ${error.message}`);
  }

  // --- Phase 4: Batch upsert evaluaciones ---
  const semestre = new Date().getMonth() < 6 ? 1 : 2;
  const anio = new Date().getFullYear();
  const evalBatch: Record<string, unknown>[] = [];

  for (const [rut, jugadorId] of upsertedMap) {
    const rowIdx = rutToRowIdx.get(rut);
    if (rowIdx == null) continue;
    const row = rows[rowIdx];

    const notaTec = clampNota(parseNum(row[63] || ""));
    const notaFis = clampNota(parseNum(row[64] || ""));
    const notaAct = clampNota(parseNum(row[65] || ""));
    let promedio = clampNota(parseNum(row[66] || ""));
    if (promedio == null) {
      const vals = [notaTec, notaFis, notaAct].filter((v): v is number => v != null);
      if (vals.length > 0) {
        promedio = Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10;
      }
    }

    if (notaTec != null || notaFis != null || notaAct != null) {
      evalBatch.push({
        jugador_id: jugadorId, semestre, anio,
        nota_tecnica: notaTec, nota_fisica: notaFis, nota_actitudinal: notaAct, promedio,
      });
    }
  }

  for (let i = 0; i < evalBatch.length; i += BATCH_SIZE) {
    const chunk = evalBatch.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("evaluaciones")
      .upsert(chunk, { onConflict: "jugador_id,semestre,anio" });
    if (error) errors.push(`Batch evaluaciones ${i}: ${error.message}`);
  }

  // --- Phase 5: Sync uniformes from spreadsheet columns ---
  const UNIFORM_COLS: { col: number; tipo: string }[] = [
    { col: 40, tipo: "POLERON" },
    { col: 41, tipo: "NEGRO" },
    { col: 42, tipo: "ROSADO" },
  ];

  const allJugadorIds = Array.from(upsertedMap.values());
  const { data: existingUnis } = await supabase
    .from("uniformes")
    .select("jugador_id, tipo")
    .in("jugador_id", allJugadorIds.slice(0, 1000));
  const { data: existingUnis2 } = allJugadorIds.length > 1000
    ? await supabase.from("uniformes").select("jugador_id, tipo").in("jugador_id", allJugadorIds.slice(1000))
    : { data: [] };

  const existingSet = new Set<string>();
  [...(existingUnis ?? []), ...(existingUnis2 ?? [])].forEach((u: any) => {
    existingSet.add(`${u.jugador_id}||${u.tipo}`);
  });

  const uniformeBatch: Record<string, unknown>[] = [];
  for (const [rut, jugadorId] of upsertedMap) {
    const rowIdx = rutToRowIdx.get(rut);
    if (rowIdx == null) continue;
    const row = rows[rowIdx];

    for (const uc of UNIFORM_COLS) {
      const val = (row[uc.col] || "").trim().toUpperCase();
      if (val && val !== "NO" && val !== "N/A" && val !== "#N/A" && val !== "-") {
        const key = `${jugadorId}||${uc.tipo}`;
        if (!existingSet.has(key)) {
          uniformeBatch.push({
            jugador_id: jugadorId,
            tipo: uc.tipo,
            talla: val === "SI" || val === "SÍ" || val === "OK" ? null : val,
            entregado: true,
            fecha_entrega: today,
          });
          existingSet.add(key);
        }
      }
    }
  }

  for (let i = 0; i < uniformeBatch.length; i += BATCH_SIZE) {
    const chunk = uniformeBatch.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("uniformes").insert(chunk);
    if (error) errors.push(`Batch uniformes ${i}: ${error.message}`);
  }

  return NextResponse.json({
    ok: true,
    total_filas: rows.length,
    jugadores_unicos: dedupBatch.length,
    actualizados: upsertedMap.size,
    omitidos: skipped,
    duplicados: jugadorBatch.length - dedupBatch.length,
    errores: errors.length,
    detalle_errores: errors.slice(0, 50),
    eval_fisicas: evalFisicaBatch.length,
    evaluaciones: evalBatch.length,
    uniformes: uniformeBatch.length,
    timestamp: new Date().toISOString(),
  });
}
