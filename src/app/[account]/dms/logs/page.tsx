import { redirect } from "next/navigation";

interface DmLogsPageProps {
  params: Promise<{ account: string }>;
}

export default async function DmLogsPage({ params }: DmLogsPageProps) {
  const resolvedParams = await params;
  let rawParam = "";
  try {
    rawParam = decodeURIComponent(resolvedParams.account);
  } catch {
    rawParam = resolvedParams.account;
  }

  const username = rawParam.startsWith("@") ? rawParam.slice(1).trim() : rawParam.trim();
  if (!username) {
    redirect("/");
  }

  redirect(`/@${username}/dms`);
}
