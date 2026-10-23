// Lightweight HTML -> clean text + link extraction (no external deps).

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", zwnj: "\u200c" };

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export interface ExtractedPage {
  title: string;
  text: string;
  links: string[];
  canonical: string | null;
  noindex: boolean;
}

export function extractPage(html: string): ExtractedPage {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const title = decodeEntities((ogTitle?.[1] || titleMatch?.[1] || "").replace(/\s+/g, " ").trim()).slice(0, 200);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || null;
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const metaDesc = decodeEntities(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "");

  const links: string[] = [];
  const linkRe = /<a\b[^>]*?\shref=["']([^"'#][^"']*|#[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) && links.length < 800) links.push(decodeEntities(m[1]));

  let body = html.replace(/<!--[\s\S]*?-->/g, " ");
  const main = body.match(/<main\b[\s\S]*?<\/main>/i) || body.match(/<article\b[\s\S]*?<\/article>/i);
  if (main && main[0].length > 400) body = main[0];
  body = body
    .replace(/<(script|style|noscript|svg|iframe|template|nav|footer|header|aside)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/option|\/button)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  let text = decodeEntities(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n");
  if (metaDesc && !text.includes(metaDesc.slice(0, 40))) text = `${metaDesc}\n${text}`;
  return { title, text: text.slice(0, 25000), links, canonical, noindex };
}

export function summarize(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

export function parseRobots(txt: string, agent = "inflowsitebot"): { disallow: string[]; allow: string[]; sitemaps: string[]; delay: number } {
  const sitemaps: string[] = [];
  const groups: Array<{ agents: string[]; rules: Array<[string, string]>; delay: number }> = [];
  let cur: { agents: string[]; rules: Array<[string, string]>; delay: number } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim().toLowerCase();
    const v = line.slice(idx + 1).trim();
    if (k === "sitemap") sitemaps.push(v);
    else if (k === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [], delay: 0 };
        groups.push(cur);
      }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
      continue;
    } else if (cur && (k === "disallow" || k === "allow")) cur.rules.push([k, v]);
    else if (cur && k === "crawl-delay") cur.delay = Math.min(Number(v) || 0, 10);
    lastWasAgent = false;
  }
  const g = groups.find((x) => x.agents.some((a) => a !== "*" && agent.includes(a))) || groups.find((x) => x.agents.includes("*"));
  return {
    disallow: (g?.rules || []).filter((r) => r[0] === "disallow" && r[1]).map((r) => r[1]),
    allow: (g?.rules || []).filter((r) => r[0] === "allow" && r[1]).map((r) => r[1]),
    sitemaps,
    delay: g?.delay || 0,
  };
}

export function robotsAllows(rules: { disallow: string[]; allow: string[] }, pathAndQuery: string): boolean {
  const match = (p: string) => {
    const re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    return re.test(pathAndQuery);
  };
  let bestD = -1;
  let bestA = -1;
  for (const d of rules.disallow) if (match(d)) bestD = Math.max(bestD, d.length);
  for (const a of rules.allow) if (match(a)) bestA = Math.max(bestA, a.length);
  return bestD < 0 || bestA >= bestD;
}
