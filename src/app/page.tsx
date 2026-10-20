import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "entrenador" || profile?.role === "admin") {
    redirect("/entrenador/asistencia");
  }

  if (profile?.role === "apoderado") {
    redirect("/apoderado");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Acción Fútbol</h1>
        <p className="text-muted-foreground">
          Tu cuenta aún no tiene un perfil asignado.
        </p>
        <p className="text-sm text-muted-foreground">
          Contacta al administrador para que te asigne un rol.
        </p>
        <p className="text-xs text-muted-foreground">
          {user.email}
        </p>
      </div>
    </div>
  );
}
