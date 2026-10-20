import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

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
    <>
      <Navbar role={profile.role} nombre={profile.nombre} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </>
  );
}
