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

const STOP = new Set(["و", "در", "به", "از", "که", "را", "با", "این", "آن", "برای", "the", "a", "of", "is", "to", "and", "چنده", "چقدر", "هست", "است", "میخوام", "می", "من", "شما"]);

export function tokenize(q: string): string[] {
  return Array.from(new Set(norm(q).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2 && !STOP.has(t))));
}

export function searchSite(account: string, query: string, limit = 3): SiteSearchHit[] {
  const rows = getDb()
    .prepare("SELECT url, title, content_text, kind, score FROM site_pages WHERE account_username = ?")
    .all(account) as Array<{ url: string; title: string; content_text: string; kind: string; score: number }>;
  const tokens = tokenize(query);
  if (!rows.length) return [];
  const scored = rows.map((r) => {
    const t = norm(r.title);
    const c = norm(r.content_text);
    const u = norm(decodeURIComponentSafe(r.url));
    let s = 0;
    for (const tok of tokens) {
      if (t.includes(tok)) s += 6;
      if (u.includes(tok)) s += 4;
      const n = c.split(tok).length - 1;
      if (n > 0) s += Math.min(n, 5);
    }
    return { r, s: tokens.length ? s : 0, bonus: r.score / 100 };
  });
  const hits = scored.filter((x) => x.s > 0).sort((a, b) => b.s + b.bonus - (a.s + a.bonus)).slice(0, limit);
  return hits.map(({ r }) => ({ title: r.title, url: r.url, kind: r.kind, excerpt: excerpt(r.content_text, tokens) }));
}

function decodeURIComponentSafe(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function excerpt(text: string, tokens: string[], len = 420): string {
  const n = norm(text);
  let pos = -1;
  for (const t of tokens) {
    const i = n.indexOf(t);
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  const start = Math.max(0, pos - 80);
  return text.slice(start, start + len).replace(/\s+/g, " ").trim();
}

export function isInternalPageUrl(account: string, url: string): string | null {
  const rows = getDb().prepare("SELECT url FROM site_pages WHERE account_username = ?").all(account) as { url: string }[];
  const strip = (x: string) => x.replace(/#.*$/, "").replace(/\/+$/, "");
  const target = strip(url.trim());
  const found = rows.find((r) => strip(r.url) === target);
  return found ? found.url : null;
}
