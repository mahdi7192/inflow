import asyncio
import json
import logging
import os
import random
import urllib.request
import websockets

logger = logging.getLogger("inflow.cdp_client")

class CDPClient:
    def __init__(self, port=9222):
        self.port = port
        self.ws = None
        self._msg_id = 1

    async def connect(self):
        try:
            url = f"http://127.0.0.1:{self.port}/json"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as resp:
                tabs = json.loads(resp.read().decode())
        except Exception as e:
            raise RuntimeError(f"Could not connect to Chrome CDP on port {self.port}: {e}")

        page_tabs = [t for t in tabs if t.get("type") == "page"]
        page = next((t for t in page_tabs if "instagram.com" in t.get("url", "")), None)
        if not page and page_tabs:
            page = page_tabs[0]
        if not page:
            raise RuntimeError(f"No page tab available in Chrome on port {self.port}")

        ws_url = page.get("webSocketDebuggerUrl")
        if not ws_url:
            raise RuntimeError(f"Tab has no webSocketDebuggerUrl on port {self.port}")

        self.ws = await websockets.connect(ws_url, max_size=20_000_000)
        logger.info(f"Connected to CDP on port {self.port}, page: {page.get('url')}")

    async def close(self):
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None

    async def send(self, method, params=None):
        if not self.ws:
            raise RuntimeError("CDP WebSocket is not connected")
        mid = self._msg_id
        self._msg_id += 1
        payload = {"id": mid, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            resp_raw = await self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == mid:
                return resp.get("result", {})

    async def eval(self, expr, await_promise=False):
        res = await self.send("Runtime.evaluate", {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": await_promise
        })
        return res.get("result", {}).get("value")

    async def get_cookies(self, urls=None):
        if urls is None:
            urls = ["https://www.instagram.com", "https://instagram.com"]
        try:
            res = await self.send("Storage.getCookies", {})
            cookies = res.get("cookies", [])
            if cookies:
                return cookies
        except Exception:
            pass
        try:
            res = await self.send("Network.getCookies", {"urls": urls})
            return res.get("cookies", [])
        except Exception:
            return []

    async def is_logged_in(self):
        cookies = await self.get_cookies()
        names = {c.get("name") for c in cookies}
        return "sessionid" in names and "ds_user_id" in names

    async def cleanup_extra_tabs(self):
        try:
            import urllib.request, json
            req = urllib.request.Request(f"http://127.0.0.1:{self.port}/json")
            with urllib.request.urlopen(req, timeout=2) as resp:
                tabs = json.loads(resp.read().decode())
            page_tabs = [t for t in tabs if t.get("type") == "page"]
            ig_tabs = [t for t in page_tabs if "instagram.com" in t.get("url", "")]
            target = ig_tabs[0] if ig_tabs else (page_tabs[0] if page_tabs else None)
            if target:
                for t in page_tabs:
                    if t.get("id") != target.get("id"):
                        try:
                            urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/close/{t['id']}", timeout=1)
                        except Exception:
                            pass
                try:
                    urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/activate/{target['id']}", timeout=1)
                except Exception:
                    pass
        except Exception:
            pass

    async def navigate(self, url, wait_sec=3):
        await self.send("Page.navigate", {"url": url})
        delay = wait_sec + random.uniform(1.2, 2.8)
        await asyncio.sleep(delay)
        await self.simulate_human_glance()

    async def simulate_human_glance(self):
        """Simulate a user glancing down and up the screen slightly."""
        try:
            scroll_amount = random.randint(120, 280)
            await self.eval(f"window.scrollBy(0, {scroll_amount});")
            await asyncio.sleep(random.uniform(0.8, 1.8))
            await self.eval(f"window.scrollBy(0, -{scroll_amount});")
            await asyncio.sleep(random.uniform(0.5, 1.2))
        except Exception:
            pass

    async def click_element_human(self, script_or_selector, is_expr=False):
        """Click an element using native CDP mouse events with natural human jitter."""
        if is_expr:
            script = f"""(() => {{
                const el = ({script_or_selector});
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {{x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height}};
            }})()"""
        else:
            script = f"""(() => {{
                const el = document.querySelector({json.dumps(script_or_selector)});
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {{x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height}};
            }})()"""

        coord = await self.eval(script)
        if not coord:
            return False

        w = max(coord.get("w", 20), 10)
        h = max(coord.get("h", 20), 10)
        jx = coord["x"] + random.uniform(-w * 0.15, w * 0.15)
        jy = coord["y"] + random.uniform(-h * 0.15, h * 0.15)

        await self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": jx, "y": jy})
        await asyncio.sleep(random.uniform(0.12, 0.28))
        await self.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": jx, "y": jy, "button": "left", "clickCount": 1})
        await asyncio.sleep(random.uniform(0.06, 0.14))
        await self.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": jx, "y": jy, "button": "left", "clickCount": 1})

        # Trigger React synthetic click directly
        click_trigger = f"""(() => {{
            const el = ({script_or_selector if is_expr else f"document.querySelector({json.dumps(script_or_selector)})"});
            if (el) el.click();
        }})()"""
        await self.eval(click_trigger)
        await asyncio.sleep(random.uniform(0.3, 0.8))
        return True

    async def open_dm_with_user(self, username):
        """Open direct chat with a specific username via direct/new with human interactions."""
        await self.send("Page.navigate", {"url": "https://www.instagram.com/direct/new/"})
        await asyncio.sleep(random.uniform(3.0, 4.5))
        await self.simulate_human_glance()

        focused = await self.eval("""(() => {
            const inp = document.querySelector('input[name="searchInput"]');
            if (!inp) return false;
            inp.value = '';
            inp.focus();
            return true;
        })()""")
        if not focused:
            return False, "Search input not found"

        await asyncio.sleep(random.uniform(0.6, 1.2))

        # Type username with realistic cadence
        for ch in username:
            await self.send("Input.insertText", {"text": ch})
            await asyncio.sleep(random.uniform(0.05, 0.14))

        # Wait for search results
        await asyncio.sleep(random.uniform(2.5, 3.8))

        # Click matching user in results
        find_user_expr = f"""(() => {{
            const btns = Array.from(document.querySelectorAll('div[role="button"]'));
            return btns.find(b => b.innerText && b.innerText.toLowerCase().includes({json.dumps(username.lower())}));
        }})()"""

        clicked = await self.click_element_human(find_user_expr, is_expr=True)
        if not clicked:
            return False, f"User {username} not found in search results"

        # Check if chat opened or if 'Chat' button needs to be clicked
        for _ in range(12):
            curr_url = await self.eval("window.location.href")
            if curr_url and "/direct/t/" in curr_url:
                await asyncio.sleep(random.uniform(2.0, 3.5))
                return True, "Chat opened"

            chat_btn_expr = """(() => {
                const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
                const b = btns.find(el => {
                    const t = (el.innerText || '').trim();
                    return t === 'Chat' || t === 'Next' || t === 'دردشة' || t === 'التالي' || t === 'Send message';
                });
                if (b) {
                    b.click();
                    return true;
                }
                return false;
            })()"""
            await self.eval(chat_btn_expr)
            await asyncio.sleep(1.0)

        curr_url = await self.eval("window.location.href")
        if curr_url and "/direct/t/" in curr_url:
            return True, "Chat opened"
        return False, f"Failed to navigate to chat thread, still on: {curr_url}"

    async def send_dm_text(self, text):
        deliberation_sec = random.uniform(2.5, 4.5)
        logger.info(f"[Human-Sim] Reading chat context... pausing for {deliberation_sec:.1f}s")
        await asyncio.sleep(deliberation_sec)

        click_script = """(() => {
            const el = document.querySelector('div[role="textbox"]') || document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
            if (!el) return null;
            el.focus();
            const r = el.getBoundingClientRect();
            return {x: r.x + 20, y: r.y + 10};
        })()"""
        coord = await self.eval(click_script)
        if not coord:
            return False, "Textbox not found"

        jitter_x = coord["x"] + random.uniform(-4, 6)
        jitter_y = coord["y"] + random.uniform(-3, 3)

        await self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": jitter_x, "y": jitter_y})
        await asyncio.sleep(random.uniform(0.1, 0.25))
        await self.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": jitter_x, "y": jitter_y, "button": "left", "clickCount": 1})
        await asyncio.sleep(random.uniform(0.05, 0.12))
        await self.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": jitter_x, "y": jitter_y, "button": "left", "clickCount": 1})

        await asyncio.sleep(random.uniform(0.6, 1.4))

        # Realistic human typing simulation
        words = text.split(" ")
        for idx, word in enumerate(words):
            i = 0
            while i < len(word):
                burst_len = random.choice([1, 1, 2, 3])
                chunk = word[i:i+burst_len]
                await self.send("Input.insertText", {"text": chunk})
                i += burst_len
                await asyncio.sleep(random.uniform(0.04, 0.13))

            if idx < len(words) - 1:
                await self.send("Input.insertText", {"text": " "})
                pause = random.choice([0.15, 0.25, 0.45] if random.random() < 0.3 else [0.08, 0.15])
                await asyncio.sleep(pause)

        proofread_sec = random.uniform(1.8, 3.2)
        logger.info(f"[Human-Sim] Finished typing. Proofreading for {proofread_sec:.1f}s before sending...")
        await asyncio.sleep(proofread_sec)

        send_btn_script = """(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
            const sendBtn = btns.find(b => {
                const t = (b.innerText || '').trim();
                const aria = (b.getAttribute('aria-label') || '').trim();
                return t === 'Send' || t === 'إرسال' || t === 'ارسال' || aria === 'Send' || aria === 'إرسال' || aria === 'ارسال';
            });
            if (sendBtn) {
                const r = sendBtn.getBoundingClientRect();
                return {x: r.x + r.width/2, y: r.y + r.height/2};
            }
            return null;
        })()"""
        btn_coord = await self.eval(send_btn_script)
        if btn_coord:
            bx = btn_coord["x"] + random.uniform(-3, 3)
            by = btn_coord["y"] + random.uniform(-2, 2)
            await self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": bx, "y": by})
            await asyncio.sleep(random.uniform(0.1, 0.25))
            await self.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": bx, "y": by, "button": "left", "clickCount": 1})
            await asyncio.sleep(random.uniform(0.05, 0.1))
            await self.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": bx, "y": by, "button": "left", "clickCount": 1})

            await self.eval("""(() => {
                const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
                const sendBtn = btns.find(b => {
                    const t = (b.innerText || '').trim();
                    const aria = (b.getAttribute('aria-label') || '').trim();
                    return t === 'Send' || t === 'إرسال' || t === 'ارسال' || aria === 'Send' || aria === 'إرسال' || aria === 'ارسال';
                });
                if (sendBtn) sendBtn.click();
            })()""")
        else:
            await self.send("Input.dispatchKeyEvent", {"type": "rawKeyDown", "windowsVirtualKeyCode": 13, "unmodifiedText": "\r", "text": "\r"})
            await asyncio.sleep(random.uniform(0.04, 0.09))
            await self.send("Input.dispatchKeyEvent", {"type": "keyUp", "windowsVirtualKeyCode": 13, "unmodifiedText": "\r", "text": "\r"})

        await asyncio.sleep(random.uniform(1.5, 2.5))
        return True, "Sent"

    async def reply_to_comment_ui(self, shortcode, username, reply_text):
        """Reply to a comment natively via the browser DOM on the post page."""
        try:
            url = f"https://www.instagram.com/p/{shortcode}/"
            current_url = await self.eval("window.location.href")
            if not current_url or f"/p/{shortcode}/" not in current_url:
                await self.send("Page.navigate", {"url": url})
                await asyncio.sleep(random.uniform(3.0, 4.5))

            # Click reply button for the target username
            click_script = f"""(() => {{
                const spans = Array.from(document.querySelectorAll('span, a')).filter(el => {json.dumps(username)} && el.innerText.trim().toLowerCase() === {json.dumps(username.lower())});
                for (const s of spans) {{
                    let parent = s.parentElement;
                    for (let i = 0; i < 5 && parent; i++) {{
                        const replyBtn = Array.from(parent.querySelectorAll('button, div[role="button"]')).find(b => {{
                            const t = (b.innerText || '').trim();
                            return t === 'Reply' || t === 'پاسخ' || t === 'رد';
                        }});
                        if (replyBtn) {{
                            replyBtn.click();
                            return true;
                        }}
                        parent = parent.parentElement;
                    }}
                }}
                return false;
            }})()"""
            clicked = await self.eval(click_script)
            await asyncio.sleep(random.uniform(0.8, 1.5))

            # Focus textarea
            focus_script = """(() => {
                const ta = document.querySelector('textarea');
                if (ta) { ta.focus(); return true; }
                return false;
            })()"""
            await self.eval(focus_script)
            await asyncio.sleep(0.3)

            # Check if username prefix is already typed
            prefix_check = await self.eval(f"""(() => {{
                const ta = document.querySelector('textarea');
                return ta && ta.value.toLowerCase().includes({json.dumps(username.lower())});
            }})()""")
            if not prefix_check:
                await self.send("Input.insertText", {"text": f"@{username} "})
                await asyncio.sleep(0.3)

            # Humanized typing
            clean_text = reply_text.strip()
            if clean_text.startswith(f"@{username}"):
                clean_text = clean_text[len(f"@{username}"):].strip()

            words = clean_text.split(" ")
            for idx, word in enumerate(words):
                i = 0
                while i < len(word):
                    burst = random.choice([1, 1, 2, 3])
                    chunk = word[i:i+burst]
                    await self.send("Input.insertText", {"text": chunk})
                    i += burst
                    await asyncio.sleep(random.uniform(0.04, 0.12))
                if idx < len(words) - 1:
                    await self.send("Input.insertText", {"text": " "})
                    await asyncio.sleep(random.uniform(0.08, 0.2))

            await asyncio.sleep(random.uniform(1.2, 2.2))

            # Click post button
            post_script = """(() => {
                const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
                const postBtn = btns.find(b => {
                    const t = (b.innerText || '').trim();
                    return t === 'Post' || t === 'ارسال' || t === 'نشر';
                });
                if (postBtn) {
                    postBtn.click();
                    return true;
                }
                return false;
            })()"""
            posted = await self.eval(post_script)
            await asyncio.sleep(random.uniform(2.0, 3.5))
            return bool(posted), {"status": "ok" if posted else "failed"}
        except Exception as e:
            logger.error(f"Error in reply_to_comment_ui: {e}")
            return False, {"error": str(e)}

    async def reply_to_comment_api(self, media_id, comment_id, username, reply_text):
        """Post a reply to a comment using Instagram internal Web API inside browser."""
        expr = f"""(() => {{
            const cookies = document.cookie.split(';').map(c => c.trim());
            const csrfCookie = cookies.find(c => c.startsWith('csrftoken='));
            const csrf = csrfCookie ? csrfCookie.split('=')[1] : null;
            if (!csrf) return {{error: 'no_csrf'}};
            const text = {json.dumps(f"@{username} {reply_text}")};
            const body = new URLSearchParams({{
                'comment_text': text,
                'replied_to_comment_id': {json.dumps(str(comment_id))}
            }});
            return fetch('/api/v1/web/comments/' + {json.dumps(str(media_id))} + '/add/', {{
                method: 'POST',
                headers: {{
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': csrf,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }},
                body: body.toString()
            }}).then(r => r.json()).catch(e => ({{error: e.toString()}}));
        }})()"""
        val = await self.eval(expr, await_promise=True) or {}
        if val.get("status") == "ok":
            return True, val
        return False, val

    async def check_user_friendship(self, user_id):
        """Check friendship status of a user (whether they follow us)."""
        expr = f"""(() => {{
            return fetch('/api/v1/friendships/show/{user_id}/', {{
                headers: {{
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-IG-App-ID': '936619743392459'
                }}
            }}).then(r => r.json()).catch(e => ({{error: e.toString()}}));
        }})()"""
        res = await self.eval(expr, await_promise=True)
        if isinstance(res, dict) and res.get("status") == "ok":
            return res.get("followed_by", False), res
        return False, res

    async def fetch_media_comments(self, media_id):
        """Fetch comments for a given media_id via Instagram internal Web API."""
        expr = f"""(() => {{
            const fetchPage = async (url) => {{
                try {{
                    const res = await fetch(url, {{
                        headers: {{
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-IG-App-ID': '936619743392459'
                        }}
                    }});
                    return await res.json();
                }} catch (e) {{
                    return null;
                }}
            }};

            return (async () => {{
                let allComments = [];
                const baseRes = await fetchPage('/api/v1/media/' + {json.dumps(str(media_id))} + '/comments/?can_support_threading=true');
                if (!baseRes || !baseRes.comments) return [];
                allComments = allComments.concat(baseRes.comments);

                if (baseRes.has_more_headload_comments && baseRes.next_min_id) {{
                    const headUrl = '/api/v1/media/' + {json.dumps(str(media_id))} + '/comments/?can_support_threading=true&min_id=' + encodeURIComponent(baseRes.next_min_id);
                    const headRes = await fetchPage(headUrl);
                    if (headRes && headRes.comments) {{
                        allComments = allComments.concat(headRes.comments);
                    }}
                }}
                return allComments;
            }})();
        }})()"""
        res = await self.eval(expr, await_promise=True)
        if isinstance(res, list):
            return res
        return []

    async def fetch_direct_inbox_from_dom(self):
        """
        Extracts direct inbox threads directly from the Instagram Web DOM sidebar.
        Returns a list of structured thread objects visible in the browser.
        """
        try:
            curr_url = await self.eval("window.location.href")
            if not curr_url or "instagram.com/direct" not in curr_url:
                await self.navigate("https://www.instagram.com/direct/inbox/", wait_sec=3)
        except Exception:
            pass

        expr = """(() => {
            const results = [];
            // Target conversation links in the direct inbox sidebar
            let links = Array.from(document.querySelectorAll('a[href^="/direct/t/"]'));
            if (links.length === 0) {
                const listItems = Array.from(document.querySelectorAll('div[role="listitem"], div[role="button"]'));
                for (const item of listItems) {
                    const a = item.querySelector('a[href^="/direct/t/"]');
                    if (a && !links.includes(a)) links.push(a);
                }
            }

            for (const a of links) {
                try {
                    const href = a.getAttribute('href') || '';
                    const match = href.match(/\\/direct\\/t\\/([^\\/\\?]+)/);
                    if (!match) continue;
                    const threadId = match[1];

                    const container = a.closest('div[role="listitem"]') || a;
                    const lines = (container.innerText || a.innerText || '')
                        .split('\\n')
                        .map(t => t.trim())
                        .filter(Boolean);

                    if (lines.length === 0) continue;

                    const displayName = lines[0] || '';
                    const snippet = lines.length > 1 ? lines[1] : '';

                    let timeStr = '';
                    const timeTag = container.querySelector('time');
                    if (timeTag) {
                        timeStr = timeTag.getAttribute('datetime') || timeTag.innerText || '';
                    }
                    if (!timeStr && lines.length > 2) {
                        timeStr = lines[2];
                    }

                    // Check unread status
                    const hasUnreadText = lines.some(l => /جدید|خوانده نشده|unread|new message/i.test(l));
                    const isBold = Array.from(container.querySelectorAll('span, div')).some(el => {
                        try {
                            const fw = parseInt(window.getComputedStyle(el).fontWeight || '400', 10);
                            return fw >= 600;
                        } catch (e) {
                            return false;
                        }
                    });
                    const hasDot = Boolean(container.querySelector('div[class*="x1y1aw1k"], span[aria-label*="unread"], span[aria-label*="خوانده"]'));
                    const isUnread = Boolean(hasUnreadText || isBold || hasDot);

                    // React Fiber inspection
                    let fiberInfo = null;
                    const fiberKey = Object.keys(a).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                    if (fiberKey) {
                        let f = a[fiberKey];
                        for (let d = 0; d < 12 && f; d++) {
                            const p = f.memoizedProps;
                            if (p && (p.thread || p.conversation)) {
                                const th = p.thread || p.conversation;
                                fiberInfo = {
                                    threadId: th.thread_id || th.thread_v2_id,
                                    lastActivityAt: th.last_activity_at || th.last_permanent_item?.timestamp,
                                    lastItemText: th.last_permanent_item?.text,
                                    lastItemUser: th.last_permanent_item?.user_id
                                };
                                break;
                            }
                            f = f.return;
                        }
                    }

                    results.push({
                        thread_id: threadId,
                        display_name: displayName,
                        snippet: snippet,
                        time_str: timeStr,
                        is_unread: isUnread,
                        all_text: lines,
                        fiber: fiberInfo
                    });
                } catch (e) {}
            }
            return results;
        })()"""
        res = await self.eval(expr)
        if isinstance(res, list):
            return res
        return []

    async def read_active_chat_last_message(self):
        """
        Reads the latest message from the active conversation view.
        Distinguishes between outgoing (us) and incoming (customer) messages.
        """
        expr = """(() => {
            const main = document.querySelector('div[role="main"]') || document.body;
            const candidates = Array.from(main.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
                .filter(el => {
                    const txt = (el.innerText || '').trim();
                    if (!txt || txt.length < 1) return false;
                    if (['Active now', 'آنلاین', 'Reply', 'پاسخ', 'Send', 'ارسال', 'Message...', 'پیام...'].includes(txt)) return false;
                    if (el.closest('a[href^="/direct/t/"]')) return false;
                    return true;
                });

            if (candidates.length === 0) return null;

            const lastBubble = candidates[candidates.length - 1];
            const text = (lastBubble.innerText || '').trim();

            let isOutgoing = false;
            let p = lastBubble;
            for (let i = 0; i < 8 && p && p !== main; i++) {
                const style = window.getComputedStyle(p);
                if (style.justifyContent === 'flex-end' || style.alignSelf === 'flex-end' || style.marginLeft === 'auto') {
                    isOutgoing = true;
                    break;
                }
                const bg = style.backgroundColor || '';
                if (bg.includes('rgb(0, 149, 246)') || bg.includes('rgb(55, 151, 240)')) {
                    isOutgoing = true;
                    break;
                }
                p = p.parentElement;
            }

            let timeStr = '';
            const timeEl = lastBubble.closest('div[role="row"]')?.querySelector('time') || lastBubble.parentElement?.querySelector('time');
            if (timeEl) {
                timeStr = timeEl.getAttribute('datetime') || timeEl.innerText || '';
            }

            return {
                text: text,
                is_outgoing: isOutgoing,
                time_str: timeStr
            };
        })()"""
        res = await self.eval(expr)
        if isinstance(res, dict):
            return res
        return None

    async def fetch_direct_inbox(self, limit=20):
        """Fetch latest direct message threads, prioritizing live DOM extraction."""
        # 1. Primary: live DOM extraction (immune to 404s and GraphQL rotation)
        dom_threads = await self.fetch_direct_inbox_from_dom()
        if dom_threads:
            return {"dom_threads": dom_threads}

        # 2. Secondary fallback attempt
        try:
            curr_url = await self.eval("window.location.href")
            if not curr_url or "instagram.com" not in curr_url:
                await self.navigate("https://www.instagram.com/direct/inbox/", wait_sec=2)
        except Exception:
            pass

        expr = f"""(async () => {{
            try {{
                const getCookie = (name) => {{
                    const value = `; ${{document.cookie}}`;
                    const parts = value.split(`; ${{name}}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return '';
                }};
                const csrf = getCookie('csrftoken');
                const headers = {{
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-IG-App-ID': '936619743392459',
                    'Accept': '*/*'
                }};
                if (csrf) headers['X-CSRFToken'] = csrf;

                const res = await fetch('/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit={int(limit)}&thread_message_limit=10', {{
                    headers: headers
                }});
                if (!res.ok) return {{ error: 'HTTP ' + res.status }};
                return await res.json();
            }} catch (e) {{
                return {{ error: String(e) }};
            }}
        }})()"""
        res = await self.eval(expr, await_promise=True)
        if isinstance(res, dict):
            return res
        return {}

    async def open_dm_thread(self, thread_id):
        """Navigate directly to a specific thread URL with instant SPA click fallback."""
        # 1. Try instant SPA click if thread link is visible in sidebar
        click_script = f"""(() => {{
            const a = document.querySelector('a[href*="/direct/t/{thread_id}/"]');
            if (a) {{
                a.click();
                return true;
            }}
            return false;
        }})()"""
        clicked = await self.eval(click_script)
        if clicked:
            await asyncio.sleep(random.uniform(1.2, 2.0))
            curr_url = await self.eval("window.location.href")
            if curr_url and f"/direct/t/{thread_id}" in curr_url:
                await self.simulate_human_glance()
                return True, "Opened via SPA click"

        # 2. Fallback to direct navigation
        url = f"https://www.instagram.com/direct/t/{thread_id}/"
        await self.send("Page.navigate", {"url": url})
        for _ in range(12):
            await asyncio.sleep(random.uniform(0.8, 1.5))
            curr_url = await self.eval("window.location.href")
            if curr_url and f"/direct/t/{thread_id}" in curr_url:
                await self.simulate_human_glance()
                await asyncio.sleep(random.uniform(0.8, 1.5))
                return True, "Opened via Page.navigate"
        return False, "Timeout waiting for thread navigation"

