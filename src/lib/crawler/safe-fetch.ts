// SSRF-safe fetch: resolves DNS, blocks private/loopback/link-local IPs on every hop,
// follows redirects manually (same-site only, checked by caller via allowHost), caps size and time.
import dns from "node:dns/promises";
import net from "node:net";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::" || l.startsWith("fe80") || l.startsWith("fc") || l.startsWith("fd")) return true;
    const m = l.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return true;
}

export async function assertPublicHost(hostname: string): Promise<void> {
  const h = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(h)) {
    if (isPrivateIp(h)) throw new Error("blocked_private_ip");
    return;
  }
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(h)) throw new Error("blocked_private_host");
  const addrs = await dns.lookup(h, { all: true });
  if (!addrs.length) throw new Error("dns_failed");
  for (const a of addrs) if (isPrivateIp(a.address)) throw new Error("blocked_private_ip");
}

export interface SafeFetchResult {
  status: number;
  url: string;
  contentType: string;
  body: string;
}

export async function safeFetch(
  startUrl: string,
  opts: {
    allowHost: (host: string) => boolean;
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    accept?: string;
  }
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const maxBytes = opts.maxBytes ?? 1_500_000;
  let url = startUrl;
  for (let hop = 0; hop <= (opts.maxRedirects ?? 4); hop++) {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad_protocol");
    if (!opts.allowHost(u.hostname)) throw new Error("external_host_blocked");
    await assertPublicHost(u.hostname);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": "InflowSiteBot/1.0 (+assistant for page owner)",
          Accept: opts.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
          "Accept-Language": "fa,en;q=0.8",
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location")!, url).toString();
        await res.body?.cancel().catch(() => {});
        continue;
      }
      const contentType = res.headers.get("content-type") || "";
      let body = "";
      if (res.body && /text|xml|json|html/i.test(contentType || "text/html")) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          chunks.push(value);
          if (total >= maxBytes) {
            await reader.cancel().catch(() => {});
            break;
          }
        }
        body = Buffer.concat(chunks).toString("utf8");
      } else {
        await res.body?.cancel().catch(() => {});
      }
      return { status: res.status, url, contentType, body };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("too_many_redirects");
}
