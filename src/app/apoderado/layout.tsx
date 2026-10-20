import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

export default async function ApoderadoLayout({
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

  const role = profile?.role ?? "apoderado";
  const nombre = profile?.nombre ?? user.email ?? "";

  return (
    <>
      <Navbar role={role} nombre={nombre} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </>
  );
}
