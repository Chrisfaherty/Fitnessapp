import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MealPlanBuilder } from "@/components/trainer/meal-plan-builder";

export const metadata: Metadata = { title: "New Meal Plan" };

interface LinkedClient {
  client_id: string;
  profiles: { id: string; full_name: string } | null;
}

export default async function NewMealPlanPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    redirect("/client");
  }

  // Fetch trainer's active linked clients for the client dropdown
  const { data: rawLinks } = await supabase
    .from("trainer_clients")
    .select(
      "client_id, profiles!trainer_clients_client_id_fkey(id, full_name)"
    )
    .eq("trainer_id", user.id)
    .eq("active", true)
    .order("client_id");

  const clients = ((rawLinks ?? []) as unknown as LinkedClient[])
    .filter((l) => l.profiles !== null)
    .map((l) => ({
      id: l.client_id,
      full_name: l.profiles!.full_name,
    }));

  return <MealPlanBuilder clients={clients} />;
}
