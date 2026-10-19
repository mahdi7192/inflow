#!/usr/bin/env python3
"""
inFlow - Hermes Server Orchestrator CLI
Manages isolated Hermes profiles, virtual displays (Bot Screen), headed Chrome,
and dynamic on-demand VNC Guard for Instagram automation bots.

Usage:
    python3 scripts/hermes_orchestrator.py provision --account r9spoort1 --token <token> --json
    python3 scripts/hermes_orchestrator.py vnc-start --account r9spoort1 --json
    python3 scripts/hermes_orchestrator.py vnc-stop --account r9spoort1 --json
    python3 scripts/hermes_orchestrator.py verify-session --account r9spoort1 --json
    python3 scripts/hermes_orchestrator.py status --account r9spoort1 --json
"""

import os
import sys
import json
import time
import shutil
import sqlite3
import secrets
import argparse
import subprocess
from datetime import datetime, timezone, timedelta

HERMES_HOME = os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes"))
PROFILES_DIR = os.path.join(HERMES_HOME, "profiles")
VNC_PORT = int(os.environ.get("INFLOW_VNC_PORT", "6080"))
HOST_IP = os.environ.get("INFLOW_SERVER_HOST", "inflow.ketabdar.dev")
VNC_BASE_URL = os.environ.get("INFLOW_VNC_BASE_URL", "https://inflow.ketabdar.dev/vnc")

VNC_GUARD_TEMPLATE = """#!/usr/bin/env python3
import os, sys, time, secrets, subprocess, signal, json

PID_FILE = "{profile_dir}/bot-desktop/websockify.pid"
TOKEN_FILE = "{profile_dir}/bot-desktop/vnc_token.cfg"
SOCK_PATH = "{profile_dir}/bot-desktop/rfb.sock"
PORT = {port}
HOST_IP = "{host_ip}"
VNC_BASE_URL = "{vnc_base_url}"
PROFILE_DIR = "{profile_dir}/bot-desktop/browser-profile"

def ensure_desktop():
    if not os.path.exists(SOCK_PATH):
        old_home = os.environ.get("HERMES_HOME")
        old_prof = os.environ.get("HERMES_PROFILE")
        try:
            os.environ["HERMES_HOME"] = "{profile_dir}"
            os.environ["HERMES_PROFILE"] = "{profile_name}"
            if "/usr/local/lib/hermes-agent" not in sys.path:
                sys.path.insert(0, "/usr/local/lib/hermes-agent")
            from tools.bot_desktop import runtime
            runtime.start()
        except Exception as e:
            sys.stderr.write(f"Desktop start error: {{e}}\\n")
        finally:
            if old_home:
                os.environ["HERMES_HOME"] = old_home
            else:
                os.environ.pop("HERMES_HOME", None)
            if old_prof:
                os.environ["HERMES_PROFILE"] = old_prof
            else:
                os.environ.pop("HERMES_PROFILE", None)
        time.sleep(2)

def is_profile_chrome_running():
    lock_file = os.path.join(PROFILE_DIR, "SingletonLock")
    if not os.path.islink(lock_file):
        return False
    try:
        target = os.readlink(lock_file)
        pid = int(target.rsplit("-", 1)[-1])
        if os.path.exists(f"/proc/{{pid}}"):
            with open(f"/proc/{{pid}}/cmdline", "rb") as f:
                cmdline = f.read()
                if b"chrome" in cmdline:
                    return True
    except Exception:
        pass
    return False

def clean_stale_chrome_locks():
    if not is_profile_chrome_running():
        for f in ["SingletonLock", "SingletonSocket", "SingletonCookie"]:
            p = os.path.join(PROFILE_DIR, f)
            try:
                if os.path.islink(p) or os.path.exists(p):
                    os.unlink(p)
            except Exception:
                pass

def get_cdp_port():
    cdp_file = "{profile_dir}/bot-desktop/cdp_port"
    if os.path.exists(cdp_file):
        try:
            with open(cdp_file, "r") as f:
                port = int(f.read().strip())
                if 1024 < port < 65535:
                    return port
        except Exception:
            pass
    try:
        disp_file = "{profile_dir}/bot-desktop/display"
        if os.path.exists(disp_file):
            with open(disp_file) as f:
                d = f.read().strip().replace(":", "")
                return 9200 + int(d)
    except Exception:
        pass
    return 9226

def ensure_chrome(url=None):
    clean_stale_chrome_locks()
    running = is_profile_chrome_running()
    env = os.environ.copy()
    display = ":20"
    disp_file = "{profile_dir}/bot-desktop/display"
    if os.path.exists(disp_file):
        try:
            with open(disp_file) as f:
                d = f.read().strip()
                if d:
                    display = f":{{d}}" if not d.startswith(":") else d
        except Exception:
            pass
    env["DISPLAY"] = display
    auth_file = "{profile_dir}/bot-desktop/Xauthority"
    if os.path.exists(auth_file):
        env["XAUTHORITY"] = auth_file
    cdp_port = get_cdp_port()
    if not running:
        target = url if url else "https://www.instagram.com/"
        cmd = [
            "google-chrome-stable", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
            "--disable-session-crashed-bubble", "--test-type", "--start-maximized",
            f"--remote-debugging-port={{cdp_port}}",
            "--proxy-server=socks5://127.0.0.1:40000",
            "--disable-blink-features=AutomationControlled",
            f"--user-data-dir={{PROFILE_DIR}}", target
        ]
        try:
            subprocess.Popen(cmd, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, close_fds=True, start_new_session=True)
            time.sleep(2)
        except FileNotFoundError:
            pass
    elif url:
        cmd = [
            "google-chrome-stable", "--no-sandbox",
            f"--remote-debugging-port={{cdp_port}}",
            "--proxy-server=socks5://127.0.0.1:40000",
            "--disable-blink-features=AutomationControlled",
            f"--user-data-dir={{PROFILE_DIR}}", url
        ]
        try:
            subprocess.run(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            time.sleep(1)
        except Exception:
            pass

TOKENS_DIR = "/opt/inflow/data/vnc_tokens"

def stop():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f: pid = int(f.read().strip())
            os.kill(pid, signal.SIGTERM)
        except Exception: pass
        try: os.remove(PID_FILE)
        except Exception: pass
    if os.path.exists(TOKEN_FILE):
        try: os.remove(TOKEN_FILE)
        except Exception: pass
    sys_tok = os.path.join(TOKENS_DIR, "{account}.token")
    if os.path.exists(sys_tok):
        try: os.remove(sys_tok)
        except Exception: pass
    print(f"VNC Guard: stopped for {account}.")

def start(url=None, token=None, timeout_seconds=600):
    ensure_desktop()
    os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
    os.makedirs(TOKENS_DIR, exist_ok=True)
    
    # Wait up to 5s for RFB socket to be ready
    for _ in range(25):
        if os.path.exists(SOCK_PATH):
            break
        time.sleep(0.2)

    if not token:
        token = secrets.token_hex(8)
    with open(TOKEN_FILE, "w") as f:
        f.write(f"{{token}}: unix_socket:{{SOCK_PATH}}\\n")
    sys_tok = os.path.join(TOKENS_DIR, "{account}.token")
    with open(sys_tok, "w") as f:
        f.write(f"{{token}}: unix_socket:{{SOCK_PATH}}\\n")
    
    subprocess.run(["systemctl", "start", "inflow-websockify.service"], check=False)
    ensure_chrome(url)
    
    killer_cmd = f"sleep {{timeout_seconds}} && rm -f {{TOKEN_FILE}} {{sys_tok}} 2>/dev/null"
    subprocess.Popen(killer_cmd, shell=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                     stderr=subprocess.DEVNULL, close_fds=True, start_new_session=True)
        
    if VNC_BASE_URL:
        vnc_url = f"{{VNC_BASE_URL}}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={{token}}"
    else:
        vnc_url = f"http://{{HOST_IP}}:{{PORT}}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={{token}}"
    print(json.dumps({{"success": True, "token": token, "vnc_url": vnc_url, "timeout_seconds": timeout_seconds}}))
    return vnc_url

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        stop()
    elif len(sys.argv) > 1 and sys.argv[1] == "start":
        url = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("-") else None
        tok = sys.argv[3] if len(sys.argv) > 3 else None
        start(url=url, token=tok)
    elif len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        start(url=sys.argv[1])
    else:
        start()
"""

CONFIG_YAML_TEMPLATE = """model:
  api_key: sk-523b3dd47c3ab70e-i4hfte-e73173eb
  api_mode: chat_completions
  base_url: http://127.0.0.1:20128/v1
  context_length: 128000
  default: ag/gemini-3.8-flash
  provider: custom
_config_version: 49

terminal:
  cwd: {profile_dir}

bot_desktop:
  auto_start: true
  placement: "gateway"

browser:
  headless: false
  engine: "chrome"
  use_real_profile: false

platform_toolsets:
  cli:
    - browser
    - computer_use
    - code_execution
    - file
    - cronjob
    - memory
    - session_search
    - skills
    - terminal
    - web

mcp_servers:
  inflow:
    command: /opt/inflow/node_modules/.bin/tsx
    args:
      - /opt/inflow/src/cli/mcp.ts
      - --token
      - {token}
      - --account
      - {account}
    env:
      NODE_PATH: /opt/inflow/node_modules
      INFLOW_MCP_TOKEN: {token}
      INFLOW_MCP_ACCOUNT: {account}
    enabled: true
"""

SOUL_TEMPLATE = """# inFlow Instagram Automation Agent: @{account}

You are the dedicated autonomous AI agent responsible for Instagram automation of page @{account}.

## Your Mission
1. Execute scheduled tasks and pending jobs requested from the inFlow Dashboard (syncing reels, publishing comments, responding to direct messages).
2. Automate engagement strictly adhering to the configured trigger rules and keywords.
3. Monitor your browser session and ensure human-like browsing patterns to protect account health.

## Tools & Capabilities
- **inFlow Control Plane**: Access your page-scoped MCP tools (`inflow_get_active_automations`, `inflow_push_scraped_posts`, `inflow_record_comment_interaction`, `inflow_get_pending_jobs`, `inflow_complete_job`).
- **Bot Desktop & Browser**: Operate inside your dedicated sandboxed browser profile.
- **Telegram & Reports**: Always maintain professional, clear, data-backed execution.
"""

def get_profile_name(account: str) -> str:
    return f"inflow_{account.lower()}"

def get_profile_dir(profile_name: str) -> str:
    return os.path.join(PROFILES_DIR, profile_name)

def provision_profile(account: str, token: str):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)

    # 1. Create directory structure
    os.makedirs(os.path.join(profile_dir, "bin"), exist_ok=True)
    os.makedirs(os.path.join(profile_dir, "bot-desktop", "browser-profile"), exist_ok=True)

    # 2. Write config.yaml
    config_path = os.path.join(profile_dir, "config.yaml")
    with open(config_path, "w") as f:
        f.write(CONFIG_YAML_TEMPLATE.format(profile_dir=profile_dir, token=token, account=account))

    # 3. Write SOUL.md
    soul_path = os.path.join(profile_dir, "SOUL.md")
    with open(soul_path, "w") as f:
        f.write(SOUL_TEMPLATE.format(account=account))

    # 4. Write profile .env with dedicated token
    env_path = os.path.join(profile_dir, ".env")
    with open(env_path, "w") as f:
        f.write(f"INFLOW_ACCOUNT={account}\nINFLOW_MCP_TOKEN={token}\nINFLOW_PAGE_TOKEN={token}\n")

    # 5. Deploy vnc_guard.py into bin/
    vnc_guard_path = os.path.join(profile_dir, "bin", "vnc_guard.py")
    with open(vnc_guard_path, "w") as f:
        f.write(VNC_GUARD_TEMPLATE.format(
            profile_dir=profile_dir,
            profile_name=profile_name,
            port=VNC_PORT,
            host_ip=HOST_IP,
            vnc_base_url=VNC_BASE_URL,
            account=account
        ))
    os.chmod(vnc_guard_path, 0o755)

    # 5.1 Assign dedicated CDP port
    cdp_port = 9226
    try:
        from engine.db import get_account_cdp_port
        cdp_port = get_account_cdp_port(account)
    except Exception:
        pass
    cdp_file = os.path.join(profile_dir, "bot-desktop", "cdp_port")
    try:
        with open(cdp_file, "w") as f:
            f.write(str(cdp_port))
    except Exception:
        pass

    # 6. Generate VNC token & URL
    vnc_token = secrets.token_hex(8)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=600)).isoformat()
    if VNC_BASE_URL:
        vnc_url = f"{VNC_BASE_URL}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={vnc_token}"
    else:
        vnc_url = f"http://{HOST_IP}:{VNC_PORT}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={vnc_token}"

    token_file = os.path.join(profile_dir, "bot-desktop", "vnc_token.cfg")
    sock_path = os.path.join(profile_dir, "bot-desktop", "rfb.sock")
    with open(token_file, "w") as f:
        f.write(f"{vnc_token}: unix_socket:{sock_path}\n")

    sys_tokens_dir = "/opt/inflow/data/vnc_tokens"
    os.makedirs(sys_tokens_dir, exist_ok=True)
    sys_token_file = os.path.join(sys_tokens_dir, f"{account}.token")
    with open(sys_token_file, "w") as f:
        f.write(f"{vnc_token}: unix_socket:{sock_path}\n")

    if os.path.exists(vnc_guard_path):
        target = "https://www.instagram.com/accounts/login/"
        try:
            subprocess.run([sys.executable, vnc_guard_path, "start", target, vnc_token],
                           timeout=15, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        except Exception:
            pass

    return {
        "success": True,
        "account": account,
        "profile_name": profile_name,
        "profile_dir": profile_dir,
        "display": ":20",
        "status": "login_required",
        "token": vnc_token,
        "vnc_url": vnc_url,
        "expires_at": expires_at,
        "timeout_seconds": 600
    }

def vnc_start(account: str, target_url: str = None):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)
    vnc_guard_path = os.path.join(profile_dir, "bin", "vnc_guard.py")

    vnc_token = secrets.token_hex(8)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=600)).isoformat()
    if VNC_BASE_URL:
        vnc_url = f"{VNC_BASE_URL}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={vnc_token}"
    else:
        vnc_url = f"http://{HOST_IP}:{VNC_PORT}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={vnc_token}"

    token_file = os.path.join(profile_dir, "bot-desktop", "vnc_token.cfg")
    sock_path = os.path.join(profile_dir, "bot-desktop", "rfb.sock")
    os.makedirs(os.path.dirname(token_file), exist_ok=True)
    with open(token_file, "w") as f:
        f.write(f"{vnc_token}: unix_socket:{sock_path}\n")

    sys_tokens_dir = "/opt/inflow/data/vnc_tokens"
    os.makedirs(sys_tokens_dir, exist_ok=True)
    sys_token_file = os.path.join(sys_tokens_dir, f"{account}.token")
    with open(sys_token_file, "w") as f:
        f.write(f"{vnc_token}: unix_socket:{sock_path}\n")
    subprocess.run(["systemctl", "start", "inflow-websockify.service"], check=False)

    if os.path.exists(vnc_guard_path):
        target = target_url or "https://www.instagram.com/"
        try:
            subprocess.run([sys.executable, vnc_guard_path, "start", target, vnc_token],
                           timeout=15, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        except Exception:
            pass

    # Ensure rfb.sock exists before returning, so websockify doesn't get Errno 2
    for _ in range(50):
        if os.path.exists(sock_path):
            break
        time.sleep(0.2)

    if not os.path.exists(sock_path):
        return {
            "success": False,
            "error": "سوکت نمایشگر مجازی ربات راه‌اندازی نشد. لطفاً چند لحظه بعد تلاش کنید."
        }

    return {
        "success": True,
        "account": account,
        "token": vnc_token,
        "vnc_url": vnc_url,
        "expires_at": expires_at,
        "timeout_seconds": 600
    }

def vnc_stop(account: str):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)
    vnc_guard_path = os.path.join(profile_dir, "bin", "vnc_guard.py")
    if os.path.exists(vnc_guard_path):
        subprocess.run([sys.executable, vnc_guard_path, "stop"], check=False)
    else:
        pid_file = os.path.join(profile_dir, "bot-desktop", "websockify.pid")
        token_file = os.path.join(profile_dir, "bot-desktop", "vnc_token.cfg")
        for f in [pid_file, token_file]:
            if os.path.exists(f):
                try: os.remove(f)
                except Exception: pass
    sys_token_file = f"/opt/inflow/data/vnc_tokens/{account}.token"
    if os.path.exists(sys_token_file):
        try: os.remove(sys_token_file)
        except Exception: pass
    return {"success": True, "account": account, "message": "VNC Guard session closed"}

def verify_session(account: str):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)
    cookie_candidates = [
        os.path.join(profile_dir, "bot-desktop", "browser-profile", "Default", "Cookies"),
        os.path.join(profile_dir, "bot-desktop", "browser-profile", "Default", "Network", "Cookies")
    ]
    cookie_db = next((p for p in cookie_candidates if os.path.exists(p)), None)

    authenticated = False
    if cookie_db and os.path.exists(cookie_db):
        try:
            conn = sqlite3.connect(f"file:{cookie_db}?mode=ro", uri=True)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM cookies WHERE host_key LIKE '%instagram.com%' AND name IN ('sessionid', 'ds_user_id')")
            rows = cursor.fetchall()
            names = {r[0] for r in rows}
            conn.close()
            
            if "sessionid" in names and "ds_user_id" in names:
                authenticated = True
                try:
                    import sys
                    sys.path.insert(0, "/opt/inflow")
                    from engine.ig_client import extract_profile_cookies
                    from curl_cffi import requests
                    cookies = extract_profile_cookies(os.path.join(profile_dir, "bot-desktop", "browser-profile"))
                    if not cookies.get("sessionid"):
                        authenticated = False
                    else:
                        sess = requests.Session(impersonate="chrome120", proxy="socks5://127.0.0.1:40000")
                        for k, v in cookies.items():
                            sess.cookies.set(k, v, domain=".instagram.com")
                        res = sess.get(
                            f"https://www.instagram.com/api/v1/users/web_profile_info/?username={account}",
                            headers={"X-IG-App-ID": "936619743392459", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                            timeout=10
                        )
                        # 200 is ideal, but 429 or page with logged-in still means valid login
                        if res.status_code == 200 or "logged-in" in res.text or res.status_code == 429:
                            authenticated = True
                except Exception:
                    pass
        except Exception:
            pass

    status = "live" if authenticated else "login_required"

    db_path = "/opt/inflow/data/inflow.db"
    if os.path.exists(db_path):
        try:
            db_conn = sqlite3.connect(db_path)
            db_cur = db_conn.cursor()
            db_cur.execute(
                "UPDATE accounts SET bot_status = ?, updated_at = datetime('now') WHERE username = ?",
                (status, account)
            )
            db_conn.commit()
            db_conn.close()
        except Exception:
            pass

    return {
        "success": True,
        "account": account,
        "authenticated": authenticated,
        "status": status
    }

def sync_account(account: str):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)
    sync_script = os.path.join(os.path.dirname(__file__), "sync_profile.js")

    if not os.path.exists(sync_script):
        return {"success": False, "account": account, "error": f"Sync script not found at {sync_script}"}

    try:
        proc = subprocess.run(
            ["node", sync_script, "--account", account, "--profile-dir", profile_dir],
            capture_output=True,
            text=True,
            timeout=120
        )
        if proc.returncode == 0:
            try:
                return json.loads(proc.stdout.strip())
            except Exception:
                return {"success": True, "account": account, "output": proc.stdout.strip()}
        else:
            try:
                return json.loads(proc.stderr.strip() or proc.stdout.strip())
            except Exception:
                return {"success": False, "account": account, "error": proc.stderr.strip() or proc.stdout.strip()}
    except Exception as e:
        return {"success": False, "account": account, "error": str(e)}

def destroy_profile(account: str):
    """
    Completely stops all worker and browser processes for the account,
    disables systemd units, and removes the entire bot profile directory
    leaving zero trace on the filesystem.
    """
    account_clean = account.strip().lstrip("@").lower()
    profile_name = get_profile_name(account_clean)
    profile_dir = get_profile_dir(profile_name)

    # 1. Stop and disable systemd worker service
    service_name = f"inflow-worker@{account_clean}.service"
    try:
        subprocess.run(["systemctl", "stop", service_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        subprocess.run(["systemctl", "disable", service_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
    except Exception:
        pass

    # 2. Stop VNC if running
    try:
        vnc_stop(account_clean)
    except Exception:
        pass

    # 3. Kill any chrome or agent processes using this profile directory
    try:
        subprocess.run(["pkill", "-f", profile_dir], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
        subprocess.run(["pkill", "-9", "-f", f"profile={profile_name}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
    except Exception:
        pass

    # 4. Remove the profile directory completely
    deleted_dir = False
    if os.path.exists(profile_dir):
        try:
            shutil.rmtree(profile_dir)
            deleted_dir = True
        except Exception:
            subprocess.run(["rm", "-rf", profile_dir], check=False)
            deleted_dir = not os.path.exists(profile_dir)

    # 5. Remove any leftover token files
    sys_token_file = f"/opt/inflow/data/vnc_tokens/{account_clean}.token"
    if os.path.exists(sys_token_file):
        try:
            os.remove(sys_token_file)
        except Exception:
            pass

    return {
        "success": True,
        "account": account_clean,
        "profile_dir": profile_dir,
        "profile_deleted": deleted_dir,
        "service_stopped": service_name
    }

def check_status(account: str):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)
    exists = os.path.exists(profile_dir)
    sock_path = os.path.join(profile_dir, "bot-desktop", "rfb.sock")
    sock_exists = os.path.exists(sock_path)
    pid_file = os.path.join(profile_dir, "bot-desktop", "websockify.pid")
    vnc_active = os.path.exists(pid_file)

    return {
        "success": True,
        "account": account,
        "profile_exists": exists,
        "screen_active": sock_exists,
        "vnc_active": vnc_active
    }

def main():
    parser = argparse.ArgumentParser(description="inFlow Hermes Server Orchestrator")
    parser.add_argument("command", choices=["provision", "vnc-start", "vnc-stop", "verify-session", "status", "sync", "destroy"])
    parser.add_argument("--account", required=True, help="Instagram account handle")
    parser.add_argument("--token", help="Page-dedicated API token")
    parser.add_argument("--url", help="Target URL for browser navigation")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    args = parser.parse_args()

    result = {"success": False, "error": "Unknown command"}
    if args.command == "provision":
        if not args.token:
            result = {"success": False, "error": "--token is required for provisioning"}
        else:
            result = provision_profile(args.account, args.token)
    elif args.command == "vnc-start":
        result = vnc_start(args.account, args.url)
    elif args.command == "vnc-stop":
        result = vnc_stop(args.account)
    elif args.command == "verify-session":
        result = verify_session(args.account)
    elif args.command == "status":
        result = check_status(args.account)
    elif args.command == "sync":
        result = sync_account(args.account)
    elif args.command == "destroy":
        result = destroy_profile(args.account)

    if args.json:
        print(json.dumps(result))
    else:
        print(result)

if __name__ == "__main__":
    main()
