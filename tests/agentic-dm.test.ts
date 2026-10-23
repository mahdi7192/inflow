// Spec 023 tests: crawler (real site), same-domain guard, SSRF, search_site, agent loop (mock LLM).
// Run with a throwaway DB:  INFLOW_DATA_DIR=/tmp/x npx tsx tests/agentic-dm.test.ts
import assert from "node:assert";
import { getDb } from "../src/lib/db";
import { crawlSite } from "../src/lib/crawler/crawl";
import { searchSite } from "../src/lib/crawler/search";
import { canonicalizeUrl, isSameSite } from "../src/lib/crawler/url";
import { isPrivateIp, safeFetch } from "../src/lib/crawler/safe-fetch";
import { runDmAgent } from "../src/lib/agent/dm-agent";

async function main() {
  const site = process.env.TEST_SITE || "https://example.com";
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO accounts (username, website_url) VALUES ('t_acc', ?)").run(site);

  // unit checks
  assert.equal(canonicalizeUrl("https://a.com/x/?utm_source=z&b=1#frag"), "https://a.com/x?b=1");
  assert(isSameSite("shop.example.com", "example.com") && !isSameSite("evil.com", "example.com") && !isSameSite("example.com.evil.com", "example.com"));
  assert(isPrivateIp("127.0.0.1") && isPrivateIp("10.1.2.3") && isPrivateIp("192.168.0.5") && isPrivateIp("169.254.169.254") && !isPrivateIp("8.8.8.8"));
  await assert.rejects(() => safeFetch("http://127.0.0.1:3005/", { allowHost: () => true }), /blocked_private_ip/);
  await assert.rejects(() => safeFetch("http://localhost/", { allowHost: () => true }), /blocked_private_host/);
  console.log("unit OK");

  const r = await crawlSite("t_acc", site, { maxPages: 15, delayMs: 200 });
  console.log("crawl:", JSON.stringify(r));
  const rows = db.prepare("SELECT url, title, kind, score, length(content_text) AS len FROM site_pages WHERE account_username='t_acc'").all() as Array<{ url: string; title: string; kind: string; score: number; len: number }>;
  console.table(rows.slice(0, 15));
  assert(rows.length > 0, "pages stored");
  const root = new URL(site).hostname;
  for (const x of rows) assert(isSameSite(new URL(x.url).hostname, root), `external page stored: ${x.url}`);
  console.log("all stored pages same-site OK:", rows.length);

  const r2 = await crawlSite("t_acc", site, { maxPages: 15, delayMs: 200 });
  console.log("recrawl (expect unchanged):", JSON.stringify(r2));
  assert.equal(r2.changed, 0);

  const q = (rows[0].title || "example").split(/\s+/)[0];
  const hits = searchSite("t_acc", q);
  console.log("search_site(", q, ") ->", hits.map((h) => h.url));
  assert(hits.length > 0);

  // agent loop with mocked LLM: search -> send_link -> save info -> reply
  const script = [
    JSON.stringify({ action: "tool", tool: "search_site", args: { query: q } }),
    JSON.stringify({ action: "tool", tool: "send_link", args: { url: "https://evil.com/x" } }),
    JSON.stringify({ action: "tool", tool: "send_link", args: { url: hits[0].url } }),
    JSON.stringify({ action: "tool", tool: "save_customer_info", args: { name: "علی", phone: "۰۹۱۲۱۲۳۴۵۶۷", address: "تهران" } }),
    JSON.stringify({ action: "reply", text: `ممنون! از این صفحه ببینید https://evil.com/x و ثبت شد 🙏` }),
  ];
  let i = 0;
  const res = await runDmAgent({
    accountUsername: "t_acc", senderUsername: "buyer1", incomingText: "سلام", history: [], contextCaption: "", primaryGoal: "lead_capture",
    llm: async () => script[i++] ?? null,
  });
  console.log("agent:", JSON.stringify(res));
  assert(res && res.link && res.link.url.startsWith(hits[0].url.split("?")[0]), "internal link attached");
  assert(!/https?:\/\//.test(res!.replyText), "no raw URL in reply");
  assert(res!.steps.find((s) => s.tool === "send_link" && !s.ok), "external link rejected");
  const info = db.prepare("SELECT customer_info FROM dm_thread_states WHERE account_username='t_acc' AND sender_username='buyer1'").get() as { customer_info: string };
  assert(JSON.parse(info.customer_info).phone === "09121234567");
  const lead = db.prepare("SELECT phone_number FROM captured_leads WHERE account_username='t_acc'").get() as { phone_number: string };
  assert.equal(lead.phone_number, "09121234567");
  console.log("agent OK");
  console.log("ALL PASSED");
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
