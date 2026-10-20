import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const JUGADORES_LA_FLORIDA = [
  { rut: "25254529-8", nombre: "Aaron Diaz Pison", estado: "ACTIVO", tel_jug: "+56975406376", tel_apo: "982874739", fecha_nac: "2010-01-21", posicion: null, pie: null },
  { rut: null, nombre: "Adan Poblete Olave", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Adler Sanchez Parra", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "28714501-2", nombre: "Adriano Morey Saldaña", estado: "ACTIVO", tel_jug: "+56962227975", tel_apo: "+56951978231", fecha_nac: "2011-06-04", posicion: null, pie: null },
  { rut: "24014453-0", nombre: "Agustin Alzaga Jimenez", estado: "ACTIVO", tel_jug: "+56956547715", tel_apo: "+56963020137", fecha_nac: null, posicion: null, pie: null },
  { rut: "22834711-6", nombre: "Alex Moraga Jaque", estado: "ACTIVO", tel_jug: "+56974753667", tel_apo: "+56982053383", fecha_nac: "2008-09-26", posicion: null, pie: null },
  { rut: "23377318-2", nombre: "Alexander Saldias Aburto", estado: "ACTIVO", tel_jug: "+56944802029", tel_apo: "+56930066727", fecha_nac: "2010-07-19", posicion: null, pie: null },
  { rut: "23142003-7", nombre: "Amaro Latoja Corvalan", estado: "ACTIVO", tel_jug: "+56994118818", tel_apo: "+56976035291", fecha_nac: "2009-10-05", posicion: null, pie: null },
  { rut: null, nombre: "Arturo Collinao", estado: "NEW", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23921198-4", nombre: "Axel Rosas Arevalo", estado: "ACTIVO", tel_jug: "+56952358148", tel_apo: "+56952358148", fecha_nac: null, posicion: null, pie: null },
  { rut: "23159255-5", nombre: "Bastian Arias Machuca", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23376386-1", nombre: "Benjamin Henriquez Hernandez", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Benjamin Reyes Contreras", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23060906-3", nombre: "Cristobal Mellado", estado: "FULL", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Daniel Perez Camacho", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23414009-4", nombre: "Dante Ureta", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23673890-6", nombre: "Edison Morales Panay", estado: "ACTIVO", tel_jug: "+56935139127", tel_apo: "+56977345091", fecha_nac: null, posicion: null, pie: null },
  { rut: "23489091-3", nombre: "Eduardo Caceres", estado: "ACTIVO", tel_jug: "+56922509381", tel_apo: "+56922231869", fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Edwin Martinez", estado: "NEW", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Emanuel Arce Ramirez", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Emanuel Arellano Godoy", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Ezequiel Pastenes", estado: "NEW", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23264573-3", nombre: "Fabian Trujillo Aguilar", estado: "ACTIVO", tel_jug: "+56934860236", tel_apo: "+56987056638", fecha_nac: "2010-03-07", posicion: null, pie: null },
  { rut: "23105599-1", nombre: "Francisco Urra", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23430071-7", nombre: "Gaspar Arevalos", estado: "ACTIVO", tel_jug: "+56930352837", tel_apo: "+56972705209", fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Gaspar Morales", estado: "NEW", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "22500633-4", nombre: "Henry Ormeño Muñoz", estado: "ACTIVO", tel_jug: "+56978252291", tel_apo: "+56947742600", fecha_nac: "2007-09-02", posicion: null, pie: null },
  { rut: null, nombre: "Ignacio Escobar", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "28813478-2", nombre: "Iker Olaya Tomala", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "22525323-4", nombre: "Jeremy Arce", estado: "ACTIVO", tel_jug: "+56920913106", tel_apo: "+56936738144", fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Joaquin Fernandez", estado: "NEW", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "22745041-K", nombre: "Joaquin Villagra Oyarce", estado: "DESACTIVADO", tel_jug: "+56923677736", tel_apo: "+56923679775", fecha_nac: null, posicion: null, pie: null },
  { rut: "23715243-3", nombre: "Juan Manuel Garcia", estado: "DESACTIVADO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23779590-3", nombre: "Juan Vega Calderon", estado: "ACTIVO", tel_jug: "+56976156700", tel_apo: "+56968480744", fecha_nac: null, posicion: null, pie: null },
  { rut: "23113977-K", nombre: "Julian Valenzuela Beovic", estado: "FULL", tel_jug: "+56953401285", tel_apo: "+56952444857", fecha_nac: "2009-09-03", posicion: null, pie: null },
  { rut: "23427270-5", nombre: "Lionel Gamarra Carrasco", estado: "ACTIVO", tel_jug: "+56987896837", tel_apo: "+56987896289", fecha_nac: "2010-09-16", posicion: null, pie: null },
  { rut: "22655077-1", nombre: "Lucas Chamorro", estado: "ACTIVO", tel_jug: "+56995498838", tel_apo: "+56976243582", fecha_nac: "2008-02-25", posicion: null, pie: null },
  { rut: "23717838-6", nombre: "Lucas Reyes Lizama", estado: "ACTIVO", tel_jug: "+56945626185", tel_apo: "+56977060975", fecha_nac: "2011-08-11", posicion: null, pie: null },
  { rut: "22777374-K", nombre: "Martin Abarzua Sepulveda", estado: "ACTIVO", tel_jug: "+56984799279", tel_apo: "+56977572516", fecha_nac: "2008-07-26", posicion: null, pie: null },
  { rut: "23408463-1", nombre: "Martin Albornoz Lagunas", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23024063-9", nombre: "Maximo Molines Vasquez", estado: "ACTIVO", tel_jug: "+56934663803", tel_apo: "+56957147913", fecha_nac: "2009-05-20", posicion: null, pie: null },
  { rut: "23950476-0", nombre: "Michel Exequiel Vasquez Luque", estado: "ACTIVO", tel_jug: "+56997175904", tel_apo: "+56997175904", fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Miguel Espinoza", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "24257980-1", nombre: "Nahuel Armazan Diaz", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "28366221-7", nombre: "Oscar Delgado", estado: "ACTIVO", tel_jug: "+56936822221", tel_apo: "+56930216468", fecha_nac: null, posicion: null, pie: null },
  { rut: "23487707-0", nombre: "Renato Castro", estado: "ACTIVO", tel_jug: "+56989398121", tel_apo: "+56991628134", fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Rodrigo Machado Machuca", estado: "ACTIVO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "23399166-K", nombre: "Salvador Rozas Honores", estado: "ACTIVO", tel_jug: "+56954966490", tel_apo: "+56983565698", fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Santiago Marin", estado: "DESACTIVADO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: null, nombre: "Sebastian Hernandez", estado: "DESACTIVADO", tel_jug: null, tel_apo: null, fecha_nac: null, posicion: null, pie: null },
  { rut: "74257804", nombre: "Thiago Adrianzen", estado: "ACTIVO", tel_jug: "+56952273324", tel_apo: "+56952271991", fecha_nac: null, posicion: null, pie: null },
  { rut: "23527676-3", nombre: "Tomas Alcaide Giliberto", estado: "ACTIVO", tel_jug: "+56928274956", tel_apo: "+56956833883", fecha_nac: "2011-01-07", posicion: null, pie: null },
  { rut: "23477630-4", nombre: "Vicente Zuñiga Valenzuela", estado: "ACTIVO", tel_jug: "+56971026013", tel_apo: "+56996274774", fecha_nac: null, posicion: null, pie: null },
  { rut: "28971200-3", nombre: "Xavier Briceño Rodriguez", estado: "ACTIVO", tel_jug: "+56965877134", tel_apo: "+56940105182", fecha_nac: "2010-08-17", posicion: null, pie: null },
];

const VALID_ESTADOS = ["ACTIVO", "FULL", "NEW", "LESIONADO", "DESACTIVADO", "BECADO"];

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Not admin" }, { status: 403 });

  const { data: sede } = await supabase
    .from("sedes")
    .select("id")
    .eq("nombre", "LA FLORIDA")
    .single();
  if (!sede) return NextResponse.json({ error: "Sede LA FLORIDA not found" }, { status: 500 });

  const { data: categoria } = await supabase
    .from("categorias")
    .select("id")
    .eq("sede_id", sede.id)
    .eq("nombre", "SUB-16")
    .single();
  if (!categoria) return NextResponse.json({ error: "Categoría SUB-16 not found" }, { status: 500 });

  let inserted = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (const j of JUGADORES_LA_FLORIDA) {
    const estado = VALID_ESTADOS.includes(j.estado) ? j.estado : "ACTIVO";
    const rut = j.rut || `SIN-RUT-${j.nombre.replace(/\s+/g, "-").substring(0, 20)}`;

    const row: Record<string, unknown> = {
      rut,
      nombre: j.nombre.trim(),
      estado,
      sede_id: sede.id,
      categoria_id: categoria.id,
      telefono_jugador: j.tel_jug,
      telefono_apoderado: j.tel_apo,
      fecha_nacimiento: j.fecha_nac,
      posicion_principal: j.posicion,
      pie_dominante: j.pie,
    };

    const { error } = await supabase
      .from("jugadores")
      .upsert(row, { onConflict: "rut" });

    if (error) {
      errors.push(`${j.nombre}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ inserted, skipped, errors, total: JUGADORES_LA_FLORIDA.length });
}
