import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

export default async function AdminLayout({
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

  if (!profile || profile.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full">
      <Navbar role={profile.role} nombre={profile.nombre} />
      <main className="flex-1 md:ml-56">
        <div className="mx-auto w-full max-w-6xl p-4">{children}</div>
      </main>
    </div>
  );
}
