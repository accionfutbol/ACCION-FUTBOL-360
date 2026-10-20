import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PASSWORD = "AccionFutbol2026!";

interface EntrenadorDef {
  nombre: string;
  email: string;
  rol: "DT" | "ASISTENTE" | "PF";
  roleProfile: "entrenador" | "admin";
  categorias: { sede: string; categoria: string }[];
  todasLasSedes?: string[];
}

const ENTRENADORES: EntrenadorDef[] = [
  {
    nombre: "Christian Labra",
    email: "christian.labra@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [{ sede: "PEÑALOLEN", categoria: "SUB-14" }],
  },
  {
    nombre: "Sebastián Mardones",
    email: "sebastian.mardones@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [
      { sede: "PEÑALOLEN", categoria: "SUB-18" },
      { sede: "MAIPU", categoria: "SUB-16" },
    ],
  },
  {
    nombre: "Marcelo Negretti",
    email: "marcelo.negretti@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [
      { sede: "PEÑALOLEN", categoria: "SUB-16 A.R" },
      { sede: "PEÑALOLEN", categoria: "SUB-16 COMP" },
      { sede: "LAS CONDES", categoria: "SUB-16 A.R" },
    ],
  },
  {
    nombre: "Gonzalo Opazo",
    email: "gonzalo.opazo@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [
      { sede: "LAS CONDES", categoria: "SUB-18 COMP" },
      { sede: "LAS CONDES", categoria: "SUB-18 A.R" },
    ],
    todasLasSedes: ["LAS CONDES"],
  },
  {
    nombre: "Nicolas Arancibia",
    email: "nicolas.arancibia@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [
      { sede: "LAS CONDES", categoria: "SUB-14" },
      { sede: "LAS CONDES", categoria: "SUB-16 COMP" },
    ],
  },
  {
    nombre: "Rodrigo Gonzalez",
    email: "rodrigo.gonzalez@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [{ sede: "MAIPU", categoria: "SUB-16" }],
  },
  {
    nombre: "Alexis Arancibia",
    email: "alexis.arancibia@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [{ sede: "LA FLORIDA", categoria: "SUB-16" }],
  },
  {
    nombre: "Jose Almuna",
    email: "jose.almuna@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [{ sede: "LA FLORIDA", categoria: "SUB-16" }],
  },
  {
    nombre: "Luis Vargas",
    email: "luis.vargas@accionfutbol.cl",
    rol: "DT",
    roleProfile: "entrenador",
    categorias: [
      { sede: "LAS CONDES", categoria: "KIDS" },
    ],
    todasLasSedes: ["LAS CONDES"],
  },
  {
    nombre: "Camilo Boss",
    email: "camilo.boss@accionfutbol.cl",
    rol: "DT",
    roleProfile: "admin",
    categorias: [],
    todasLasSedes: ["PEÑALOLEN", "LA FLORIDA", "MAIPU"],
  },
  {
    nombre: "Ignacio Lopez",
    email: "ignacio.lopez@accionfutbol.cl",
    rol: "DT",
    roleProfile: "admin",
    categorias: [],
    todasLasSedes: ["PEÑALOLEN", "LAS CONDES", "LA FLORIDA", "MAIPU"],
  },
];

export async function POST() {
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await serverSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Not admin" }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY in env" }, { status: 500 });

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: sedesData } = await adminSupabase.from("sedes").select("id, nombre");
  if (!sedesData) return NextResponse.json({ error: "No sedes" }, { status: 500 });
  const sedeMap = Object.fromEntries(sedesData.map((s) => [s.nombre, s.id]));

  const { data: catsData } = await adminSupabase.from("categorias").select("id, nombre, sede_id");
  if (!catsData) return NextResponse.json({ error: "No categorias" }, { status: 500 });

  const catMap = new Map<string, string>();
  const catsBySede = new Map<string, string[]>();
  for (const c of catsData) {
    const sedeName = sedesData.find((s) => s.id === c.sede_id)?.nombre ?? "";
    catMap.set(`${sedeName}||${c.nombre}`, c.id);
    if (!catsBySede.has(sedeName)) catsBySede.set(sedeName, []);
    catsBySede.get(sedeName)!.push(c.id);
  }

  const results: Record<string, { ok: boolean; userId?: string; entrenadorId?: string; categoriasAsignadas?: number; error?: string }> = {};

  for (const e of ENTRENADORES) {
    try {
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: e.email,
        password: PASSWORD,
        email_confirm: true,
      });

      if (authError) {
        results[e.email] = { ok: false, error: `Auth: ${authError.message}` };
        continue;
      }

      const userId = authData.user.id;

      await adminSupabase.from("profiles").update({ role: e.roleProfile, nombre: e.nombre }).eq("id", userId);

      const { data: entRow, error: entError } = await adminSupabase.from("entrenadores").insert({
        nombre: e.nombre,
        email: e.email,
        rol: e.rol,
        user_id: userId,
      }).select("id").single();

      if (entError) {
        results[e.email] = { ok: false, userId, error: `Entrenador insert: ${entError.message}` };
        continue;
      }

      const catIds = new Set<string>();

      for (const c of e.categorias) {
        const catId = catMap.get(`${c.sede}||${c.categoria}`);
        if (catId) catIds.add(catId);
      }

      if (e.todasLasSedes) {
        for (const sedeName of e.todasLasSedes) {
          const sedeCats = catsBySede.get(sedeName) ?? [];
          for (const cid of sedeCats) catIds.add(cid);
        }
      }

      if (catIds.size > 0) {
        const { error: ecError } = await adminSupabase.from("entrenador_categoria").insert(
          Array.from(catIds).map((cid) => ({ entrenador_id: entRow.id, categoria_id: cid }))
        );
        if (ecError) {
          results[e.email] = { ok: true, userId, entrenadorId: entRow.id, categoriasAsignadas: 0, error: `Cat link: ${ecError.message}` };
          continue;
        }
      }

      results[e.email] = { ok: true, userId, entrenadorId: entRow.id, categoriasAsignadas: catIds.size };
    } catch (err) {
      results[e.email] = { ok: false, error: String(err) };
    }
  }

  return NextResponse.json({ results, password: PASSWORD });
}
