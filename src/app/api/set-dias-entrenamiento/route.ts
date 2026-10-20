import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
const DIAS: Record<string, Record<string, number[]>> = {
  "PEÑALOLEN": {
    "SUB-14": [1, 4, 5],
    "SUB-16 A.R": [1, 4, 5],
    "SUB-16 COMP": [1, 4, 5],
    "SUB-18": [2, 4, 5],
    "SENIOR AM": [2, 4],
    "SENIOR PM": [1, 4],
    "FEMENINO": [1, 4],
  },
  "LA FLORIDA": {
    "SUB-16": [2, 4, 5],
  },
  "MAIPU": {
    "SUB-16": [1, 3, 5],
  },
  "LAS CONDES": {
    "SUB-18 COMP": [1, 3, 5],
    "SUB-18 A.R": [1, 3, 5],
    "SUB-16 COMP": [2, 4, 5],
    "SUB-16 A.R": [2, 4, 5],
    "SUB-14": [1, 3, 5],
    "KIDS": [6],
  },
};

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

  const { data: sedes } = await adminSupabase.from("sedes").select("id, nombre");
  const { data: cats } = await adminSupabase.from("categorias").select("id, nombre, sede_id");
  if (!sedes || !cats) return NextResponse.json({ error: "No data" }, { status: 500 });

  const sedeMap = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  const results: Record<string, string> = {};

  for (const cat of cats) {
    const sedeName = sedeMap[cat.sede_id];
    const dias = DIAS[sedeName]?.[cat.nombre];
    if (dias) {
      const { error } = await adminSupabase
        .from("categorias")
        .update({ dias_entrenamiento: dias })
        .eq("id", cat.id);
      results[`${sedeName} ${cat.nombre}`] = error ? error.message : `OK: [${dias}]`;
    }
  }

  return NextResponse.json({ results });
}
