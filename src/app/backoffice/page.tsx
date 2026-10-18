import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guard";
import { BackofficeClientView } from "./backoffice-client";

export default async function BackofficePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "superadmin") {
    redirect("/");
  }

  return <BackofficeClientView currentUser={user} />;
}
