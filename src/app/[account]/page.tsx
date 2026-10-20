import { notFound, redirect } from "next/navigation";

interface AccountPageProps {
  params: Promise<{ account: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const resolvedParams = await params;
  let rawParam = "";
  try {
    rawParam = decodeURIComponent(resolvedParams.account);
  } catch {
    rawParam = resolvedParams.account;
  }

  // Reserved paths that should never match an account route
  const reserved = ["login", "backoffice", "api", "media", "favicon.ico", "_next"];
  if (reserved.includes(rawParam.toLowerCase())) {
    notFound();
  }

  const username = rawParam.replace(/^@/, "").trim();
  if (!username) {
    redirect("/");
  }

  // Standardized routing: Comment Automation is at /@{username}/comments
  redirect(`/@${username}/comments`);
}
