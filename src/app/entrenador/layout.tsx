import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

export const metadata: Metadata = {
  title: "Entrenador — Acción Fútbol",
};

export default async function EntrenadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nombre")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "entrenador" && profile.role !== "admin")) {
    redirect("/apoderado");
  }

  return (
    <div className="flex min-h-full">
      <Navbar role={profile.role} nombre={profile.nombre} />
      <main className="flex-1 md:ml-56">
        <div className="mx-auto w-full max-w-5xl p-4">{children}</div>
      </main>
    </div>
  );
}
