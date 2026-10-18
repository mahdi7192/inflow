import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guard";
import { getDb } from "@/lib/db";
import type { AccountRow } from "@/lib/db";
import { AccountSelectorHub } from "@/components/account-selector-hub";
import { EmptyTenancyView } from "@/components/empty-tenancy-view";

export default async function Home() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // If tenant has no assigned accounts, show empty tenancy view
  if (user.role !== "superadmin" && user.assigned_accounts.length === 0) {
    return (
      <EmptyTenancyView
        user={user}
        lang="fa"
        onLogout={async () => {
          "use server";
          redirect("/login");
        }}
      />
    );
  }

  // Fetch accounts accessible by this user
  const db = getDb();
  let accounts: AccountRow[] = [];

  if (user.role === "superadmin") {
    accounts = db
      .prepare("SELECT * FROM accounts ORDER BY created_at DESC")
      .all() as AccountRow[];
  } else {
    accounts = db
      .prepare(
        `SELECT a.* FROM accounts a 
         JOIN user_accounts ua ON a.username = ua.account_username 
         WHERE ua.user_id = ? 
         ORDER BY a.created_at DESC`
      )
      .all(user.id) as AccountRow[];
  }

  return <AccountSelectorHub user={user} accounts={accounts} />;
}
