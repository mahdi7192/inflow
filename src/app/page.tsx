import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guard";
import { InflowDashboard } from "@/components/inflow-dashboard";

export default async function Home() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return <InflowDashboard currentUser={user} />;
}
