import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_ESTADOS = ["ACTIVO", "FULL", "NEW", "LESIONADO", "DESACTIVADO", "BECADO"];

function normalizeEstado(raw: string | undefined): string {
  if (!raw) return "NEW";
  const s = raw.trim().toUpperCase();
  if (VALID_ESTADOS.includes(s)) return s;
  if (["SIN ESTADO", "#N/A", ""].includes(s)) return "NEW";
  if (["NO CIERRE", "CIERRE", "RECESO"].includes(s)) return "DESACTIVADO";
  if (s === "REINTEGRO") return "ACTIVO";
  return "ACTIVO";
}

function normalizeTel(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let t = raw.trim();
  if (t === "#N/A" || t === "9" || t.length < 5 || t.startsWith("todavia")) return null;
  t = t.replace(/[\s\-()±]/g, "");
  if (t.startsWith("+56")) return t;
  if (t.startsWith("56") && t.length >= 11) return "+" + t;
  if (t.startsWith("9") && t.length >= 8) return "+56" + t;
  return t;
}

interface RawPlayer { rut?: string; nombre: string; estado?: string; tel_jug?: string; tel_apo?: string; }

const LC_SUB14: RawPlayer[] = [
  {nombre:"Agustin Felipe Lopez",estado:"ACTIVO"},
  {nombre:"Agustín Rodríguez Encina",estado:"ACTIVO"},
  {rut:"28908758-3",nombre:"Alan Arnal Aguilera",estado:"ACTIVO",tel_jug:"56986931539",tel_apo:"+56986931539"},
  {rut:"29136150-1",nombre:"Alejandro Martinez Bullain",estado:"LESIONADO",tel_jug:"56983255110",tel_apo:"+56983255110"},
  {rut:"24329207-7",nombre:"Amaro Collao",estado:"ACTIVO",tel_jug:"981428625",tel_apo:"981428624"},
  {rut:"24062325-0",nombre:"Aref Tala",estado:"ACTIVO",tel_jug:"56972864496",tel_apo:"56949226124"},
  {rut:"25019235-5",nombre:"Benjamin Castillo",estado:"ACTIVO",tel_jug:"56953181354",tel_apo:"+56953181354"},
  {nombre:"Benjamin Cote",estado:"ACTIVO"},
  {rut:"24314504-K",nombre:"Cristóbal Huerta Hernández",estado:"ACTIVO",tel_jug:"56966987767",tel_apo:"56967876499"},
  {nombre:"Daniel Nahun Altmann Toloza",estado:"ACTIVO"},
  {nombre:"Diego Nieto",estado:"ACTIVO"},
  {rut:"26613612-9",nombre:"Elias Rojas Cacho",estado:"ACTIVO",tel_jug:"+56920018284",tel_apo:"+56920018284"},
  {rut:"25048842-4",nombre:"Emiliano Jara",estado:"ACTIVO",tel_jug:"56998116918",tel_apo:"+568116918"},
  {rut:"24181844-6",nombre:"Esteban Salinas",estado:"ACTIVO",tel_jug:"56953024296",tel_apo:"56953024296"},
  {rut:"24174250-4",nombre:"Facundo Molina Salazar",estado:"ACTIVO",tel_jug:"56985070360",tel_apo:"56961912818"},
  {rut:"24534511-9",nombre:"Facundo Uribe Robles",estado:"ACTIVO",tel_jug:"56950119112",tel_apo:"+56950119112"},
  {rut:"25203742-K",nombre:"Gabriel Sauer",estado:"ACTIVO"},
  {rut:"100527815-1",nombre:"Gean Foreths Alvarado Mayta",estado:"ACTIVO",tel_jug:"56940800289",tel_apo:"56940800289"},
  {rut:"24216599-3",nombre:"Hernan Castillo Ruz",estado:"ACTIVO",tel_jug:"56950873495",tel_apo:"56950873495"},
  {nombre:"Iñaki Latorre Barros",estado:"ACTIVO"},
  {rut:"23929040-k",nombre:"Ismael Nadal",estado:"ACTIVO",tel_apo:"56985710557"},
  {nombre:"Joaquin Lima",estado:"ACTIVO"},
  {rut:"24565099-k",nombre:"José Castellanos Paillán",estado:"ACTIVO",tel_jug:"56942725705",tel_apo:"56942725705"},
  {nombre:"Jose Joaquin Leiva Pinto",estado:"ACTIVO"},
  {nombre:"Juan Bautista Chaparro",estado:"ACTIVO"},
  {rut:"24060675-5",nombre:"Juan Jose Alegria Flores",estado:"ACTIVO",tel_jug:"56932418716",tel_apo:"+56997794096"},
  {rut:"24459383-6",nombre:"Leo Vera Foresi",estado:"ACTIVO",tel_jug:"56957330303",tel_apo:"56992190517"},
  {rut:"23941752-3",nombre:"Lionel Miranda Araya",estado:"ACTIVO",tel_jug:"56966742735",tel_apo:"56939151969"},
  {nombre:"Luciano Vergara",estado:"ACTIVO"},
  {rut:"29159500-6",nombre:"Luis Galindo Ramos Medina",estado:"ACTIVO",tel_jug:"56926001610",tel_apo:"+56926001610"},
  {rut:"24225857-6",nombre:"Manuel Garayalde Burdese",estado:"ACTIVO",tel_jug:"56966768575",tel_apo:"+56966768575"},
  {rut:"26588721-k",nombre:"Marcus Ramirez Brito",estado:"ACTIVO",tel_jug:"56990742205",tel_apo:"+56990742205"},
  {rut:"23867133-7",nombre:"Martin Rodriguez Valdes",estado:"ACTIVO",tel_jug:"56958716951",tel_apo:"+56942116628"},
  {rut:"24972837-3",nombre:"Mateo Alvarez Melo",estado:"ACTIVO",tel_jug:"56988991758",tel_apo:"+56988991758"},
  {rut:"23988895-k",nombre:"Mateo Urrea Calderon",estado:"ACTIVO",tel_jug:"56965845260",tel_apo:"+56969196861"},
  {rut:"23910211-5",nombre:"Matías Ahumada Rodriguez",estado:"ACTIVO",tel_jug:"56927633568",tel_apo:"+56995994619"},
  {rut:"24278583-5",nombre:"Matias Cabrera",estado:"ACTIVO",tel_jug:"56938672766",tel_apo:"+56966450877"},
  {rut:"23864426-7",nombre:"Matias Epul Pastrian",estado:"ACTIVO",tel_jug:"956085456",tel_apo:"+56992034911"},
  {rut:"24408299-8",nombre:"Max Müller Aqueveque",estado:"ACTIVO"},
  {rut:"24264393-3",nombre:"Máximo Pizarro Errázuriz",estado:"ACTIVO",tel_jug:"56944684810",tel_apo:"56944684810"},
  {nombre:"Maximo Valladares Hidalgo",estado:"ACTIVO"},
  {nombre:"Michael Irira Ake",estado:"ACTIVO"},
  {nombre:"Nahuel Inostroza Alvial",estado:"NEW"},
  {rut:"24370462-6",nombre:"Nicolás Cuevas Diez",estado:"ACTIVO"},
  {nombre:"Octavio Cortes Diaz",estado:"ACTIVO"},
  {rut:"24175872-9",nombre:"Pedro Cabrera Rojas",estado:"ACTIVO",tel_jug:"+56965008427",tel_apo:"+56967796248"},
  {rut:"24216627-2",nombre:"Rafael Castillo Ruz",estado:"ACTIVO",tel_jug:"56950873495",tel_apo:"56950873495"},
  {rut:"4722468",nombre:"Ricardo Rendon Lacruz",estado:"ACTIVO",tel_jug:"56 9 3652 6459",tel_apo:"+56927451108"},
  {nombre:"Santiago Ibañez Olguin",estado:"ACTIVO"},
  {rut:"24050167-8",nombre:"Santiago Riquelme",estado:"LESIONADO",tel_jug:"56990156784",tel_apo:"+56990156784"},
  {rut:"24705350-6",nombre:"Santiago Romero Moraga",estado:"DESACTIVADO",tel_jug:"56945502061",tel_apo:"+56945444055"},
  {rut:"23988863-1",nombre:"Santiago Urrea",estado:"ACTIVO",tel_jug:"+56932454231",tel_apo:"+56969196861"},
  {nombre:"Saulson Joseph Joseph",estado:"ACTIVO"},
  {nombre:"Sebastian de Almada",estado:"ACTIVO"},
  {rut:"24296297-4",nombre:"Sebastian Fry",estado:"ACTIVO",tel_jug:"+56962316662",tel_apo:"982949167"},
  {rut:"24197306-9",nombre:"Vicente Argandoña",estado:"ACTIVO"},
];

const LC_KIDS: RawPlayer[] = [
  {nombre:"Abdiel Machado",estado:"ACTIVO"},
  {nombre:"Agustin Barriga",estado:"ACTIVO"},
  {rut:"27468958-7",nombre:"Agustin Cavallo",estado:"ACTIVO"},
  {nombre:"Agustin Felipe Lopez",estado:"ACTIVO"},
  {nombre:"Alan Arnal Aguilera",estado:"ACTIVO"},
  {rut:"26796260-K",nombre:"Alejandro Toledo",estado:"ACTIVO"},
  {nombre:"Amaro Fuenza",estado:"FULL"},
  {nombre:"Amaro Jorquera",estado:"FULL"},
  {rut:"25228536-9",nombre:"Andres Bustos Machuca",estado:"ACTIVO"},
  {rut:"24477952-2",nombre:"Arturo Petit",estado:"ACTIVO"},
  {rut:"25681578-8",nombre:"Bastian Berrios",estado:"ACTIVO"},
  {rut:"25546169-9",nombre:"Benjamín Vargas",estado:"FULL"},
  {rut:"25447894-6",nombre:"Borja Cruz",estado:"ACTIVO"},
  {rut:"23775743-2",nombre:"Camilo Wittig",estado:"ACTIVO"},
  {nombre:"Clemente Grandon",estado:"ACTIVO"},
  {rut:"23924519-6",nombre:"Cristobal Leyton",estado:"ACTIVO"},
  {rut:"24770795-6",nombre:"Damian Wittig",estado:"ACTIVO"},
  {rut:"24163462-0",nombre:"Daniel Nahun Altmann Toloza",estado:"ACTIVO"},
  {rut:"27550700-8",nombre:"Dante Fierro",estado:"ACTIVO"},
  {nombre:"Diego Herrera Zenteno",estado:"NEW"},
  {rut:"27104245-0",nombre:"Diego Manriquez",estado:"ACTIVO"},
  {rut:"27121327-1",nombre:"Diego Sánchez Jara",estado:"ACTIVO"},
  {rut:"24770512-0",nombre:"Emilio Acevedo Fernández",estado:"ACTIVO"},
  {nombre:"Emilio Fernandez Flores",estado:"ACTIVO"},
  {rut:"27017994-0",nombre:"Facundo Cruz",estado:"ACTIVO"},
  {rut:"25419367-4",nombre:"Facundo Montes",estado:"ACTIVO"},
  {rut:"23771493-8",nombre:"Felipe Becerra",estado:"ACTIVO"},
  {rut:"25761267-8",nombre:"Fernando Briceño",estado:"ACTIVO"},
  {rut:"24378289-9",nombre:"Francisco Bustos Machuca",estado:"ACTIVO"},
  {nombre:"Gabriel Gonzalez Olate",estado:"ACTIVO"},
  {rut:"26791927-5",nombre:"Gabriel Romani",estado:"ACTIVO"},
  {rut:"25203742-K",nombre:"Gabriel Sauer",estado:"ACTIVO"},
  {nombre:"Gaspar Pavez",estado:"ACTIVO"},
  {rut:"27771513-9",nombre:"Gaspar Salinas",estado:"ACTIVO"},
  {nombre:"Gustavo Angulo",estado:"NEW"},
  {rut:"24169775-4",nombre:"Ignacio Bruna",estado:"ACTIVO"},
  {rut:"26850719-1",nombre:"Ignacio Pizarro",estado:"ACTIVO"},
  {rut:"26542746-4",nombre:"José Antonio Mantilla",estado:"ACTIVO"},
  {nombre:"José Daniel González",estado:"ACTIVO"},
  {nombre:"Jose Francisco Lagos",estado:"DESACTIVADO"},
  {rut:"26841447-9",nombre:"José Pedro Bustos Machuca",estado:"ACTIVO"},
  {rut:"26919963-6",nombre:"Juan Ignacio Pizarro",estado:"ACTIVO"},
  {nombre:"Juan Laguna Aleuanlli",estado:"ACTIVO"},
  {nombre:"Leonardo Micaletti",estado:"ACTIVO"},
  {rut:"26899377-0",nombre:"Lorenzo Lee",estado:"ACTIVO"},
  {rut:"27168786-9",nombre:"Lorenzo Pires",estado:"ACTIVO"},
  {nombre:"Luciano Morales",estado:"ACTIVO"},
  {rut:"27101403-1",nombre:"Luciano Murati",estado:"ACTIVO"},
  {rut:"25826244-1",nombre:"Mariano Villa",estado:"ACTIVO"},
  {rut:"25678215-4",nombre:"Mario Fernández Daboin",estado:"ACTIVO"},
  {rut:"25260919-9",nombre:"Martin Balmaceda Rudolph",estado:"ACTIVO"},
  {nombre:"Martin Duque",estado:"FULL"},
  {rut:"26137218-5",nombre:"Martin Rey",estado:"ACTIVO"},
  {nombre:"Martin Tedy",estado:"ACTIVO"},
  {rut:"26261988-5",nombre:"Massimo Gomez",estado:"ACTIVO"},
  {nombre:"Mateo Araneda",estado:"NEW"},
  {rut:"24080683-5",nombre:"Mateo Leyton Bloch",estado:"ACTIVO"},
  {rut:"26058044-2",nombre:"Matias Araya",estado:"ACTIVO"},
  {nombre:"Matias Garrido",estado:"FULL"},
  {rut:"24320424-0",nombre:"Matías Leal",estado:"ACTIVO"},
  {nombre:"Matias Vargas Luan",estado:"DESACTIVADO"},
  {rut:"25050430-6",nombre:"Maximiliano Cerda Avila",estado:"ACTIVO"},
  {nombre:"Maximiliano Plaza Villalobos",estado:"ACTIVO"},
  {rut:"25936592-9",nombre:"Maximiliano Soza",estado:"ACTIVO"},
  {rut:"25130715-6",nombre:"Maximo Orellana",estado:"ACTIVO"},
  {rut:"25936381-0",nombre:"Michael Villasmil",estado:"ACTIVO"},
  {rut:"24370462-6",nombre:"Nicolás Cuevas Diez",estado:"ACTIVO"},
  {nombre:"Nicolas Pineda Maturana",estado:"ACTIVO"},
  {nombre:"Octavio Cortes Diaz",estado:"ACTIVO"},
  {nombre:"Octavio Orozco",estado:"ACTIVO"},
  {nombre:"Pedro Larenas",estado:"DESACTIVADO"},
  {nombre:"Rafael Gonzalez Olate",estado:"ACTIVO"},
  {rut:"25814746-4",nombre:"Rodrigo Hoyos",estado:"ACTIVO"},
  {nombre:"Salvador Willis",estado:"NEW"},
  {rut:"25516743-K",nombre:"Santiago Andres Lozano Ramirez",estado:"DESACTIVADO"},
  {rut:"26806688-8",nombre:"Santiago Lopez",estado:"ACTIVO"},
  {rut:"27550710-5",nombre:"Santino Fierro",estado:"ACTIVO"},
  {rut:"24296297-4",nombre:"Sebastian Fry",estado:"ACTIVO"},
  {rut:"26467172-8",nombre:"Sebastian Lozano",estado:"DESACTIVADO"},
  {rut:"25034284-5",nombre:"Sebastián Vásquez Fica",estado:"ACTIVO"},
  {nombre:"Simon Perez",estado:"ACTIVO"},
  {rut:"26439117-2",nombre:"Simón Varela",estado:"ACTIVO"},
  {nombre:"Tadeo Valentino Machado",estado:"ACTIVO"},
  {rut:"25909609-K",nombre:"Tomas Cavallo",estado:"ACTIVO"},
  {rut:"27134426-0",nombre:"Tomas Gabriel Landaeta Molina",estado:"ACTIVO"},
  {nombre:"Tomas Pavez",estado:"ACTIVO"},
  {rut:"25186392-k",nombre:"Tomás Varela",estado:"ACTIVO"},
  {rut:"25761267-8",nombre:"Valentín Briceño",estado:"ACTIVO"},
  {nombre:"Valentina Perez",estado:"ACTIVO"},
  {rut:"26664697-6",nombre:"Vicente Pineda",estado:"ACTIVO"},
  {nombre:"Vicente Toledo",estado:"ACTIVO"},
  {rut:"27543512-0",nombre:"Vicente Varela Quiroz",estado:"ACTIVO"},
  {rut:"25546136-2",nombre:"Vicente Vargas Vega",estado:"FULL"},
];

interface CategoryData {
  sede: string;
  categoria: string;
  tipo: "COMPETITIVO" | "RECREATIVO";
  jugadores: RawPlayer[];
}

const ALL: CategoryData[] = [
  { sede: "LAS CONDES", categoria: "SUB-14", tipo: "COMPETITIVO", jugadores: LC_SUB14 },
  { sede: "LAS CONDES", categoria: "KIDS", tipo: "RECREATIVO", jugadores: LC_KIDS },
];

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Not admin" }, { status: 403 });

  const { data: sedesData } = await supabase.from("sedes").select("id, nombre");
  if (!sedesData) return NextResponse.json({ error: "No sedes" }, { status: 500 });
  const sedeMap = Object.fromEntries(sedesData.map((s) => [s.nombre, s.id]));

  const results: Record<string, { inserted: number; skipped: number; errors: string[] }> = {};

  for (const cat of ALL) {
    const sedeId = sedeMap[cat.sede];
    if (!sedeId) { results[cat.categoria] = { inserted: 0, skipped: 0, errors: ["Sede not found"] }; continue; }

    const { data: existingCat } = await supabase
      .from("categorias").select("id").eq("sede_id", sedeId).eq("nombre", cat.categoria).maybeSingle();

    let categoriaId: string;
    if (existingCat) {
      categoriaId = existingCat.id;
    } else {
      const { data: newCat, error: catErr } = await supabase
        .from("categorias").insert({ sede_id: sedeId, nombre: cat.categoria, tipo: cat.tipo }).select("id").single();
      if (catErr || !newCat) { results[cat.categoria] = { inserted: 0, skipped: 0, errors: [catErr?.message ?? ""] }; continue; }
      categoriaId = newCat.id;
    }

    const rows = cat.jugadores.map((j) => ({
      rut: j.rut?.trim() || `SIN-RUT-${j.nombre.replace(/\s+/g, "-").substring(0, 30)}`,
      nombre: j.nombre.trim(),
      estado: normalizeEstado(j.estado),
      sede_id: sedeId,
      categoria_id: categoriaId,
      telefono_jugador: normalizeTel(j.tel_jug),
      telefono_apoderado: normalizeTel(j.tel_apo),
    }));

    const ruts = rows.map((r) => r.rut);
    const { data: existingPlayers } = await supabase.from("jugadores").select("rut").in("rut", ruts);
    const existingRuts = new Set((existingPlayers ?? []).map((p) => p.rut));
    const toInsert = rows.filter((r) => !existingRuts.has(r.rut));
    const skipped = rows.length - toInsert.length;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error, data } = await supabase.from("jugadores").insert(batch).select("id");
      if (error) errors.push(`Batch ${i}: ${error.message}`);
      else inserted += data.length;
    }

    results[`${cat.sede} / ${cat.categoria}`] = { inserted, skipped, errors };
  }

  return NextResponse.json({ results });
}
