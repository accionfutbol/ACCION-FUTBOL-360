import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_ESTADOS = ["ACTIVO", "FULL", "NEW", "LESIONADO", "DESACTIVADO", "BECADO"];

function normalizeEstado(raw: string | undefined): string {
  if (!raw) return "NEW";
  const s = raw.trim().toUpperCase();
  if (VALID_ESTADOS.includes(s)) return s;
  if (s === "SIN ESTADO" || s === "") return "NEW";
  if (s === "NO CIERRE" || s === "CIERRE" || s === "RECESO") return "DESACTIVADO";
  if (s === "REINTEGRO") return "ACTIVO";
  return "ACTIVO";
}

function normalizeTel(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let t = raw.trim();
  if (t === "#N/A" || t === "9" || t.length < 5) return null;
  t = t.replace(/[\s\-()±]/g, "");
  if (t.startsWith("+56")) return t;
  if (t.startsWith("56") && t.length >= 11) return "+" + t;
  if (t.startsWith("9") && t.length >= 8) return "+56" + t;
  return t;
}

interface RawPlayer {
  rut?: string;
  nombre: string;
  estado?: string;
  tel_jug?: string;
  tel_apo?: string;
}

interface CategoryData {
  sede: string;
  categoria: string;
  tipo: "COMPETITIVO" | "RECREATIVO";
  jugadores: RawPlayer[];
}

// --- DATA ---

const LC_SUB18_AR: RawPlayer[] = [
  {rut:"32599910",nombre:"Abraham Querales",estado:"ACTIVO",tel_jug:"56998982453",tel_apo:"56988118286"},
  {rut:"23170973-8",nombre:"Andrés Munizaga",estado:"ACTIVO",tel_jug:"56 9 4541 1759",tel_apo:"56982949836"},
  {rut:"22797743-4",nombre:"Angel Antilao",estado:"FULL",tel_jug:"56927300638",tel_apo:"56936957590"},
  {nombre:"Arley Alejandro Mendez",estado:"SIN ESTADO"},
  {nombre:"Benjamin Cerda Cerda",estado:"DESACTIVADO"},
  {rut:"22828784-9",nombre:"Bruno Bisquertt",estado:"ACTIVO",tel_jug:"56988090529",tel_apo:"56986631808"},
  {rut:"28523220-1",nombre:"Camilo Rodriguez",estado:"DESACTIVADO",tel_jug:"56928792707"},
  {rut:"22878922-4",nombre:"Carlos Troncoso",estado:"ACTIVO",tel_jug:"56988113627",tel_apo:"56968471483"},
  {rut:"26068672-0",nombre:"Diego Caycho Ayay",estado:"DESACTIVADO",tel_jug:"569 9494 6210",tel_apo:"56957204197"},
  {rut:"22989013-1",nombre:"Diego Claveria",estado:"LESIONADO",tel_jug:"56930090348",tel_apo:"+56981300114"},
  {rut:"23023243-1",nombre:"Elias Caballero",estado:"ACTIVO",tel_jug:"56940148104",tel_apo:"56972065945"},
  {rut:"25684114-2",nombre:"Emanuel Rodriguez",estado:"ACTIVO",tel_jug:"56948478078",tel_apo:"56948478076"},
  {rut:"22187988-0",nombre:"Esteban Martinez Rodriguez",estado:"ACTIVO",tel_jug:"56942281654",tel_apo:"56971075672"},
  {rut:"22900444-1",nombre:"Facundo Hurtado",estado:"ACTIVO",tel_jug:"56944007560",tel_apo:"56992772531"},
  {nombre:"Félix Miguel Morales",estado:"DESACTIVADO"},
  {rut:"22383458-2",nombre:"Francesco Castro",estado:"ACTIVO",tel_jug:"56955106767",tel_apo:"56965816415"},
  {rut:"22767384-2",nombre:"Gabriel Alliende",estado:"ACTIVO",tel_jug:"56984769881",tel_apo:"56998469489"},
  {rut:"23055371-8",nombre:"Gabriel Mujica",estado:"ACTIVO",tel_jug:"56964452709",tel_apo:"56996187232"},
  {rut:"28396433-7",nombre:"Geovanny Cerrada",estado:"ACTIVO",tel_jug:"56985059212",tel_apo:"56937043071"},
  {nombre:"Hebans Campos",estado:"FULL"},
  {rut:"23152933-0",nombre:"Ignacio Molina",estado:"DESACTIVADO",tel_jug:"56996779041",tel_apo:"56954238291"},
  {rut:"23112671-6",nombre:"Javier Reyes Pinto",estado:"DESACTIVADO",tel_jug:"+56935874797",tel_apo:"+56973198219"},
  {nombre:"Jeremy Arce",estado:"ACTIVO"},
  {nombre:"Jose Salas",estado:"ACTIVO"},
  {rut:"33099624",nombre:"Joswill Diaz",estado:"ACTIVO",tel_jug:"56932885473",tel_apo:"56987576832"},
  {rut:"26674766-7",nombre:"Juan Amon",estado:"ACTIVO",tel_jug:"56958223446",tel_apo:"56937016756"},
  {rut:"22080478-K",nombre:"Kevin Heliott",estado:"ACTIVO",tel_jug:"56942007910",tel_apo:"56962660751"},
  {nombre:"Lorenzo Carreño",estado:"SIN ESTADO"},
  {rut:"22780145-k",nombre:"Luis Moraga",estado:"FULL",tel_jug:"56 9 5726 8731"},
  {rut:"26932934-3",nombre:"Luis Palominos Landaeta",estado:"FULL",tel_jug:"56 9 3462 5798",tel_apo:"932652158"},
  {rut:"28380155-1",nombre:"Manuel Lemus García",estado:"ACTIVO",tel_jug:"56974512815",tel_apo:"56949891132"},
  {rut:"25517099-6",nombre:"Marco Fernández",estado:"DESACTIVADO",tel_jug:"56967038827",tel_apo:"952497573"},
  {rut:"22619068-6",nombre:"Martin Sarmiento",estado:"ACTIVO",tel_jug:"56921735498",tel_apo:"56965451135"},
  {rut:"28185392-9",nombre:"Moisés Bellorin",estado:"ACTIVO",tel_jug:"56 9 2380 6947",tel_apo:"56947119805"},
  {rut:"22807012-2",nombre:"Nasim Nanjari",estado:"FULL",tel_jug:"56955191614",tel_apo:"56976210541"},
  {rut:"26216744-5",nombre:"Nicolas Campo",estado:"FULL",tel_jug:"56 9 4287 1398",tel_apo:"56931745722"},
  {rut:"27571040-7",nombre:"Nicolas Carmona",estado:"ACTIVO",tel_jug:"56964340753",tel_apo:"56920477688"},
  {rut:"24856113-0",nombre:"Oscar Peña",estado:"DESACTIVADO",tel_jug:"56922389333",tel_apo:"56963477037"},
  {rut:"22760097-7",nombre:"Raimundo Lemus Gutierrez",estado:"ACTIVO",tel_jug:"56959750523",tel_apo:"56986698885"},
  {rut:"22995469-5",nombre:"Renato Sotomayor",estado:"DESACTIVADO",tel_jug:"56920190667",tel_apo:"56972136531"},
  {rut:"26194328-k",nombre:"Samuel Dominguez Molina",estado:"DESACTIVADO",tel_jug:"56964702834",tel_apo:"56986793006"},
  {rut:"22900173-6",nombre:"Santiago Carpinelli",estado:"ACTIVO",tel_jug:"56948528566",tel_apo:"+56986692778"},
  {nombre:"Sebastian Gonzalez Rossi",estado:"NEW"},
  {rut:"22811332-8",nombre:"Simon Fuentes",estado:"ACTIVO",tel_jug:"56993786837",tel_apo:"56993786687"},
  {rut:"23358412-6",nombre:"Simon Ruiz",estado:"ACTIVO",tel_jug:"56975536527",tel_apo:"56962135533"},
  {rut:"23146326-7",nombre:"Thomas Tapia",estado:"ACTIVO",tel_jug:"56 9 2748 2663",tel_apo:"921216064"},
  {rut:"22052978-9",nombre:"Tomas Castro Jara",estado:"ACTIVO",tel_jug:"56984129654",tel_apo:"56984129654"},
  {nombre:"Tomas Oyarzo Rios",estado:"NEW"},
  {rut:"22959483-4",nombre:"Tomas Perez",estado:"ACTIVO",tel_jug:"56 9 5712 9745",tel_apo:"+56953724381"},
  {rut:"22498357-3",nombre:"Vicente Galarce Molina",estado:"ACTIVO",tel_jug:"56941600852",tel_apo:"+56983272877"},
  {nombre:"Vicente Ignacio Zúñiga Quintana",estado:"REINTEGRO"},
  {rut:"22764702-7",nombre:"Victor Palza Contreras",estado:"ACTIVO",tel_jug:"56995624423",tel_apo:"56997739455"},
  {rut:"100805291-K",nombre:"Yonathan Isaza",estado:"ACTIVO",tel_jug:"56937523505",tel_apo:"937523505"},
];

const LC_SUB18_COMP: RawPlayer[] = [
  {rut:"60306200",nombre:"Anthony Dias Carhuanina",estado:"DESACTIVADO",tel_jug:"+51945529157",tel_apo:"+56990770832"},
  {rut:"23082370-7",nombre:"Bayron Azabache Perez",estado:"ACTIVO",tel_jug:"56972642637",tel_apo:"56972642637"},
  {rut:"23125864-7",nombre:"Benjamin Amigo Herrera",estado:"ACTIVO"},
  {rut:"22638517-7",nombre:"Cristopher Castillo Silva",estado:"DESACTIVADO",tel_jug:"56977267422",tel_apo:"+56957582119"},
  {rut:"23125797-7",nombre:"Diego Castillo",estado:"ACTIVO",tel_jug:"56 9 2739 1793",tel_apo:"56937737547"},
  {rut:"24850880-9",nombre:"Diego Navarro Lopez",estado:"ACTIVO",tel_jug:"56973306829",tel_apo:"56976401711"},
  {rut:"22836297-2",nombre:"Elias Peña Miranda",estado:"ACTIVO",tel_jug:"+56997895038",tel_apo:"+56996505574"},
  {rut:"23161642-k",nombre:"Erick Benjamin Ramirez Pacheco",estado:"ACTIVO",tel_jug:"999806166",tel_apo:"957995450"},
  {rut:"26119429-5",nombre:"Fabian Rivero",estado:"ACTIVO",tel_jug:"56946889122",tel_apo:"56959633846"},
  {rut:"23179733-5",nombre:"Fernando Parada Carvajal",estado:"ACTIVO",tel_jug:"56936608817",tel_apo:"56978139561"},
  {rut:"23156165-k",nombre:"Gabriel Alvarez",estado:"ACTIVO"},
  {rut:"22385113-4",nombre:"Gaspar Basaure Perez",estado:"ACTIVO",tel_jug:"56929066491",tel_apo:"+56972124842"},
  {rut:"22850928-0",nombre:"Gustavo Alvarez Flores",estado:"DESACTIVADO",tel_jug:"56988825201",tel_apo:"+56985056527"},
  {rut:"23041766-0",nombre:"Ignacio Donoso",estado:"ACTIVO"},
  {rut:"22270705-6",nombre:"Ignacio Soto Duran",estado:"DESACTIVADO",tel_jug:"56937794719",tel_apo:"+56975482386"},
  {nombre:"Jeremy Arce",estado:"ACTIVO"},
  {nombre:"Jose Moraga",estado:"DESACTIVADO"},
  {nombre:"Jose Murcia",estado:"NEW"},
  {rut:"28277680-4",nombre:"Jostin Bermeo Carrion",estado:"ACTIVO",tel_jug:"56940679977",tel_apo:"56976530816"},
  {rut:"1117020660",nombre:"Juan David Baltan",estado:"ACTIVO"},
  {rut:"49038301-8",nombre:"Juan Manuel Leguizamon Florez",estado:"ACTIVO"},
  {rut:"22428392-k",nombre:"Juan Pedro Alegria Chavez",estado:"ACTIVO",tel_jug:"56952148418",tel_apo:"56975049382"},
  {rut:"32133269",nombre:"Keiderson Medina Rivas",estado:"ACTIVO",tel_jug:"56950607520",tel_apo:"+56990106781"},
  {rut:"22464742-5",nombre:"Lorenzo Aguilera Merlet",estado:"ACTIVO",tel_jug:"56943533898",tel_apo:"56998227501"},
  {rut:"22974036-9",nombre:"Luciano Nuñez",estado:"ACTIVO"},
  {rut:"22589020-K",nombre:"Marcos Vergara",estado:"ACTIVO",tel_jug:"56995429489",tel_apo:"56944600968"},
  {nombre:"Martin Armijo Angulo",estado:"NEW"},
  {rut:"22922175-2",nombre:"Mathias Diaz",estado:"ACTIVO",tel_jug:"56 940262961",tel_apo:"56961787844"},
  {rut:"23185528-9",nombre:"Matias Guiñez",estado:"ACTIVO"},
  {rut:"22444096-0",nombre:"Matias Yañez Severino",estado:"ACTIVO",tel_jug:"56948528188",tel_apo:"56993101589"},
  {rut:"28803893-3",nombre:"Meyker Bobadilla Vega",estado:"ACTIVO"},
  {rut:"22510076-4",nombre:"Moises Retamal Jaque",estado:"ACTIVO",tel_jug:"+56988219058",tel_apo:"+56993181837"},
  {rut:"22193547-0",nombre:"Nicolas Cañete",estado:"DESACTIVADO"},
  {rut:"22238701-9",nombre:"Nicolás Rifo Valenzuela",estado:"ACTIVO",tel_jug:"56962171040",tel_apo:"56956096774"},
  {rut:"28560481-8",nombre:"Oliver Díaz Rivero",estado:"ACTIVO",tel_jug:"56933202492",tel_apo:"932587620"},
  {rut:"22448530-1",nombre:"Orlando Santibañez",estado:"DESACTIVADO",tel_jug:"56987894465",tel_apo:"56963346359"},
  {rut:"22586697-k",nombre:"Patricio Caniumil",estado:"ACTIVO"},
  {rut:"23100447-5",nombre:"Rafael Meneses Homann",estado:"ACTIVO"},
  {rut:"22679439-5",nombre:"Renato Olate",estado:"ACTIVO",tel_jug:"56933025778",tel_apo:"+56985274034"},
  {rut:"29393244-1",nombre:"Samuel Bolivar",estado:"ACTIVO",tel_jug:"56926154277",tel_apo:"+56973114759"},
  {rut:"25633366-k",nombre:"Samuel Nuñez Bedoya",estado:"ACTIVO"},
  {rut:"28459833-4",nombre:"Santiago Infante",estado:"ACTIVO",tel_jug:"56931065066",tel_apo:"56944350532"},
  {rut:"25561737-0",nombre:"Santiago Padilla",estado:"ACTIVO",tel_jug:"56928451442",tel_apo:"56945826660"},
  {rut:"22495924-9",nombre:"Sebastian Inostroza",estado:"ACTIVO"},
  {rut:"23100709-1",nombre:"Stefanno Falchetti",estado:"ACTIVO",tel_jug:"56999193955",tel_apo:"56948712636"},
  {rut:"29317659-0",nombre:"Teodoro Parra",estado:"ACTIVO"},
  {rut:"28164182-4",nombre:"Urko Lizarraga",estado:"ACTIVO",tel_jug:"56978797747",tel_apo:"56978933398"},
  {rut:"22546574-6",nombre:"Vicente Jerez Chacon",estado:"NEW"},
  {nombre:"Vicente Zuñiga Quintana",estado:"NEW"},
];

const LC_SUB16_AR: RawPlayer[] = [
  {rut:"23560382-9",nombre:"Adiel Almendra",estado:"ACTIVO",tel_jug:"56 9 8348 9425",tel_apo:"5695128383"},
  {rut:"23867723-8",nombre:"Alejandro Méndez Toledo",estado:"ACTIVO"},
  {rut:"23609011-6",nombre:"Alonso Mendoza",estado:"ACTIVO"},
  {rut:"23501453-k",nombre:"Amaru Valenzuela",estado:"ACTIVO",tel_jug:"56998193828",tel_apo:"56961400692"},
  {rut:"23647675-8",nombre:"Angel Rivera Delgado",estado:"ACTIVO"},
  {rut:"23260282-1",nombre:"Benjamín Infante Roa",estado:"ACTIVO",tel_jug:"56956496580",tel_apo:"56935423662"},
  {rut:"23498254-0",nombre:"Cristian Riquelme Osorio",estado:"ACTIVO"},
  {rut:"28142794-6",nombre:"Danluis Silva",estado:"ACTIVO",tel_jug:"972612872",tel_apo:"935054922"},
  {rut:"23623640-4",nombre:"Diego Barrera",estado:"ACTIVO"},
  {rut:"25912021-7",nombre:"Diego Ceballos",estado:"ACTIVO",tel_jug:"56922093989",tel_apo:"56965688231"},
  {rut:"23436840-0",nombre:"Diego Willis",estado:"ACTIVO",tel_jug:"56923916670",tel_apo:"56961246740"},
  {rut:"100703548-5",nombre:"Dreiph Almerida",estado:"DESACTIVADO"},
  {rut:"27694263-8",nombre:"Eiden Zerpa",estado:"ACTIVO",tel_jug:"9 77199500",tel_apo:"56977199500"},
  {rut:"23699516-k",nombre:"Emilio Brito",estado:"ACTIVO"},
  {rut:"23316324-4",nombre:"Enzo Verreni García",estado:"ACTIVO",tel_jug:"56965134309",tel_apo:"56982744420"},
  {rut:"23770005-8",nombre:"Facundo Guzmán Bock",estado:"ACTIVO",tel_jug:"56935375058",tel_apo:"56965740465"},
  {rut:"23832642-7",nombre:"Facundo Riveros",estado:"ACTIVO"},
  {rut:"25910517-K",nombre:"Gabriel Ceballos",estado:"ACTIVO",tel_jug:"56938846870",tel_apo:"56965688231"},
  {rut:"23349314-7",nombre:"Hebans Campos",estado:"FULL",tel_jug:"+56979081077",tel_apo:"+56946563628"},
  {rut:"23332460-4",nombre:"Ignacio Herrera",estado:"FULL",tel_jug:"56976209129",tel_apo:"56996546216"},
  {nombre:"Jean Mejias",estado:"SIN ESTADO"},
  {rut:"23384899-9",nombre:"Jorge Tatini Flores",estado:"ACTIVO",tel_jug:"56961640677",tel_apo:"56996719295"},
  {rut:"28371855-7",nombre:"Keiver Lucas Calderón Heredia",estado:"ACTIVO",tel_jug:"56998601346",tel_apo:"56941762625"},
  {rut:"28165649-K",nombre:"Leandro Rodriguez",estado:"ACTIVO",tel_jug:"56933129486",tel_apo:"56921820563"},
  {rut:"23605453-5",nombre:"Lorenzo Estevez",estado:"ACTIVO"},
  {rut:"23681124-7",nombre:"Luciano Vergara",estado:"ACTIVO"},
  {rut:"23514530-8",nombre:"Manuel Artigas Barrios",estado:"ACTIVO",tel_jug:"56995404674",tel_apo:"56978567296"},
  {rut:"23344115-5",nombre:"Martin Page",estado:"ACTIVO"},
  {rut:"23291706-7",nombre:"Mateo Morgado Guevara",estado:"ACTIVO",tel_jug:"56 9 4594 4952",tel_apo:"949273613"},
  {rut:"23368970-k",nombre:"Matias Benavides",estado:"ACTIVO"},
  {rut:"23345554-7",nombre:"Matias Campo Castillo",estado:"ACTIVO"},
  {rut:"26870228-8",nombre:"Mauricio Fragachán Quinteros",estado:"ACTIVO",tel_jug:"569 6427 6437",tel_apo:"56959492580"},
  {nombre:"Mauricio Henríquez"},
  {rut:"28477165-6",nombre:"Nicolás Stefano Cárdenas Muñoz",estado:"FULL",tel_jug:"961959526",tel_apo:"56920165659"},
  {rut:"23572487-1",nombre:"Renato Aguirre",estado:"ACTIVO",tel_jug:"56941374550",tel_apo:"56978424529"},
  {nombre:"Sebastian Gonzalez Rossi",estado:"NEW"},
  {rut:"23386318-1",nombre:"Sebastian Lopez",estado:"DESACTIVADO",tel_jug:"56973351929",tel_apo:"973351929"},
  {rut:"100747933-2",nombre:"Sergio Thomas Martinez Reyes",estado:"DESACTIVADO",tel_jug:"57 3114660769",tel_apo:"996545055"},
  {rut:"23740771-7",nombre:"Vicente Baeza",estado:"ACTIVO",tel_jug:"56926170830",tel_apo:"56958491396"},
  {rut:"23375240-1",nombre:"Vicente García",estado:"ACTIVO"},
  {rut:"23332451-5",nombre:"Vicente Herrera",estado:"FULL",tel_jug:"56976210335",tel_apo:"56996546216"},
  {rut:"100805291-K",nombre:"Yonathan Isaza",estado:"ACTIVO",tel_jug:"56937523505",tel_apo:"937523505"},
];

const LC_SUB16_COMP: RawPlayer[] = [
  {rut:"23609011-6",nombre:"Alonso Mendoza",estado:"ACTIVO",tel_jug:"56939198042",tel_apo:"56993946462"},
  {rut:"23358526-2",nombre:"Benjamin Olivares Olguín",estado:"ACTIVO"},
  {rut:"23965242-5",nombre:"Bruno Morgado Guevara",estado:"ACTIVO",tel_jug:"56 9 8761 0332",tel_apo:"56949283613"},
  {rut:"23234684-1",nombre:"Cesar Huaman Lozano",estado:"ACTIVO"},
  {rut:"23732427-7",nombre:"Cristobal Huechucura",estado:"ACTIVO",tel_jug:"56929324380",tel_apo:"+56973282638"},
  {rut:"23828737-5",nombre:"Cristobal Lopez Alister",estado:"ACTIVO",tel_jug:"56944767564",tel_apo:"+56995796740"},
  {nombre:"Damian Benavides",estado:"DESACTIVADO"},
  {rut:"23472615-3",nombre:"Damian Castro Vera",estado:"ACTIVO",tel_jug:"56939692697",tel_apo:"+56993222660"},
  {rut:"28213528-0",nombre:"Daniel Neymar Choez Castillo",estado:"ACTIVO",tel_jug:"56922581454",tel_apo:"56947828050"},
  {rut:"23481780-9",nombre:"Emilio Morales",estado:"ACTIVO",tel_jug:"56989384978",tel_apo:"+56965863595"},
  {rut:"34462110",nombre:"Eneikler Rincón",estado:"ACTIVO"},
  {rut:"23421406-3",nombre:"Felipe Herrera",estado:"DESACTIVADO",tel_jug:"56962903547",tel_apo:"56973606606"},
  {rut:"29216233-2",nombre:"Gabriel Rojas Flores",estado:"ACTIVO"},
  {rut:"23617293-7",nombre:"Gaston Ibaceta Ochsenius",estado:"NEW"},
  {rut:"23635063-0",nombre:"Giovanni Hoeneisen Cavalli",estado:"ACTIVO",tel_jug:"56962224250",tel_apo:"+56930088721"},
  {rut:"24159137-9",nombre:"Gustavo Salgado",estado:"ACTIVO",tel_jug:"56995141130",tel_apo:"56995794734"},
  {rut:"23458810-9",nombre:"Hernan Carrasco Soza",estado:"ACTIVO",tel_jug:"935998679",tel_apo:"973803827"},
  {rut:"23358821-0",nombre:"Ian Lozano Pezo",estado:"ACTIVO",tel_jug:"56920545908",tel_apo:"56986733924"},
  {rut:"23773244-8",nombre:"Joaquin Vidal",estado:"ACTIVO"},
  {rut:"23231180-0",nombre:"José Paucar",estado:"ACTIVO"},
  {rut:"23511881-5",nombre:"Leon Valenzuela Hernández",estado:"ACTIVO",tel_jug:"56923746179",tel_apo:"56991907156"},
  {rut:"23681124-7",nombre:"Luciano Vergara",estado:"ACTIVO",tel_jug:"56932294647",tel_apo:"+56993460034"},
  {rut:"23344115-5",nombre:"Martin Page",estado:"ACTIVO",tel_jug:"56982309898",tel_apo:"+56962879193"},
  {rut:"23602483-0",nombre:"Mateo Araya",estado:"ACTIVO"},
  {rut:"22922175-2",nombre:"Mathias Diaz",estado:"ACTIVO",tel_jug:"56 940262961",tel_apo:"56961787844"},
  {rut:"23531830-k",nombre:"Matias Bobadilla",estado:"ACTIVO",tel_jug:"56930204189",tel_apo:"56941107387"},
  {rut:"23900475-k",nombre:"Matteo Almeida",estado:"ACTIVO",tel_jug:"978498442",tel_apo:"56978498442"},
  {rut:"23395997-9",nombre:"Mauricio Henríquez",estado:"ACTIVO",tel_jug:"56975523802",tel_apo:"56949183957"},
  {rut:"23366372-7",nombre:"Maximiliano Perez",estado:"ACTIVO",tel_jug:"56934068606",tel_apo:"56987083967"},
  {rut:"23424792-1",nombre:"Maximo Retamal",estado:"ACTIVO"},
  {rut:"25628547-9",nombre:"Miguel Angel Caviedes Rodriguez",estado:"ACTIVO",tel_jug:"+56930729430",tel_apo:"+56945186033"},
  {rut:"23552107-5",nombre:"Nicolas Silva Venegas",estado:"ACTIVO"},
  {rut:"23648936-1",nombre:"Pedro Rodriguez",estado:"ACTIVO"},
  {rut:"34677813",nombre:"Raygerson Camacho",estado:"ACTIVO",tel_jug:"56952012006",tel_apo:"56998673487"},
  {rut:"29313958-K",nombre:"Renato Julian Ascarrunz",estado:"ACTIVO",tel_jug:"+56928117078",tel_apo:"+56928117078"},
  {rut:"23764257-0",nombre:"Salvador Troncoso Torres",estado:"NEW"},
  {rut:"23913232-4",nombre:"Santiago Ibañez Olguin",estado:"ACTIVO"},
  {rut:"23576483-0",nombre:"Tomás Ariano",estado:"ACTIVO",tel_jug:"56926381818",tel_apo:"56982006394"},
  {rut:"23579811-5",nombre:"Vicente Valdivia Olazabal",estado:"ACTIVO"},
  {rut:"26383071-7",nombre:"Yeins Cordova Melgarejo",estado:"ACTIVO",tel_jug:"56968523749",tel_apo:"+5693396858"},
];

const PEN_SUB18: RawPlayer[] = [
  {nombre:"Adan Poblete Olave",estado:"ACTIVO"},
  {rut:"22293907-0",nombre:"Amaro Diaz",estado:"ACTIVO"},
  {rut:"22296753-8",nombre:"Amaro Puebla Alvarado",estado:"DESACTIVADO",tel_jug:"56940859498",tel_apo:"+56986918551"},
  {rut:"26469763-8",nombre:"Andres Melendez Rivero",estado:"ACTIVO",tel_jug:"56926484874",tel_apo:"56951120146"},
  {rut:"22797743-4",nombre:"Angel Antilao",estado:"FULL",tel_jug:"56927300638",tel_apo:"56936957590"},
  {rut:"24890782-7",nombre:"Ángel Jérez",estado:"ACTIVO",tel_jug:"56934895868",tel_apo:"56985535966"},
  {rut:"23088962-7",nombre:"Ariel Caro",estado:"ACTIVO",tel_jug:"56984547240",tel_apo:"56935777282"},
  {rut:"22824049-4",nombre:"Bastian Alejandro Mancilla Vilches",estado:"ACTIVO",tel_jug:"94715270",tel_apo:"56999165492"},
  {rut:"23159255-5",nombre:"Bastian Arias Machuca",estado:"ACTIVO"},
  {nombre:"Cristobal Gutierrez Antilaf",estado:"ACTIVO"},
  {rut:"25347280-4",nombre:"Daniel Lozano Sandoval",estado:"ACTIVO",tel_jug:"56993797684",tel_apo:"56950620467"},
  {rut:"22918049-5",nombre:"Daniel Ponce",estado:"ACTIVO"},
  {rut:"27830500-7",nombre:"Diego Alejandro Maurera Flores",estado:"ACTIVO",tel_jug:"56976504364",tel_apo:"56976504364"},
  {rut:"22483571-k",nombre:"Diego Contreras",estado:"ACTIVO",tel_jug:"56920543018",tel_apo:"+56961788510"},
  {rut:"27363743-5",nombre:"Diego Santoyo",estado:"LESIONADO",tel_jug:"56927232554",tel_apo:"56949719566"},
  {rut:"AW312073",nombre:"Emanuel Mejia Salamanca",estado:"ACTIVO",tel_jug:"56977236286",tel_apo:"+56940368337"},
  {nombre:"Emanuel Sanchez Rico",estado:"ACTIVO"},
  {nombre:"Enorck Laguerre",estado:"DESACTIVADO"},
  {rut:"27032820-2",nombre:"Esteban Petit",estado:"ACTIVO",tel_jug:"+56927478241",tel_apo:"+56935084802"},
  {rut:"22842672-5",nombre:"Ethan Peñailillo",estado:"LESIONADO",tel_jug:"56957037822",tel_apo:"56956502251"},
  {rut:"22105418-0",nombre:"Exequiel Miloban Borques",estado:"ACTIVO",tel_jug:"+56936993310",tel_apo:"+56936993310"},
  {rut:"22971914-9",nombre:"Francisco Ignacio Martinez Torres",estado:"ACTIVO",tel_jug:"56935661850",tel_apo:"56998013245"},
  {rut:"22553729-1",nombre:"Franco Gazitúa",estado:"ACTIVO",tel_jug:"56932832006",tel_apo:"56997166004"},
  {rut:"23154372-4",nombre:"Gabriel Coloma",estado:"DESACTIVADO",tel_jug:"56933366077",tel_apo:"56945720334"},
  {rut:"27101033-8",nombre:"Gabriel Cordero",estado:"ACTIVO",tel_jug:"56950585370",tel_apo:"56973672455"},
  {rut:"22463029-8",nombre:"Gustavo Jofre Vergara",estado:"ACTIVO",tel_jug:"56977917387",tel_apo:"56995415293"},
  {rut:"23081706-5",nombre:"Ignacio Diaz Guerra",estado:"ACTIVO",tel_jug:"56934087392",tel_apo:"56995343980"},
  {rut:"22994160-7",nombre:"Ignacio Santana Liberona",estado:"ACTIVO",tel_jug:"56963501175",tel_apo:"56934854625"},
  {rut:"26412732-7",nombre:"Isaac Gutiérrez Vargas",estado:"ACTIVO",tel_jug:"56932829418",tel_apo:"56934585013"},
  {rut:"22771332-1",nombre:"Jean Manuel Denzell Lazo León",estado:"ACTIVO",tel_jug:"56966073708",tel_apo:"56962029508"},
  {nombre:"Jeitan Salinas",estado:"DESACTIVADO"},
  {nombre:"Jesus Soto Blanco",estado:"ACTIVO"},
  {rut:"73849134",nombre:"Jhoao Guillermo Llontop Rojas",estado:"ACTIVO",tel_jug:"56 9 2850 2936",tel_apo:"966778695"},
  {rut:"26743505-7",nombre:"José Andres Casco Diaz",estado:"ACTIVO",tel_jug:"56 9 5346 9314",tel_apo:"56962883600"},
  {rut:"28262275-0",nombre:"José Salcedo",estado:"FULL",tel_jug:"56996900250",tel_apo:"56989488506"},
  {rut:"23129968-8",nombre:"Jose Tomas Canales",estado:"ACTIVO"},
  {rut:"28408226-5",nombre:"Juan Cardona Arias",estado:"ACTIVO",tel_jug:"56954805072",tel_apo:"950308790"},
  {rut:"26801398-9",nombre:"Juan Pablo Uzcátegui",estado:"ACTIVO",tel_jug:"56968285116",tel_apo:"930880346"},
  {rut:"26397418-2",nombre:"Kevin Guillen",estado:"FULL",tel_jug:"56992975587"},
  {rut:"22884613-9",nombre:"Kevin Muñoz Sánchez",estado:"ACTIVO",tel_jug:"56974176735",tel_apo:"56989575395"},
  {rut:"28547950-9",nombre:"Lorvens Synal Bykend",estado:"ACTIVO"},
  {rut:"22655077-1",nombre:"Lucas Chamorro",estado:"ACTIVO",tel_jug:"995498838",tel_apo:"+56976243582"},
  {nombre:"Martín Lopez Latapiat",estado:"ACTIVO"},
  {rut:"22745471-7",nombre:"Martín Petrasic",estado:"DESACTIVADO",tel_jug:"56944825213",tel_apo:"56944825213"},
  {rut:"22592479-1",nombre:"Martin Sagredo Vargas",estado:"ACTIVO",tel_jug:"56939101353",tel_apo:"+56998249192"},
  {rut:"22981148-7",nombre:"Matias Rojo",estado:"ACTIVO",tel_jug:"56938958729",tel_apo:"56973613747"},
  {nombre:"Neus Inelove",estado:"DESACTIVADO"},
  {rut:"23064920-0",nombre:"Pablo Venegas Lillo",estado:"ACTIVO",tel_jug:"56938963345",tel_apo:"56997304099"},
  {rut:"23091326-9",nombre:"Pedro Alfaro",estado:"ACTIVO"},
  {rut:"28195090-8",nombre:"Raul Requena",estado:"ACTIVO"},
  {rut:"28005425-9",nombre:"Samuel Espinoza",estado:"ACTIVO",tel_jug:"56962505035",tel_apo:"56962505035"},
  {rut:"26276660-8",nombre:"Santiago Monasterio",estado:"ACTIVO",tel_jug:"56983491040",tel_apo:"56989259545"},
  {rut:"27670892-9",nombre:"Schneider Smith Torrealba Maita",estado:"ACTIVO",tel_jug:"56 9 4871 4973",tel_apo:"56936644279"},
  {rut:"22357713-k",nombre:"Sebastian Arcila Quiñones",estado:"ACTIVO",tel_jug:"56992734165",tel_apo:"56967060182"},
  {rut:"28035852-5",nombre:"Sebastian Diaz Nevellino",estado:"ACTIVO",tel_jug:"56958436113",tel_apo:"+56998149868"},
  {rut:"23174873-3",nombre:"Simon Basoalto Soto",estado:"ACTIVO",tel_jug:"56957630315",tel_apo:"56957630315"},
];

const PEN_SUB16_AR: RawPlayer[] = [
  {rut:"23567983-3",nombre:"Abraham Ñancul Gonzalez",estado:"ACTIVO",tel_jug:"56966951381",tel_apo:"982272649"},
  {rut:"23215144-7",nombre:"Benjamin Gaete",estado:"ACTIVO",tel_jug:"56976189808",tel_apo:"56984058711"},
  {rut:"23300445-6",nombre:"Camilo Norambuena",estado:"ACTIVO",tel_jug:"56921736806",tel_apo:"56928490835"},
  {rut:"23302950-5",nombre:"Claudio Aranguiz Barahona",estado:"ACTIVO",tel_jug:"56943596172",tel_apo:"56930909399"},
  {rut:"23432921-9",nombre:"Daniel Bustamante",estado:"ACTIVO",tel_jug:"56932937564",tel_apo:"56953475043"},
  {rut:"23298542-9",nombre:"Enzo Silva Ortúzar",estado:"ACTIVO",tel_jug:"56933153580",tel_apo:"56988698976"},
  {rut:"26594716-6",nombre:"Fernando Mendez",estado:"ACTIVO",tel_jug:"56934969708",tel_apo:"56934969709"},
  {rut:"28266006-7",nombre:"Isaac Colina Narváez",estado:"ACTIVO",tel_jug:"56928233702",tel_apo:"56991395298"},
  {rut:"23434217-7",nombre:"Isaias Varas Loyola",estado:"ACTIVO",tel_jug:"56942179399",tel_apo:"56936888728"},
  {rut:"23507816-3",nombre:"Jorge Espinoza Sanchez",estado:"ACTIVO",tel_jug:"56966961688",tel_apo:"56989932108"},
  {rut:"124.183",nombre:"Juan Larrondo",estado:"ACTIVO",tel_jug:"56 9 9613 3653",tel_apo:"56997044279"},
  {rut:"23657778-3",nombre:"Martín Oyarce Fuentes",estado:"ACTIVO",tel_jug:"56986278274",tel_apo:"56998629085"},
  {rut:"23415591-1",nombre:"Máximo Marianjel",estado:"ACTIVO",tel_jug:"56948723916",tel_apo:"56949365433"},
  {rut:"27212015-3",nombre:"Raúl Acosta García",estado:"LESIONADO",tel_jug:"56920491111",tel_apo:"56995906017"},
  {rut:"23262638-0",nombre:"Renato Maluenda Gallo",estado:"ACTIVO",tel_jug:"56936507145",tel_apo:"56944369275"},
  {rut:"28354226-2",nombre:"Rodenyson Valcin Joseffe",estado:"DESACTIVADO",tel_jug:"56933848910",tel_apo:"56932970339"},
  {rut:"23174873-3",nombre:"Simon Basoalto Soto",estado:"ACTIVO",tel_jug:"56957630315",tel_apo:"56957630315"},
  {rut:"23395283-4",nombre:"Vicente Mena Ulloa",estado:"ACTIVO",tel_jug:"56 9 6453 3219",tel_apo:"56935795120"},
];

const PEN_SUB16_COMP: RawPlayer[] = [
  {rut:"23935319-3",nombre:"Agustin Molina Riquelme",estado:"ACTIVO",tel_jug:"56983128927",tel_apo:"+56988804212"},
  {rut:"23563149-0",nombre:"Agustin Rocha Guerrero",estado:"ACTIVO",tel_jug:"5693178951",tel_apo:"+56983107451"},
  {rut:"22999641-k",nombre:"Alexander Reyes",estado:"ACTIVO",tel_jug:"56986792106",tel_apo:"+56931129117"},
  {rut:"23655873-8",nombre:"Alonso Vallejos",estado:"ACTIVO",tel_jug:"931075470",tel_apo:"56968025942"},
  {rut:"24580293-5",nombre:"Arturo Aravena",estado:"ACTIVO",tel_jug:"56963648700",tel_apo:"+56963648700"},
  {rut:"23159255-5",nombre:"Bastian Arias Machuca",estado:"ACTIVO",tel_jug:"935396425",tel_apo:"+56983898308"},
  {rut:"23581250-9",nombre:"Bastian Bravo Inzunza",estado:"ACTIVO",tel_jug:"+56951519466",tel_apo:"+56951518468"},
  {rut:"23358526-2",nombre:"Benjamin Olivares Olguín",estado:"ACTIVO",tel_jug:"56949737313",tel_apo:"964284721"},
  {rut:"23352351-8",nombre:"Benjamin Soto Caulier",estado:"ACTIVO",tel_jug:"954025751",tel_apo:"+56950072051"},
  {rut:"23268974-9",nombre:"Boris Escobar Gutierrez",estado:"NEW",tel_jug:"+56972333495",tel_apo:"+56946244524"},
  {nombre:"Cristobal Arellano",estado:"NEW"},
  {rut:"23459378-1",nombre:"Cristopher Llanten Sotomayor",estado:"ACTIVO",tel_jug:"56945664083",tel_apo:"949723551"},
  {rut:"23254128-8",nombre:"Diego Ferenus Saldaña",estado:"LESIONADO",tel_jug:"+56940688315",tel_apo:"+56996852421"},
  {rut:"23583943-1",nombre:"Emilio Liendo Cortes",estado:"ACTIVO",tel_jug:"56 9 3226 7489",tel_apo:"+56942811660"},
  {rut:"23777618-6",nombre:"Felipe Dote Espindola",estado:"ACTIVO",tel_jug:"920131655",tel_apo:"935782641"},
  {rut:"23705072-k",nombre:"Franco Pinilla Ruiz",estado:"NEW",tel_jug:"+56937145137",tel_apo:"+56950919644"},
  {rut:"26439709-k",nombre:"Gabriel Hidalgo",estado:"ACTIVO",tel_jug:"56954372911",tel_apo:"56958777728"},
  {rut:"23947193-5",nombre:"Gabriel Nuñez",estado:"ACTIVO",tel_jug:"569 95734720",tel_apo:"+56993161624"},
  {rut:"23533255-8",nombre:"Ignacio Huaman Garcia",estado:"ACTIVO",tel_jug:"56982580681",tel_apo:"56976681680"},
  {rut:"23800842-5",nombre:"Ignacio Manquel Curiqueo",estado:"NEW",tel_jug:"+56939433831",tel_apo:"+56985415324"},
  {rut:"23342019-0",nombre:"Jairo Valle",estado:"ACTIVO",tel_jug:"56957088981",tel_apo:"+56964362628"},
  {rut:"24672659-0",nombre:"Jeremy Muñoz Arias",estado:"ACTIVO",tel_jug:"56986145486",tel_apo:"+56959180585"},
  {rut:"23597016-3",nombre:"Jesus Marin",estado:"ACTIVO",tel_jug:"56933296740",tel_apo:"+56990113418"},
  {rut:"27777120-9",nombre:"Jesús Urrieta",estado:"ACTIVO",tel_jug:"982667470",tel_apo:"982667470"},
  {rut:"28967155-2",nombre:"Joaquin Araque Mota",estado:"ACTIVO",tel_jug:"56961006849",tel_apo:"+56987543486"},
  {rut:"23342515-k",nombre:"Joaquin Ibañez",estado:"ACTIVO",tel_jug:"953047750",tel_apo:"+56953047750"},
  {rut:"23613341-9",nombre:"Joaquin Quintanilla Morales",estado:"ACTIVO",tel_jug:"56921767844",tel_apo:"992187994"},
  {rut:"27320698-1",nombre:"Jorge Baptista Delgado",estado:"ACTIVO",tel_jug:"56985816973",tel_apo:"56948155051"},
  {rut:"23545572-2",nombre:"Josue Choez Ochoa",estado:"ACTIVO",tel_jug:"+56959382863",tel_apo:"50247080"},
  {rut:"93566339",nombre:"Julio Cabrales Vílchez",estado:"ACTIVO",tel_jug:"56954476163",tel_apo:"56946420683"},
  {rut:"25955398-9",nombre:"Lautaro Vásquez Colquis",estado:"ACTIVO",tel_jug:"56976479098",tel_apo:"56966778695"},
  {rut:"25921200-6",nombre:"Luis Rangel Marmol",estado:"ACTIVO",tel_jug:"56978981387",tel_apo:"+56988885539"},
  {rut:"23726709-5",nombre:"Manuel Jacome",estado:"ACTIVO",tel_jug:"56988203949",tel_apo:"56936690138"},
  {rut:"23369053-8",nombre:"Marcelo Cartes Balcarce",estado:"ACTIVO",tel_jug:"56989397058",tel_apo:"56999786465"},
  {rut:"23786867-6",nombre:"Martin Barros Barrera",estado:"ACTIVO",tel_jug:"56989090382",tel_apo:"+56982091939"},
  {rut:"23501754-7",nombre:"Martin Reyes Berland",estado:"ACTIVO",tel_jug:"56954744183",tel_apo:"+56931129117"},
  {rut:"23447872-9",nombre:"Martin Sotomayor Jerez",estado:"ACTIVO",tel_jug:"56975894112",tel_apo:"+56975124084"},
  {rut:"23599504-2",nombre:"Mateo Solis",estado:"ACTIVO",tel_jug:"56994121005",tel_apo:"+56920849611"},
  {rut:"23652729-8",nombre:"Matias Aguilera Cardenas",estado:"ACTIVO",tel_jug:"+56920046493",tel_apo:"+56988316205"},
  {rut:"23382089-k",nombre:"Matias Chandia Alarcon",estado:"ACTIVO",tel_jug:"56922358056",tel_apo:"56931318284"},
  {rut:"23995705-6",nombre:"Maximiliano Vergara",estado:"ACTIVO",tel_jug:"56931713761",tel_apo:"+56962287722"},
  {rut:"23529473-7",nombre:"Maximo Ortiz Reveco",estado:"ACTIVO",tel_jug:"56984705645",tel_apo:"+56961908720"},
  {rut:"23370960-3",nombre:"Máximo Ruiz Salamanca",estado:"ACTIVO",tel_jug:"56934678964",tel_apo:"56967382573"},
  {rut:"23455659-2",nombre:"Nicolas Villagra",estado:"ACTIVO",tel_jug:"56954833599",tel_apo:"+56945294124"},
  {rut:"26369138-5",nombre:"Pablo Figueroa",estado:"ACTIVO",tel_jug:"56921762288",tel_apo:"+56930748897"},
  {rut:"23315440-7",nombre:"Pablo Gonzalez",estado:"ACTIVO",tel_jug:"56985630508",tel_apo:"56985631934"},
  {rut:"23395987-1",nombre:"Philpe Leon Vigouroux Valdes",estado:"ACTIVO",tel_jug:"56983445456",tel_apo:"+56944160991"},
  {rut:"23437018-9",nombre:"Rodrigo Castro Jaña",estado:"ACTIVO",tel_jug:"56945277610",tel_apo:"56977748968"},
  {rut:"23446884-7",nombre:"Samuel Diaz",estado:"ACTIVO",tel_jug:"56968319181",tel_apo:"+56989160397"},
  {rut:"27082853-1",nombre:"Sebastian Gutierrez Vasquez",estado:"ACTIVO",tel_jug:"56987600750",tel_apo:"+56967448124"},
  {rut:"25930674-4",nombre:"Sebastian Osa",estado:"ACTIVO",tel_jug:"56973370386",tel_apo:"56920698814"},
  {rut:"23513022-k",nombre:"Sebastian Vasquez Ulloa",estado:"ACTIVO",tel_jug:"56932663052",tel_apo:"+56982937189"},
  {rut:"23261205-3",nombre:"Tian Ithiel Cisternas Leon",estado:"ACTIVO",tel_jug:"56953515818",tel_apo:"+56994084197"},
  {rut:"23688809-6",nombre:"William Oyarce Sandoval",estado:"DESACTIVADO",tel_jug:"56990570410",tel_apo:"+56990836840"},
];

const PEN_SUB14: RawPlayer[] = [
  {rut:"24605670-6",nombre:"Aaron Menares",estado:"NEW"},
  {rut:"24073947-k",nombre:"Abraham Fuentes Quezada",estado:"ACTIVO",tel_jug:"56930724599",tel_apo:"56996521329"},
  {rut:"24409677-8",nombre:"Agustin Jara",estado:"ACTIVO"},
  {rut:"24105359-8",nombre:"Agustin Luco",estado:"ACTIVO"},
  {rut:"24146386-9",nombre:"Agustín Perez Ramirez",estado:"ACTIVO",tel_jug:"56991504826",tel_apo:"+56972158906"},
  {rut:"23867723-8",nombre:"Alejandro Méndez Toledo",estado:"ACTIVO",tel_jug:"56987473014",tel_apo:"56940063507"},
  {rut:"24588527-k",nombre:"Alexander Rivera Ramos",estado:"NEW"},
  {nombre:"Alexander Riveros",estado:"NEW"},
  {rut:"25011779-5",nombre:"Alonso Alvarez",estado:"NEW"},
  {rut:"28088453-7",nombre:"Alonso Salazar Príncipe",estado:"ACTIVO",tel_jug:"56979492551",tel_apo:"56944730686"},
  {rut:"24030890-8",nombre:"Alonso Vasquez",estado:"ACTIVO",tel_jug:"56967064653",tel_apo:"+56967064653"},
  {rut:"28397435-9",nombre:"Andres Cardenas Barreto",estado:"ACTIVO"},
  {rut:"26782840-7",nombre:"Angel Fernandez",estado:"ACTIVO",tel_jug:"56994249749",tel_apo:"56987567483"},
  {rut:"24580293-5",nombre:"Arturo Aravena",estado:"ACTIVO"},
  {rut:"24302009-3",nombre:"Benjamín Alejandro Hernández Calquin",estado:"ACTIVO",tel_jug:"56964988405",tel_apo:"56964988405"},
  {rut:"23837235-6",nombre:"Benjamin Aravena Gonzalez",estado:"ACTIVO",tel_jug:"56941831434",tel_apo:"56932421815"},
  {rut:"24187754-k",nombre:"Benjamin Bravo Galdames",estado:"ACTIVO"},
  {rut:"24200527-9",nombre:"Benjamin Paillalef",estado:"ACTIVO",tel_jug:"56931162124",tel_apo:"56926269752"},
  {rut:"24367606-1",nombre:"Clemente Pineda",estado:"ACTIVO",tel_jug:"56967310162",tel_apo:"+56993430165"},
  {rut:"23906932-0",nombre:"Cristobal Ortiz Moya",estado:"ACTIVO"},
  {rut:"24013268-0",nombre:"Cristofer Beiza Martinez",estado:"ACTIVO",tel_jug:"997175351",tel_apo:"997775234"},
  {rut:"29153983-1",nombre:"Daniel Abreu Arriaga",estado:"ACTIVO",tel_jug:"56962895984",tel_apo:"+56954778624"},
  {rut:"24597736-0",nombre:"David Sepulveda Dote",estado:"ACTIVO",tel_jug:"56984122477",tel_apo:"+56984122477"},
  {rut:"24456658-8",nombre:"Diego Cabezas Sandoval",estado:"ACTIVO",tel_jug:"56996893483",tel_apo:"+56982260332"},
  {rut:"24042302-2",nombre:"Diego Carrasco",estado:"ACTIVO",tel_jug:"56997554104",tel_apo:"+56981714095"},
  {rut:"24011193-4",nombre:"Diego Ibarra Gonzalez",estado:"ACTIVO",tel_jug:"56976910419",tel_apo:"991978780"},
  {rut:"23932973-K",nombre:"Emilio Marin Veliz",estado:"ACTIVO",tel_jug:"56934269846",tel_apo:"+56975785348"},
  {rut:"23969759-3",nombre:"Felipe Aliaga Sáez",estado:"ACTIVO",tel_jug:"56923657247",tel_apo:"56984076817"},
  {rut:"25968117-0",nombre:"Fernando Piña",estado:"ACTIVO"},
  {rut:"24006714-5",nombre:"Francisco Riveros",estado:"NEW"},
  {rut:"23935939-6",nombre:"Franco Hernandez",estado:"ACTIVO",tel_jug:"56923821556",tel_apo:"+56988326213"},
  {rut:"24140100-6",nombre:"Gabriel Guarda Aguila",estado:"ACTIVO",tel_jug:"56942567912",tel_apo:"953221598"},
  {rut:"23912509-3",nombre:"Gabriel Mujica Norambuena",estado:"ACTIVO",tel_jug:"56973361341",tel_apo:"56973361341"},
  {rut:"23947193-5",nombre:"Gabriel Nuñez",estado:"ACTIVO"},
  {rut:"24059425-0",nombre:"Gaspar Labraña Ahumada",estado:"ACTIVO",tel_jug:"56954191492",tel_apo:"56976495169"},
  {rut:"29151274-7",nombre:"Gustavo Angulo Sanchez",estado:"ACTIVO"},
  {rut:"28427439-3",nombre:"Hansel Ulloque Miranda",estado:"ACTIVO",tel_jug:"56 9 6849 8721",tel_apo:"56985991224"},
  {rut:"28342357-3",nombre:"Hedickson Puerta",estado:"ACTIVO"},
  {rut:"23955427-k",nombre:"Jairo Ignacio Zúñiga Peña",estado:"ACTIVO",tel_jug:"56932367232",tel_apo:"56932367232"},
  {rut:"27206130-0",nombre:"Javier Salas",estado:"ACTIVO"},
  {rut:"24394048-6",nombre:"Jhonny Zarate",estado:"ACTIVO",tel_jug:"+56941812965",tel_apo:"+56941812965"},
  {rut:"28967155-2",nombre:"Joaquin Araque Mota",estado:"ACTIVO",tel_jug:"56961006849",tel_apo:"+56987543486"},
  {rut:"24200863-4",nombre:"Joaquin Villagran",estado:"ACTIVO"},
  {rut:"1034304817",nombre:"Juan Perez",estado:"ACTIVO",tel_jug:"56920515109",tel_apo:"56920515109"},
  {rut:"24806364-5",nombre:"Lionel Diaz Gonzalez",estado:"ACTIVO"},
  {rut:"24001511-0",nombre:"Marcos Barrientos",estado:"ACTIVO",tel_jug:"56951696990",tel_apo:"951696990"},
  {rut:"23842797-5",nombre:"Martin Abaroa",estado:"NEW"},
  {rut:"23849002-2",nombre:"Martin Quiroga Sepulveda",estado:"ACTIVO",tel_jug:"56920526898",tel_apo:"+56994705459"},
  {rut:"23850434-1",nombre:"Martin Sepulveda",estado:"ACTIVO",tel_jug:"+56926384604",tel_apo:"56965674634"},
  {rut:"24517067-k",nombre:"Mateo Villavicencio",estado:"ACTIVO"},
  {rut:"26264403-0",nombre:"Mathias Fernandez",estado:"ACTIVO"},
  {rut:"27082269-k",nombre:"Mathias Rivas",estado:"ACTIVO",tel_jug:"56953176661",tel_apo:"+56953176661"},
  {rut:"27830860-k",nombre:"Matias Herrera",estado:"ACTIVO",tel_jug:"+56962086982",tel_apo:"+56985032465"},
  {rut:"24095515-6",nombre:"Maximiliano Gomez",estado:"ACTIVO",tel_jug:"56956600218",tel_apo:"+56983652378"},
  {rut:"24465038-4",nombre:"Miguel Espinoza",estado:"ACTIVO"},
  {rut:"27605665-4",nombre:"Miguel Oberto",estado:"ACTIVO"},
  {rut:"27610783-6",nombre:"Nickolas Colina Sánchez",estado:"ACTIVO",tel_jug:"56946192326",tel_apo:"56946192426"},
  {rut:"26785531-5",nombre:"Nicolas Carriel Sanchez",estado:"ACTIVO",tel_jug:"+56935639822",tel_apo:"+56935639822"},
  {rut:"23853748-7",nombre:"Omar Ceron",estado:"ACTIVO"},
  {rut:"23866771-2",nombre:"Patricio Urra Ulloque",estado:"ACTIVO",tel_jug:"56973764855",tel_apo:"56974705873"},
  {rut:"28966313-4",nombre:"Rodrigo Araque Mota",estado:"ACTIVO",tel_jug:"56987543486",tel_apo:"+56987543486"},
  {rut:"24763749-4",nombre:"Salvador Ibacache",estado:"ACTIVO",tel_jug:"56926320615",tel_apo:"+56923761198"},
  {rut:"26792604-2",nombre:"Samuel Sebastiani Brito",estado:"ACTIVO",tel_jug:"56936257168",tel_apo:"+56994788622"},
  {rut:"24905924-2",nombre:"Santiago Contreras",estado:"FULL"},
  {nombre:"Santiago Diaz Huilipan",estado:"DESACTIVADO"},
  {rut:"27082853-1",nombre:"Sebastian Gutierrez Vasquez",estado:"ACTIVO"},
  {rut:"24188721-9",nombre:"Sebastian Muñoz",estado:"ACTIVO",tel_jug:"56941657384",tel_apo:"+56939584414"},
  {rut:"28013188-1",nombre:"Sebastian Villarroel",estado:"ACTIVO",tel_jug:"56959785609",tel_apo:"+56957120871"},
  {rut:"24244122-2",nombre:"Thomas Campos",estado:"ACTIVO"},
  {rut:"23848075-2",nombre:"Thomas Cornejo",estado:"NEW"},
  {rut:"24384074-0",nombre:"Tomas Pinuer Cuevas",estado:"ACTIVO",tel_jug:"56978058380",tel_apo:"+56940292942"},
  {rut:"24311982-0",nombre:"Vicente Gomez Lazo",estado:"ACTIVO",tel_jug:"56981387057",tel_apo:"+56981387057"},
  {rut:"24075573-4",nombre:"Vicente Ibacache",estado:"ACTIVO",tel_jug:"56923909510",tel_apo:"+56923761198"},
];

const MAIPU: RawPlayer[] = [
  {nombre:"Aaron Varela",estado:"DESACTIVADO"},
  {rut:"100788201-3",nombre:"Abraham Rondon Rivero",estado:"NEW"},
  {rut:"24108119-2",nombre:"Agustin Palma Morales",estado:"NEW"},
  {rut:"27176480-4",nombre:"Alexander Angarita",estado:"FULL"},
  {nombre:"Alexander Garcia",estado:"NEW"},
  {rut:"23661037-3",nombre:"Alexander Gonzalez Lauquen",estado:"NEW",tel_jug:"56936494156",tel_apo:"+56972119468"},
  {rut:"27341341-3",nombre:"Alexander Zavaleta Delgado",estado:"NEW",tel_jug:"56940984448",tel_apo:"+56940984448"},
  {rut:"24190594-2",nombre:"Alonso Farias Chavez",estado:"NEW"},
  {rut:"23187330-9",nombre:"Alonso Mora Baeza",estado:"NEW",tel_jug:"+56944988386",tel_apo:"966179309"},
  {rut:"23979978-7",nombre:"Alonso Moreira Peñailillo",estado:"NEW",tel_jug:"56961394999",tel_apo:"+56961394999"},
  {rut:"23382067-9",nombre:"Alonso Ortega Lopez",estado:"NEW"},
  {rut:"23398668-2",nombre:"Axel Calficoy González",estado:"NEW",tel_jug:"983476376",tel_apo:"964585132"},
  {rut:"22723136-K",nombre:"Benjamin Rojas Diaz",estado:"NEW",tel_jug:"56982565794",tel_apo:"+56993074620"},
  {rut:"24206033-4",nombre:"Damian Hernandez Campos",estado:"NEW",tel_jug:"929939382",tel_apo:"935370274"},
  {rut:"27731186-0",nombre:"Dammen Nasser Zouehid",estado:"NEW"},
  {rut:"24229713-k",nombre:"Ezequiel Gomez Mejias",estado:"NEW",tel_jug:"56958456512",tel_apo:"+56935244366"},
  {rut:"28599817-4",nombre:"Fedlenstherly St vil Cajuste",estado:"NEW",tel_jug:"+56945448329",tel_apo:"+56945448329"},
  {rut:"22917394-4",nombre:"Fernando Moris Villaseca",estado:"NEW"},
  {rut:"22762987-8",nombre:"Franco Martinez Molina",estado:"NEW",tel_jug:"+56 9 9243 0259",tel_apo:"931102136"},
  {nombre:"Gaspar Ruiz",estado:"NEW"},
  {rut:"23026418-k",nombre:"Jean Paul Ferrada Parra",estado:"NEW"},
  {rut:"23708180-3",nombre:"Joaquin Gallardo Ortega",estado:"NEW",tel_jug:"56931722190",tel_apo:"56920705128"},
  {rut:"24196942-8",nombre:"Jose Brisso Medina",estado:"DESACTIVADO",tel_jug:"+56 9 2932 7466",tel_apo:"971731123"},
  {rut:"23534459-9",nombre:"Joseph Valladolid Garcia",estado:"NEW"},
  {rut:"24182066-1",nombre:"Kevin Carrasco Diaz",estado:"NEW",tel_jug:"+56936647242",tel_apo:"+56932923771"},
  {rut:"22724341-4",nombre:"Martin Astorga Acosta",estado:"NEW"},
  {rut:"23499252-k",nombre:"Martin Herrera Fuentes",estado:"NEW",tel_jug:"56934047332",tel_apo:"+56966551430"},
  {rut:"23675259-3",nombre:"Matias Railaf Curaqueo",estado:"NEW",tel_jug:"56941516426",tel_apo:"+56984152582"},
  {rut:"23706097-0",nombre:"Maximiliano Vivanco Navarro",estado:"NEW"},
  {rut:"23557741-0",nombre:"Philippe Ruminot Quilapan",estado:"NEW"},
  {rut:"26974206-2",nombre:"Sebastean Gomez Diaz",estado:"NEW",tel_jug:"+56923766633",tel_apo:"+56975852020"},
  {rut:"BC051900",nombre:"Sebastian Rendon Escobar",estado:"NEW"},
  {rut:"23633933-5",nombre:"Tomas Miranda Díaz",estado:"NEW",tel_jug:"56987810986",tel_apo:"+56959561726"},
];

const FEMENINO: RawPlayer[] = [
  {nombre:"Alexandra Leonardi",estado:"DESACTIVADO"},
  {nombre:"Camila Villablanca",estado:"ACTIVO"},
  {nombre:"Carla Salazar",estado:"DESACTIVADO"},
  {nombre:"Carolina Alfaro",estado:"FULL"},
  {nombre:"Claudia Norambuena",estado:"DESACTIVADO"},
  {nombre:"Claudia Vera",estado:"DESACTIVADO"},
  {nombre:"Javiera Constanzo",estado:"DESACTIVADO"},
  {nombre:"Javiera Eyzaguirre",estado:"ACTIVO"},
  {nombre:"Javiera Garces",estado:"DESACTIVADO"},
  {nombre:"Javiera Portilla",estado:"DESACTIVADO"},
  {nombre:"Kabili Quiñones",estado:"DESACTIVADO"},
  {nombre:"Laura Gallardo",estado:"ACTIVO"},
  {nombre:"Marcela Bravo",estado:"DESACTIVADO"},
  {nombre:"Mary Llanos",estado:"ACTIVO"},
  {nombre:"Maria Jose Klove",estado:"DESACTIVADO"},
  {nombre:"Maria Jose Tellechea",estado:"ACTIVO"},
  {nombre:"Maricel Secue",estado:"LESIONADO"},
  {nombre:"Mariela Llanos",estado:"ACTIVO"},
  {nombre:"Marjorie Zambra",estado:"ACTIVO"},
  {nombre:"Nicole Yañez",estado:"ACTIVO"},
  {nombre:"Paz Fernandez",estado:"DESACTIVADO"},
  {nombre:"Rocio Mariluan",estado:"DESACTIVADO"},
  {nombre:"Stefanny Cardona",estado:"ACTIVO"},
  {nombre:"Valeska Orellana",estado:"DESACTIVADO"},
];

const SENIOR_AM: RawPlayer[] = [
  {nombre:"Aaron Montilla",estado:"LESIONADO",tel_jug:"+56985609048"},
  {nombre:"Andres Valenzuela Salcedo",estado:"LESIONADO",tel_jug:"+56966447899"},
  {nombre:"Andres Zanetta",estado:"ACTIVO",tel_jug:"+569 96412380"},
  {nombre:"Andres Zarzar"},
  {nombre:"Ariel Andre Martínez Moreno"},
  {nombre:"Ariel Carrion",estado:"DESACTIVADO"},
  {nombre:"Bernardo Atuesta",estado:"LESIONADO",tel_jug:"+56942713755"},
  {nombre:"Bladimir Barillad",estado:"ACTIVO",tel_jug:"82295413"},
  {nombre:"Carlos Dietert",estado:"DESACTIVADO"},
  {nombre:"Carlos Espinosa",estado:"FULL",tel_jug:"+56962289452"},
  {nombre:"Carlos Soto",estado:"DESACTIVADO"},
  {nombre:"Charles Riquelme",estado:"ACTIVO",tel_jug:"+56982530749"},
  {nombre:"Claudio Silva",estado:"LESIONADO",tel_jug:"+56996570230"},
  {nombre:"Cristian Gatica",estado:"ACTIVO",tel_jug:"+56973003566"},
  {nombre:"Daniel Alvarez",estado:"DESACTIVADO",tel_jug:"+56989610309"},
  {nombre:"Daniel Eduardo Arellano Rocha",estado:"DESACTIVADO",tel_jug:"+56981366202"},
  {nombre:"Danko Zvonimir Lucic Valenzuela",estado:"ACTIVO",tel_jug:"+56982163279"},
  {nombre:"David Gutierrez",estado:"ACTIVO",tel_jug:"+56962463545"},
  {nombre:"Diego Gutierrez",estado:"DESACTIVADO"},
  {nombre:"Diego Salas",estado:"ACTIVO",tel_jug:"+56979067255"},
  {nombre:"Diego Smythe",estado:"DESACTIVADO"},
  {nombre:"Eduardo Gallardo",estado:"DESACTIVADO",tel_jug:"+56994929939"},
  {nombre:"Eduardo Zapata",estado:"DESACTIVADO",tel_jug:"+56945535060"},
  {nombre:"Esteban Gonzalez",estado:"ACTIVO",tel_jug:"+56976217538"},
  {nombre:"Fabian Ilich",estado:"DESACTIVADO",tel_jug:"+56965716426"},
  {nombre:"Federico Galeotti",estado:"ACTIVO"},
  {nombre:"Felipe Andrés Ulloa Benítez",estado:"ACTIVO",tel_jug:"+56981215362"},
  {nombre:"Felipe Mellado",estado:"NEW",tel_jug:"+56945990022"},
  {nombre:"Fernando Agurto",estado:"DESACTIVADO"},
  {nombre:"Franco Avendaño"},
  {nombre:"Gerson Lopez",estado:"ACTIVO",tel_jug:"9 4045 5811"},
  {nombre:"Giovanni Borroni",estado:"DESACTIVADO",tel_jug:"+56982194076"},
  {nombre:"Gonzalo Esveile",estado:"LESIONADO",tel_jug:"+56982472863"},
  {nombre:"Ignacio Alamos",estado:"DESACTIVADO"},
  {nombre:"Ignacio Muñoz",estado:"ACTIVO",tel_jug:"+56997731749"},
  {nombre:"Ignacio Ribera",estado:"ACTIVO",tel_jug:"+56993222059"},
  {nombre:"Ignacio Torres",estado:"DESACTIVADO",tel_jug:"+56965092724"},
  {nombre:"Isaias Gonzalez",estado:"ACTIVO",tel_jug:"+56968471483"},
  {nombre:"Jairo Prieto",estado:"ACTIVO",tel_jug:"+5962026756"},
  {nombre:"Jeremy Chacon",estado:"DESACTIVADO"},
  {nombre:"Joaquín Villagrán",estado:"DESACTIVADO",tel_jug:"+56982489602"},
  {nombre:"Jonathan Zapata",estado:"DESACTIVADO"},
  {nombre:"Jose Luis Jara",estado:"DESACTIVADO",tel_jug:"+56934199704"},
  {nombre:"Juan Carlos Sanchez",estado:"DESACTIVADO",tel_jug:"+56976958309"},
  {nombre:"Juan Morales",estado:"ACTIVO",tel_jug:"+56967275170"},
  {nombre:"Luis Ulloa",estado:"ACTIVO",tel_jug:"+56999436413"},
  {nombre:"Manuel Leal",estado:"ACTIVO",tel_jug:"+56971024774"},
  {nombre:"Marcelo Alejandro Zamora Rojas",estado:"ACTIVO",tel_jug:"994446251"},
  {nombre:"Matias Canales",estado:"DESACTIVADO",tel_jug:"+56988382502"},
  {nombre:"Matias Sabaj"},
  {nombre:"Miguel Angel Moreno Pinilla",estado:"DESACTIVADO",tel_jug:"+56994670767"},
  {nombre:"Nelson Valenzuela",estado:"ACTIVO",tel_jug:"+56973876453"},
  {nombre:"Nicolas Fernando Muñoz Muñoz",estado:"ACTIVO",tel_jug:"+56999609711"},
  {nombre:"Rudy Valderrama",estado:"ACTIVO",tel_jug:"+56949659148"},
  {nombre:"Samuel Marcelo",estado:"DESACTIVADO"},
  {nombre:"Sebastian Arias García",estado:"ACTIVO",tel_jug:"+56966987590"},
  {nombre:"Sebastian Bravo",estado:"ACTIVO",tel_jug:"+569 76277560"},
  {nombre:"Sebastian Carvallo",estado:"ACTIVO",tel_jug:"+56942053878"},
  {nombre:"Sebastian Cifuentes",estado:"DESACTIVADO",tel_jug:"+56976889331"},
  {nombre:"Sebastian Iglesias",estado:"DESACTIVADO",tel_jug:"+56996184371"},
  {nombre:"Sebastian Nuñez",estado:"ACTIVO",tel_jug:"+56967892364"},
  {nombre:"Sergio Leon Rios",estado:"ACTIVO",tel_jug:"+56922009705"},
  {nombre:"Sergio Tamayo",estado:"DESACTIVADO",tel_jug:"+56977590451"},
  {nombre:"Vicente White",estado:"DESACTIVADO",tel_jug:"+56942804359"},
  {nombre:"Xavier Sanchez",estado:"DESACTIVADO",tel_jug:"+56935130943"},
];

const SENIOR_PM: RawPlayer[] = [
  {nombre:"Agustin Aguirre Bermudez"},{nombre:"Agustín Núñez Cox"},{nombre:"Agustin Olivares"},
  {nombre:"Alan Fuentes"},{nombre:"Alejandro Carcamo"},{nombre:"Andres Birchmeier"},
  {nombre:"Armando Jose Ocanto"},{nombre:"Bruno Leporati Chiuminatto"},{nombre:"Bruno Marticnago"},
  {nombre:"Bryan Hidalgo"},{nombre:"Carlos Andrés Ruiz Lecaros"},{nombre:"Carlos Aracena"},
  {nombre:"Carlos Bozzo"},{nombre:"Cesar Palza"},{nombre:"Claudio Nuñez"},
  {nombre:"Claudio Silva"},{nombre:"Cristian Montoya"},{nombre:"Cristian Yañez"},
  {nombre:"Daniel Morales"},{nombre:"Diego Castro"},{nombre:"Diego Franco Salazar Leiva"},
  {nombre:"Diego Ignacio Sierra Saavedra"},{nombre:"Diego Zaldivar"},{nombre:"Eduardo Cortes"},
  {nombre:"Eduardo Mallegas"},{nombre:"Edwin Hogson"},{nombre:"Ezequiel Penido"},
  {nombre:"Ezequiel Tosi"},{nombre:"Felipe Alvarez"},{nombre:"Fernando Delgado"},
  {nombre:"Francisco Gonzalez"},{nombre:"Gabriel Diaz"},{nombre:"Gonzalo Salgeira"},
  {nombre:"Guillermo Gamboa"},{nombre:"Gustavo Rothkegel"},{nombre:"Hector Sepulveda"},
  {nombre:"Ignacio Benavides"},{nombre:"Ignacio Martinez"},{nombre:"Ignacio Stockebrand"},
  {nombre:"Jaime Guillermo Huanquilef Jerez"},{nombre:"Jefferson Arévalo"},{nombre:"Jerson Cespedes"},
  {nombre:"Joaquin Alvarado Bertoni"},{nombre:"Joaquin Leiva"},{nombre:"Joaquin Marchant"},
  {nombre:"Jose Marambio"},{nombre:"Juan Luis Aracena"},{nombre:"Juan Pablo Lobos Sánchez"},
  {nombre:"Juan Villaman"},{nombre:"Leonardo Pavez"},{nombre:"Luis Pereira"},
  {nombre:"Martin Galarza"},{nombre:"Mateo Diaz"},{nombre:"Maximiliano Baldarrago"},
  {nombre:"Maximiliano Cavada"},{nombre:"Miguel Andres Baeza Gajardo"},{nombre:"Murilo Louvise"},
  {nombre:"Nelson Brito"},{nombre:"Never Acosta Miranda"},{nombre:"Nicolás Antonio Pino Leva"},
  {nombre:"Nicolas Gonzalez"},{nombre:"Nicolas Tasso"},{nombre:"Nikita Trepstov"},
  {nombre:"Osvaldo Ovalle"},{nombre:"Pablo Ortiz"},{nombre:"Patricio Bustos"},
  {nombre:"Rodrigo Díaz"},{nombre:"Rodrigo Escobedo"},{nombre:"Ruben Morales"},
  {nombre:"Rudy Valderrama"},{nombre:"Tomas Alarcon"},
];

const ALL_CATEGORIES: CategoryData[] = [
  { sede: "LAS CONDES", categoria: "SUB-18 A.R", tipo: "COMPETITIVO", jugadores: LC_SUB18_AR },
  { sede: "LAS CONDES", categoria: "SUB-18 COMP", tipo: "COMPETITIVO", jugadores: LC_SUB18_COMP },
  { sede: "LAS CONDES", categoria: "SUB-16 A.R", tipo: "COMPETITIVO", jugadores: LC_SUB16_AR },
  { sede: "LAS CONDES", categoria: "SUB-16 COMP", tipo: "COMPETITIVO", jugadores: LC_SUB16_COMP },
  { sede: "PEÑALOLEN", categoria: "SUB-18", tipo: "COMPETITIVO", jugadores: PEN_SUB18 },
  { sede: "PEÑALOLEN", categoria: "SUB-16 A.R", tipo: "COMPETITIVO", jugadores: PEN_SUB16_AR },
  { sede: "PEÑALOLEN", categoria: "SUB-16 COMP", tipo: "COMPETITIVO", jugadores: PEN_SUB16_COMP },
  { sede: "PEÑALOLEN", categoria: "SUB-14", tipo: "COMPETITIVO", jugadores: PEN_SUB14 },
  { sede: "MAIPU", categoria: "SUB-16", tipo: "COMPETITIVO", jugadores: MAIPU },
  { sede: "PEÑALOLEN", categoria: "FEMENINO", tipo: "COMPETITIVO", jugadores: FEMENINO },
  { sede: "PEÑALOLEN", categoria: "SENIOR AM", tipo: "RECREATIVO", jugadores: SENIOR_AM },
  { sede: "PEÑALOLEN", categoria: "SENIOR PM", tipo: "RECREATIVO", jugadores: SENIOR_PM },
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

  for (const cat of ALL_CATEGORIES) {
    const sedeId = sedeMap[cat.sede];
    if (!sedeId) {
      results[`${cat.sede} / ${cat.categoria}`] = { inserted: 0, skipped: 0, errors: [`Sede ${cat.sede} not found`] };
      continue;
    }

    // Create category if it doesn't exist
    const { data: existingCat } = await supabase
      .from("categorias")
      .select("id")
      .eq("sede_id", sedeId)
      .eq("nombre", cat.categoria)
      .maybeSingle();

    let categoriaId: string;
    if (existingCat) {
      categoriaId = existingCat.id;
    } else {
      const { data: newCat, error: catErr } = await supabase
        .from("categorias")
        .insert({ sede_id: sedeId, nombre: cat.categoria, tipo: cat.tipo })
        .select("id")
        .single();
      if (catErr || !newCat) {
        results[`${cat.sede} / ${cat.categoria}`] = { inserted: 0, skipped: 0, errors: [`Failed to create category: ${catErr?.message}`] };
        continue;
      }
      categoriaId = newCat.id;
    }

    const errors: string[] = [];

    // Build all RUTs for this category
    const rows = cat.jugadores.map((j) => {
      const rut = j.rut?.trim() || `SIN-RUT-${j.nombre.replace(/\s+/g, "-").substring(0, 30)}`;
      return {
        rut,
        nombre: j.nombre.trim(),
        estado: normalizeEstado(j.estado),
        sede_id: sedeId,
        categoria_id: categoriaId,
        telefono_jugador: normalizeTel(j.tel_jug),
        telefono_apoderado: normalizeTel(j.tel_apo),
      };
    });

    // Get existing RUTs to skip
    const ruts = rows.map((r) => r.rut);
    const { data: existingPlayers } = await supabase
      .from("jugadores")
      .select("rut")
      .in("rut", ruts);
    const existingRuts = new Set((existingPlayers ?? []).map((p) => p.rut));

    const toInsert = rows.filter((r) => !existingRuts.has(r.rut));
    const skipped = rows.length - toInsert.length;
    let inserted = 0;

    if (toInsert.length > 0) {
      // Insert in batches of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { error, data } = await supabase.from("jugadores").insert(batch).select("id");
        if (error) {
          errors.push(`Batch ${i}: ${error.message}`);
        } else {
          inserted += data.length;
        }
      }
    }

    results[`${cat.sede} / ${cat.categoria}`] = { inserted, skipped, errors };
  }

  const totalInserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
  const totalSkipped = Object.values(results).reduce((s, r) => s + r.skipped, 0);

  return NextResponse.json({ totalInserted, totalSkipped, results });
}
