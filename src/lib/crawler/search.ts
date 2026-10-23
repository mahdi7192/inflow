// Keyword search over site_pages (no embeddings; Persian/English tolerant).
import { getDb } from "@/lib/db";

export interface SiteSearchHit {
  title: string;
  excerpt: string;
  url: string;
  kind: string;
}

function norm(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u064b-\u0652]/g, " ")
    .toLowerCase();
}

const STOP = new Set([
  "و", "در", "به", "از", "که", "را", "با", "این", "آن", "برای",
  "the", "a", "of", "is", "to", "and", "چنده", "چقدر", "هست", "است",
  "میخوام", "می", "من", "شما", "چیست", "دارید", "لطفا", "لطفاً", "سلام"
]);

const PRICE_INTENT_WORDS = new Set(["قیمت", "هزینه", "نرخ", "چنده", "چقدر", "تومان", "ریال"]);

export function tokenize(q: string): string[] {
  return Array.from(new Set(norm(q).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2 && !STOP.has(t))));
}

export function extractVariantsAndPrices(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const found: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    if (l.includes("تومان") || l.includes("ریال")) {
      const clean = l.replace(/\s+/g, " ").trim();
      if (!seen.has(clean) && clean.length <= 150) {
        seen.add(clean);
        found.push(clean);
      }
    }
  }
  return found;
}

export function searchSite(account: string, query: string, limit = 4): SiteSearchHit[] {
  const rows = getDb()
    .prepare("SELECT url, title, content_text, kind, score FROM site_pages WHERE account_username = ? AND title != 'customer'")
    .all(account) as Array<{ url: string; title: string; content_text: string; kind: string; score: number }>;
  const tokens = tokenize(query);
  if (!rows.length) return [];

  // Check if query is specifically asking for price/variants
  const rawNorm = norm(query);
  const hasPriceIntent = Array.from(PRICE_INTENT_WORDS).some((w) => rawNorm.includes(w));
  // Specific product keywords (excluding pure price words)
  const productTokens = tokens.filter((t) => !PRICE_INTENT_WORDS.has(t));
  const activeTokens = productTokens.length > 0 ? productTokens : tokens;

  const scored = rows.map((r) => {
    const t = norm(r.title);
    const c = norm(r.content_text);
    const u = norm(decodeURIComponentSafe(r.url));
    const hasPrices = c.includes("تومان") || c.includes("ریال");
    let s = 0;

    for (const tok of activeTokens) {
      if (t === tok) s += 20;
      else if (t.includes(tok)) s += 10;
      if (u.includes(tok)) s += 5;
      const n = c.split(tok).length - 1;
      if (n > 0) s += Math.min(n, 5) * 2;
    }

    // Bonus if user asks for price and page actually has prices
    if (hasPriceIntent && hasPrices) {
      s += 3;
    }

    // Specific product pages (usually shorter than large categories) get priority when matching title
    if (r.content_text.length < 3000 && activeTokens.some((tok) => t.includes(tok))) {
      s += 5;
    }

    return { r, s: activeTokens.length ? s : 0, bonus: r.score / 100 };
  });

  const hits = scored.filter((x) => x.s > 0).sort((a, b) => b.s + b.bonus - (a.s + a.bonus)).slice(0, limit);
  return hits.map(({ r }) => ({
    title: r.title,
    url: r.url,
    kind: r.kind,
    excerpt: smartExcerpt(r.content_text, r.title, activeTokens),
  }));
}

function decodeURIComponentSafe(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function smartExcerpt(text: string, title: string, tokens: string[]): string {
  const clean = text.replace(/\r/g, "").trim();
  const prices = extractVariantsAndPrices(clean);

  // If page is compact (<= 2500 chars), return all variants + full text so NO details or prices are lost
  if (clean.length <= 2500) {
    let header = "";
    if (prices.length > 0) {
      header = `[واریانت‌ها و قیمت‌های موجود در این صفحه]:\n` + prices.map((p) => `• ${p}`).join("\n") + "\n\n";
    }
    return header + clean;
  }

  // For multi-product pages or category pages (> 2500 chars):
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const normLines = lines.map((l) => norm(l));

  // Find line matching the product token
  let matchLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    for (const t of tokens) {
      if (normLines[i].includes(t)) {
        matchLineIdx = i;
        break;
      }
    }
    if (matchLineIdx >= 0) break;
  }

  if (matchLineIdx >= 0) {
    // Isolate the product block around this matched line
    let startLine = matchLineIdx;
    while (startLine > 0 && !lines[startLine - 1].includes("تومان") && !lines[startLine - 1].includes("ریال") && startLine > matchLineIdx - 4) {
      startLine--;
    }

    let endLine = matchLineIdx;
    let seenPrice = false;
    while (endLine < lines.length - 1 && endLine < matchLineIdx + 12) {
      endLine++;
      if (lines[endLine].includes("تومان") || lines[endLine].includes("ریال")) {
        seenPrice = true;
      } else if (seenPrice) {
        break;
      }
    }

    const block = lines.slice(startLine, endLine + 1).join("\n");
    const blockPrices = extractVariantsAndPrices(block);
    let header = "";
    if (blockPrices.length > 0) {
      header = `[واریانت‌ها و قیمت‌های محصول مرتبط]:\n` + blockPrices.map((p) => `• ${p}`).join("\n") + "\n\n";
    }
    return header + block;
  }

  // Fallback if no specific line matched tokens: list products with prices
  if (prices.length > 0) {
    return (
      `[لیست محصولات و قیمت‌های موجود در این دسته/صفحه]:\n` +
      prices.slice(0, 15).map((p) => `• ${p}`).join("\n") +
      "\n\n" +
      clean.slice(0, 1000)
    );
  }

  return clean.slice(0, 1200);
}

export function isInternalPageUrl(account: string, url: string): string | null {
  const rows = getDb().prepare("SELECT url FROM site_pages WHERE account_username = ?").all(account) as { url: string }[];
  const strip = (x: string) => x.replace(/#.*$/, "").replace(/\/+$/, "");
  const target = strip(url.trim());
  const found = rows.find((r) => strip(r.url) === target);
  return found ? found.url : null;
}
