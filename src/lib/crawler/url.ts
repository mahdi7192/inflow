// URL helpers: canonicalization, same-site checks, page classification/scoring.

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|igshid|mc_|ref$|ref_|_ga|yclid|msclkid)/i;
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "edu", "ac", "ir", "id"]);

export function normalizeSiteInput(raw: string): URL | null {
  const t = (raw || "").trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

/** Approximate registrable domain (handles co.uk / com.au / ir style suffixes). */
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return h;
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (last.length === 2 && SECOND_LEVEL.has(prev) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

export function isSameSite(host: string, rootHost: string): boolean {
  const a = registrableDomain(host);
  const b = registrableDomain(rootHost);
  return a === b && (host === rootHost || host.toLowerCase().endsWith(`.${a}`) || host.toLowerCase() === a);
}

export function canonicalizeUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
    const keep: Array<[string, string]> = [];
    u.searchParams.forEach((v, k) => {
      if (!TRACKING_PARAMS.test(k)) keep.push([k, v]);
    });
    keep.sort((a, b) => a[0].localeCompare(b[0]));
    u.search = "";
    for (const [k, v] of keep) u.searchParams.append(k, v);
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString();
  } catch {
    return null;
  }
}

const SKIP_PATH =
  /(\/cart|\/checkout|\/basket|\/login|\/signin|\/sign-in|\/register|\/signup|\/my-account|\/account|\/wp-admin|\/wp-login|\/wp-json|\/feed(\/|$)|\/tag\/|\/tags\/|\/author\/|\/search|\/page\/\d+|\/wishlist|\/compare|\/cdn-cgi|\/xmlrpc|\/\?s=|سبد-خرید|\/ورود|\/عضویت)/i;
const SKIP_EXT = /\.(jpe?g|png|gif|webp|svg|ico|pdf|zip|rar|mp4|mp3|avi|mov|css|js|json|xml|woff2?|ttf|eot|docx?|xlsx?|pptx?)$/i;
const SKIP_QUERY = /(^|&)(s|q|search|query|orderby|order|sort|filter[^=]*|add-to-cart|page|paged|p|replytocom|share)=/i;

export function isSkippableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname);
    if (SKIP_EXT.test(path)) return true;
    if (SKIP_PATH.test(path)) return true;
    if (u.search && SKIP_QUERY.test(u.search.slice(1))) return true;
    return false;
  } catch {
    return true;
  }
}

export type PageKind = "product" | "service" | "pricing" | "contact" | "shipping" | "faq" | "about" | "blog" | "other";

const KIND_RULES: Array<[PageKind, RegExp, number]> = [
  ["pricing", /(pricing|price|prices|plans?|tariff|قیمت|تعرفه|پلن|لیست-قیمت)/i, 90],
  ["product", /(\/products?\/|\/product-|\/shop\/|\/item\/|\/p\/|\/store\/|محصول|محصولات|فروشگاه|خرید)/i, 85],
  ["service", /(services?|solutions?|offerings?|خدمات|سرویس|مشاوره|رزرو|booking)/i, 80],
  ["shipping", /(shipping|delivery|returns?|refund|ارسال|حمل|مرجوع|بازگشت|پرداخت|payment|warranty|گارانتی|ضمانت)/i, 75],
  ["contact", /(contact|about-us\/contact|تماس|ارتباط|آدرس|address|location)/i, 78],
  ["faq", /(faq|help|support|questions|rules|terms|policy|سوالات|سؤالات|قوانین|راهنما|شرایط|پشتیبانی)/i, 72],
  ["about", /(about|who-we-are|درباره|معرفی|about-us)/i, 55],
  ["blog", /(blog|news|article|posts?\/|مقاله|وبلاگ|اخبار|بلاگ)/i, 25],
];

export function classifyUrl(url: string, title = ""): { kind: PageKind; score: number } {
  let path = "";
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    path = url;
  }
  const hay = `${path} ${title}`;
  for (const [kind, re, score] of KIND_RULES) {
    if (re.test(hay)) return { kind, score };
  }
  if (path === "/" || path === "") return { kind: "about", score: 60 };
  return { kind: "other", score: 35 };
}
