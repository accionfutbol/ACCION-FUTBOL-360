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

  const { count } = await supabase
    .from("uniformes")
    .select("*", { count: "exact", head: true });

  const { data: sample } = await supabase
    .from("uniformes")
    .select("id, jugador_id, tipo, talla, entregado, fecha_entrega")
    .limit(5);

  const { data: byTipo } = await supabase
    .from("uniformes")
    .select("tipo")
    .limit(10000);

  const tipoCounts: Record<string, number> = {};
  (byTipo ?? []).forEach((u: any) => {
    tipoCounts[u.tipo] = (tipoCounts[u.tipo] || 0) + 1;
  });

  return NextResponse.json({ total: count, por_tipo: tipoCounts, muestra: sample });
}
