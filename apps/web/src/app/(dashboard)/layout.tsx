import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/ui/dashboard-layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <DashboardLayout profile={profile}>
      {children}
    </DashboardLayout>
  );
}
