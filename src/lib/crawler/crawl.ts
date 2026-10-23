// Site crawler: same-site only, robots-aware, polite, capped. Stores into site_pages.
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { safeFetch } from "./safe-fetch";
import { extractPage, parseRobots, robotsAllows, summarize } from "./extract";
import { canonicalizeUrl, classifyUrl, isSameSite, isSkippableUrl, normalizeSiteInput } from "./url";

export const MAX_PAGES = 500;
const DELAY_MS = 250;
const MIN_TEXT = 40;

export interface CrawlResult {
  account: string;
  status: "ok" | "partial" | "failed" | "skipped";
  pages: number;
  changed: number;
  unchanged: number;
  error?: string;
}

function parseSitemapLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].replace(/&amp;/g, "&"));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setCrawlStatus(account: string, status: string, pages?: number) {
  const db = getDb();
  const sets = pages === undefined
    ? "crawl_last_status = ?, crawl_last_at = datetime('now')"
    : "crawl_last_status = ?, crawl_last_at = datetime('now'), crawl_pages_count = ?";
  const args: unknown[] = pages === undefined ? [status] : [status, pages];
  const res = db.prepare(`UPDATE dm_automations SET ${sets} WHERE account_username = ?`).run(...args, account);
  if (res.changes === 0) {
    // Ensure a row exists so status can be displayed even before DM automation is configured.
    try {
      db.prepare(
        `INSERT INTO dm_automations (account_username, enabled, crawl_last_status, crawl_last_at, crawl_pages_count)
         VALUES (?, 0, ?, datetime('now'), ?)`
      ).run(account, status, pages ?? 0);
    } catch {
      /* table may need more required columns; status then simply not stored */
    }
  }
}

export async function crawlSite(account: string, websiteUrl: string, opts: { maxPages?: number; delayMs?: number } = {}): Promise<CrawlResult> {
  const db = getDb();
  const root = normalizeSiteInput(websiteUrl);
  if (!root) return { account, status: "skipped", pages: 0, changed: 0, unchanged: 0, error: "invalid_url" };
  const rootHost = root.hostname.toLowerCase();
  const allowHost = (h: string) => isSameSite(h.toLowerCase(), rootHost);
  const maxPages = Math.min(opts.maxPages ?? MAX_PAGES, 1000);
  const delay = opts.delayMs ?? DELAY_MS;
  const origin = root.origin;

  setCrawlStatus(account, "running");
  let robots = { disallow: [] as string[], allow: [] as string[], sitemaps: [] as string[], delay: 0 };
  try {
    const r = await safeFetch(`${origin}/robots.txt`, { allowHost, timeoutMs: 6000, maxBytes: 200_000, accept: "text/plain" });
    if (r.status === 200) robots = parseRobots(r.body);
  } catch {
    /* no robots -> allowed */
  }
  const politeDelay = Math.max(delay, robots.delay * 1000);

  // Seed queue: homepage + sitemap URLs (same-site only) with a priority.
  const queue: Array<{ url: string; prio: number }> = [];
  const seen = new Set<string>();
  const enqueue = (raw: string, base: string, prio: number) => {
    const c = canonicalizeUrl(raw, base);
    if (!c) return;
    const u = new URL(c);
    if (!allowHost(u.hostname) || seen.has(c) || isSkippableUrl(c)) return;
    if (!robotsAllows(robots, u.pathname + u.search)) return;
    seen.add(c);
    queue.push({ url: c, prio });
  };

  const rootCanon = canonicalizeUrl(root.toString()) as string;
  enqueue(rootCanon, rootCanon, 100);
  const sitemapUrls = robots.sitemaps.length
    ? robots.sitemaps
    : [`${origin}/sitemap.xml`, `${origin}/wp-sitemap.xml`, `${origin}/sitemap_index.xml`];
  const sitemapQueue = sitemapUrls.slice(0, 15);
  let sitemapFetches = 0;
  while (sitemapQueue.length && sitemapFetches < 25) {
    const sm = sitemapQueue.shift()!;
    sitemapFetches++;
    try {
      const r = await safeFetch(sm, { allowHost, timeoutMs: 8000, maxBytes: 2_000_000, accept: "application/xml,text/xml" });
      if (r.status !== 200) continue;
      for (const loc of parseSitemapLocs(r.body)) {
        if (/\.xml(\.gz)?$/i.test(loc) || /sitemap/i.test(loc) && /\.xml/i.test(loc)) {
          try {
            if (allowHost(new URL(loc).hostname)) sitemapQueue.push(loc);
          } catch { /* ignore */ }
        } else {
          enqueue(loc, rootCanon, classifyUrl(loc).score);
        }
      }
    } catch {
      /* ignore bad sitemap */
    }
  }

  let stored = 0;
  let changed = 0;
  let unchanged = 0;
  let fetchErrors = 0;
  const kept = new Set<string>();
  const upsertSel = db.prepare("SELECT content_hash FROM site_pages WHERE account_username = ? AND url = ?");
  const upsert = db.prepare(`
    INSERT INTO site_pages (account_username, url, title, content_text, summary, kind, score, content_hash, last_crawled_at, http_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(account_username, url) DO UPDATE SET
      title = excluded.title, content_text = excluded.content_text, summary = excluded.summary,
      kind = excluded.kind, score = excluded.score, content_hash = excluded.content_hash,
      last_crawled_at = excluded.last_crawled_at, http_status = excluded.http_status`);
  const touch = db.prepare("UPDATE site_pages SET last_crawled_at = datetime('now'), http_status = ? WHERE account_username = ? AND url = ?");

  let fetched = 0;
  const fetchBudget = maxPages + 100;
  while (queue.length && stored < maxPages && fetched < fetchBudget) {
    queue.sort((a, b) => b.prio - a.prio);
    const { url } = queue.shift()!;
    if (fetched > 0) await sleep(politeDelay);
    fetched++;
    try {
      const r = await safeFetch(url, { allowHost, timeoutMs: 10000, maxBytes: 1_500_000 });
      const finalCanon = canonicalizeUrl(r.url) || url;
      if (r.status >= 400 || !/html|xhtml/i.test(r.contentType || "html")) {
        if (r.status >= 400) fetchErrors++;
        continue;
      }
      const page = extractPage(r.body);
      if (page.noindex) continue;
      let pageUrl = finalCanon;
      if (page.canonical) {
        const cc = canonicalizeUrl(page.canonical, r.url);
        if (cc && allowHost(new URL(cc).hostname)) pageUrl = cc;
      }
      for (const href of page.links) {
        const c = canonicalizeUrl(href, r.url);
        if (c) enqueue(c, r.url, classifyUrl(c).score - 5);
      }
      if (kept.has(pageUrl)) continue;
      if (page.text.length < MIN_TEXT) continue;
      const { kind, score } = classifyUrl(pageUrl, page.title);
      if (score < 20) continue;
      kept.add(pageUrl);
      const hash = crypto.createHash("sha256").update(page.title + "\n" + page.text).digest("hex").slice(0, 32);
      const prev = upsertSel.get(account, pageUrl) as { content_hash: string } | undefined;
      if (prev && prev.content_hash === hash) {
        touch.run(r.status, account, pageUrl);
        unchanged++;
      } else {
        upsert.run(account, pageUrl, page.title, page.text, summarize(page.text), kind, score, hash, r.status);
        changed++;
      }
      stored++;
    } catch {
      fetchErrors++;
    }
  }

  // Remove pages of this account that are no longer reachable (not seen this run) once we have a healthy crawl.
  if (kept.size > 0) {
    const existing = db.prepare("SELECT url FROM site_pages WHERE account_username = ?").all(account) as { url: string }[];
    const del = db.prepare("DELETE FROM site_pages WHERE account_username = ? AND url = ?");
    for (const e of existing) if (!kept.has(e.url)) del.run(account, e.url);
  }

  const status: CrawlResult["status"] = kept.size === 0 ? "failed" : fetchErrors > 0 ? "partial" : "ok";
  setCrawlStatus(account, status, kept.size);
  return { account, status, pages: kept.size, changed, unchanged, error: kept.size === 0 ? "no_pages_stored" : undefined };
}

export async function crawlAccount(account: string): Promise<CrawlResult> {
  const row = getDb().prepare("SELECT website_url FROM accounts WHERE username = ?").get(account) as { website_url?: string } | undefined;
  if (!row?.website_url?.trim()) return { account, status: "skipped", pages: 0, changed: 0, unchanged: 0, error: "no_website_url" };
  try {
    return await crawlSite(account, row.website_url);
  } catch (e) {
    setCrawlStatus(account, "failed");
    return { account, status: "failed", pages: 0, changed: 0, unchanged: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function crawlAllAccounts(only?: string): Promise<CrawlResult[]> {
  const rows = getDb()
    .prepare("SELECT username FROM accounts WHERE TRIM(COALESCE(website_url,'')) != ''" + (only ? " AND username = ?" : ""))
    .all(...(only ? [only] : [])) as { username: string }[];
  const out: CrawlResult[] = [];
  for (const r of rows) out.push(await crawlAccount(r.username));
  return out;
}
