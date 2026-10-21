"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string>("");
  const [details, setDetails] = useState<{
    displayName?: string;
    socialAccountId?: string;
  }>({});

  const rawUsername = searchParams.get("username") || "";
  const rawAccountId = searchParams.get("account_id") || "";
  const oauthStatus = searchParams.get("status") || "";
  const oauthError = searchParams.get("error") || searchParams.get("error_description") || "";

  useEffect(() => {
    let isMounted = true;

    async function syncAccount() {
      if (oauthError) {
        if (isMounted) {
          setErrorMsg(`خطای احراز هویت از سوی پلتفرم: ${oauthError}`);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("/api/accounts/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            username: rawUsername,
            social_account_id: rawAccountId,
          }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setSuccess(true);
          const uName = data.account?.username || rawUsername || "instagram";
          setResolvedUsername(uName);
          setDetails({
            displayName: data.account?.display_name || uName,
            socialAccountId: data.account?.social_account_id || rawAccountId,
          });
        } else {
          setSuccess(false);
          setErrorMsg(data.error || "خطا در برقراری ارتباط و همگام‌سازی اکانت.");
          if (rawUsername) setResolvedUsername(rawUsername);
        }
      } catch (err) {
        if (!isMounted) return;
        setSuccess(false);
        setErrorMsg((err as Error).message || "ارتباط با سرور برقرار نشد.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    syncAccount();

    return () => {
      isMounted = false;
    };
  }, [rawUsername, rawAccountId, oauthError]);

  const targetDashboardUrl = resolvedUsername ? `/@${resolvedUsername}/comments` : "/";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100" dir="rtl">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader className="text-center pb-2">
          {loading ? (
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : success ? (
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-rose-400" />
            </div>
          )}

          <CardTitle className="text-xl md:text-2xl font-bold">
            {loading
              ? "در حال تایید و نهایی‌سازی اتصال..."
              : success
              ? "اتصال اینستاگرام با موفقیت تایید شد"
              : "خطا در تایید اتصال اکانت"}
          </CardTitle>

          <CardDescription className="text-slate-400 mt-2 text-sm">
            {loading
              ? "در حال ثبت وضعیت حساب در پایگاه داده اینفلو و فعال‌سازی سرویس..."
              : success
              ? "اکانت شما از طریق درگاه رسمی SocialAPI با موفقیت متصل و همگام شد."
              : errorMsg || "عملیات اتصال با مشکل مواجه شد."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {success && (
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">نام کاربری اینستاگرام:</span>
                <span className="font-mono font-medium text-emerald-300 ltr:text-left">
                  @{resolvedUsername}
                </span>
              </div>

              {details.displayName && details.displayName !== resolvedUsername && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">عنوان پیج:</span>
                  <span className="font-medium text-slate-200">{details.displayName}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">وضعیت اتصال سشن:</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  فعال و متصل (Ready)
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">پلتفرم زیرساخت:</span>
                <span className="text-xs text-slate-400 font-mono">SocialAPI Official Gateway</span>
              </div>
            </div>
          )}

          {!loading && !success && (
            <div className="bg-rose-950/20 rounded-xl p-4 border border-rose-900/30 text-rose-300 text-sm">
              <p className="font-medium">پیام خطا:</p>
              <p className="mt-1 text-xs text-rose-400/90 leading-relaxed">
                {errorMsg || "عدم تطبیق اکانت یا انقضای نشست اتصال. لطفاً مجدداً اقدام فرمایید."}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          {success ? (
            <>
              <Button
                asChild
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-5 gap-2 shadow-lg shadow-emerald-950/50"
              >
                <Link href={targetDashboardUrl}>
                  <ArrowRight className="w-4 h-4 ml-1 rotate-180" />
                  بازگشت به پنل مدیریت
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs"
              >
                <Link href="/backoffice">
                  <Home className="w-3.5 h-3.5 ml-1" />
                  مشاهده تمام پیج‌ها در Back-Office
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 gap-2"
              >
                <RefreshCw className="w-4 h-4 ml-1" />
                تلاش مجدد برای همگام‌سازی
              </Button>

              <Button
                asChild
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-5 gap-2"
              >
                <Link href={targetDashboardUrl}>
                  <ArrowRight className="w-4 h-4 ml-1 rotate-180" />
                  بازگشت به پنل
                </Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300" dir="rtl">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin ml-2" />
          <span>در حال بارگذاری صفحه کالبک...</span>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
