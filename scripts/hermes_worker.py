#!/usr/bin/env python3
"""
inFlow - Hermes Agent Sample Worker
This script demonstrates how an external agent (Hermes Worker on Linux) interacts
with the inFlow Control Plane via REST API every 2 minutes.

Usage:
    python3 scripts/hermes_worker.py --account r9spoort1 --once
    python3 scripts/hermes_worker.py --account r9spoort1 --interval 120
"""

import sys
import time
import argparse
import urllib.request
import urllib.parse
import json

def api_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Hermes-Agent/1.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_post(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "Hermes-Agent/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def evaluate_trigger(comment_text, rules):
    t_type = rules.get("trigger_type", "all")
    if t_type == "all":
        return True
    
    if t_type == "keywords":
        keywords = rules.get("trigger_keywords", [])
        if not keywords:
            return True
        c_lower = comment_text.lower()
        return any(kw.lower() in c_lower for kw in keywords)
    
    if t_type == "ai_context":
        # In a real agent, call OpenAI / Claude / Local LLM here.
        # Simple heuristic fallback for sample execution:
        return True
        
    return True

def run_agent_cycle(base_url, account):
    print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Polling inFlow Control Plane for @{account}...")
    poll_url = f"{base_url}/api/agent/poll?account={urllib.parse.quote(account)}"
    
    try:
        data = api_get(poll_url)
    except Exception as e:
        print(f"[-] Failed to poll inFlow at {poll_url}: {e}")
        return

    if not data.get("success"):
        print("[-] API returned failure:", data)
        return

    if data.get("paused"):
        print(f"[*] Account @{account} is currently PAUSED. Skipping comment evaluation.")
        return

    active_posts = data.get("active_posts", [])
    print(f"[+] Heartbeat updated. Found {len(active_posts)} active post(s) with auto_reply=1.")

    for post in active_posts:
        shortcode = post["shortcode"]
        processed_ids = set(post.get("processed_comment_ids", []))
        rules = post.get("rules", {})

        print(f"\n  > Inspecting Post: {shortcode} ({post.get('post_type', 'reel')})")
        print(f"    Trigger type: {rules.get('trigger_type')}")
        print(f"    Already processed comment locks: {len(processed_ids)}")

        # Sample dummy comments that might have arrived on Instagram
        sample_incoming_comments = [
            {
                "comment_id": f"sim_{shortcode}_001",
                "username": "customer_ali",
                "text": "قیمت و سایزبندی رو لطف میکنید؟",
                "follows_page": True
            }
        ]

        for incoming in sample_incoming_comments:
            c_id = incoming["comment_id"]
            if c_id in processed_ids:
                print(f"    [=] Comment {c_id} already locked/processed. Skipping.")
                continue

            matched = evaluate_trigger(incoming["text"], rules)
            print(f"    [*] Evaluating '{incoming['text']}': Matched={matched}")

            comment_reply_status = "none"
            comment_reply_text = ""
            if matched and rules.get("comment_action", {}).get("type") != "none":
                comment_reply_status = "sent"
                comment_reply_text = rules["comment_action"].get("text") or "پاسخ در دایرکت خدمتتان ارسال شد 📩"

            dm_status = "none"
            dm_text = ""
            dm_conf = rules.get("dm_action", {})
            if matched and dm_conf.get("type") != "none":
                if dm_conf.get("require_follow") and not incoming.get("follows_page"):
                    dm_status = "pending_follow"
                    dm_text = "Waiting for user to follow account before dispatching DM."
                else:
                    dm_status = "sent"
                    dm_text = dm_conf.get("text") or "سلام! مشخصات و قیمت خدمت شما."

            # Lock comment and record action in inFlow
            log_url = f"{base_url}/api/posts/{shortcode}/logs"
            log_payload = {
                "comment_id": c_id,
                "username": incoming["username"],
                "comment_text": incoming["text"],
                "trigger_matched": 1 if matched else 0,
                "comment_reply_status": comment_reply_status,
                "comment_reply_text": comment_reply_text,
                "dm_status": dm_status,
                "dm_text": dm_text
            }

            try:
                res = api_post(log_url, log_payload)
                if res.get("success"):
                    print(f"    [+] Successfully locked and logged comment {c_id} (DM: {dm_status}, Reply: {comment_reply_status})")
            except Exception as e:
                print(f"    [-] Error logging comment {c_id}: {e}")

def main():
    parser = argparse.ArgumentParser(description="inFlow Hermes Agent Worker")
    parser.add_argument("--endpoint", default="http://localhost:3005", help="inFlow Base URL")
    parser.add_argument("--account", default="r9spoort1", help="Instagram account handle")
    parser.add_argument("--interval", type=int, default=120, help="Poll interval in seconds (default: 120)")
    parser.add_argument("--once", action="store_true", help="Run a single polling cycle and exit")
    args = parser.parse_args()

    print(f"Starting inFlow Hermes Agent Worker for @{args.account}")
    print(f"Target Control Plane: {args.endpoint}")
    print(f"Poll Interval: {args.interval}s")

    if args.once:
        run_agent_cycle(args.endpoint, args.account)
        return

    while True:
        try:
            run_agent_cycle(args.endpoint, args.account)
        except Exception as e:
            print("[-] Exception in agent loop:", e)
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
