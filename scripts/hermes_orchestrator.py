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
HOST_IP = os.environ.get("INFLOW_SERVER_HOST", "127.0.0.1")

VNC_GUARD_TEMPLATE = """#!/usr/bin/env python3
import os, sys, time, secrets, subprocess, signal

PID_FILE = "{profile_dir}/bot-desktop/websockify.pid"
TOKEN_FILE = "{profile_dir}/bot-desktop/vnc_token.cfg"
SOCK_PATH = "{profile_dir}/bot-desktop/rfb.sock"
PORT = {port}
HOST_IP = "{host_ip}"
PROFILE_DIR = "{profile_dir}/bot-desktop/browser-profile"

def ensure_desktop():
    if not os.path.exists(SOCK_PATH):
        py_cmd = (
            "import os, sys\\n"
            "os.environ['HERMES_HOME'] = '{profile_dir}'\\n"
            "sys.path.insert(0, '/usr/local/lib/hermes-agent')\\n"
            "try:\\n"
            "    from tools.bot_desktop import runtime\\n"
            "    runtime.start()\\n"
            "except Exception as e:\\n"
            "    pass\\n"
        )
        subprocess.run(["python3", "-c", py_cmd], check=False)
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

def ensure_chrome(url=None):
    clean_stale_chrome_locks()
    running = is_profile_chrome_running()
    env = os.environ.copy()
    env["DISPLAY"] = ":20"
    auth_file = "{profile_dir}/bot-desktop/Xauthority"
    if os.path.exists(auth_file):
        env["XAUTHORITY"] = auth_file
    if not running:
        target = url if url else "https://www.instagram.com/accounts/login/"
        cmd = [
            "google-chrome-stable", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
            "--disable-session-crashed-bubble", "--test-type", "--start-maximized",
            f"--user-data-dir={{PROFILE_DIR}}", target
        ]
        try:
            subprocess.Popen(cmd, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, close_fds=True, start_new_session=True)
            time.sleep(2)
        except FileNotFoundError:
            pass
    elif url:
        cmd = ["google-chrome-stable", "--no-sandbox", f"--user-data-dir={{PROFILE_DIR}}", url]
        try:
            subprocess.run(cmd, env=env, check=False)
            time.sleep(1)
        except Exception:
            pass

def stop():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f: pid = int(f.read().strip())
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.3)
            os.kill(pid, signal.SIGKILL)
        except Exception: pass
        try: os.remove(PID_FILE)
        except Exception: pass
    if os.path.exists(TOKEN_FILE):
        try: os.remove(TOKEN_FILE)
        except Exception: pass
    subprocess.run(f"fuser -k {{PORT}}/tcp 2>/dev/null || true", shell=True)
    print(f"VNC Guard: Port {{PORT}} is CLOSED.")

def start(url=None, timeout_seconds=600):
    stop()
    ensure_desktop()
    os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
    ensure_chrome(url)
    token = secrets.token_hex(8)
    with open(TOKEN_FILE, "w") as f:
        f.write(f"{{token}}: unix_socket:{{SOCK_PATH}}\\n")
    
    cmd = [
        "websockify", "--web", "/usr/share/novnc",
        str(PORT), "--token-plugin=ReadOnlyTokenFile", f"--token-source={{TOKEN_FILE}}"
    ]
    try:
        proc = subprocess.Popen(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL, close_fds=True, start_new_session=True)
        with open(PID_FILE, "w") as f: f.write(str(proc.pid))
        
        killer_cmd = f"sleep {{timeout_seconds}} && kill {{proc.pid}} 2>/dev/null && rm -f {{PID_FILE}} {{TOKEN_FILE}} 2>/dev/null"
        subprocess.Popen(killer_cmd, shell=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, close_fds=True, start_new_session=True)
    except FileNotFoundError:
        pass
        
    vnc_url = f"http://{{HOST_IP}}:{{PORT}}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={{token}}"
    print(json.dumps({{"success": True, "token": token, "vnc_url": vnc_url, "timeout_seconds": timeout_seconds}}))
    return vnc_url

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stop": stop()
    elif len(sys.argv) > 1 and sys.argv[1].startswith("http"): start(url=sys.argv[1])
    elif len(sys.argv) > 2 and sys.argv[1] == "start": start(url=sys.argv[2])
    else: start()
"""

CONFIG_YAML_TEMPLATE = """terminal:
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
        f.write(CONFIG_YAML_TEMPLATE.format(profile_dir=profile_dir))

    # 3. Write profile .env with dedicated token
    env_path = os.path.join(profile_dir, ".env")
    with open(env_path, "w") as f:
        f.write(f"INFLOW_ACCOUNT={account}\nINFLOW_PAGE_TOKEN={token}\n")

    # 4. Deploy vnc_guard.py into bin/
    vnc_guard_path = os.path.join(profile_dir, "bin", "vnc_guard.py")
    with open(vnc_guard_path, "w") as f:
        f.write(VNC_GUARD_TEMPLATE.format(
            profile_dir=profile_dir,
            port=VNC_PORT,
            host_ip=HOST_IP
        ))
    os.chmod(vnc_guard_path, 0o755)

    # 5. Start VNC Guard for initial login
    vnc_token = secrets.token_hex(8)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=600)).isoformat()
    vnc_url = f"http://{HOST_IP}:{VNC_PORT}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={vnc_token}"

    token_file = os.path.join(profile_dir, "bot-desktop", "vnc_token.cfg")
    sock_path = os.path.join(profile_dir, "bot-desktop", "rfb.sock")
    with open(token_file, "w") as f:
        f.write(f"{vnc_token}: unix_socket:{sock_path}\n")

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
    vnc_url = f"http://{HOST_IP}:{VNC_PORT}/vnc.html?autoconnect=true&resize=scale&path=websockify/?token={vnc_token}"

    token_file = os.path.join(profile_dir, "bot-desktop", "vnc_token.cfg")
    sock_path = os.path.join(profile_dir, "bot-desktop", "rfb.sock")
    os.makedirs(os.path.dirname(token_file), exist_ok=True)
    with open(token_file, "w") as f:
        f.write(f"{vnc_token}: unix_socket:{sock_path}\n")

    if os.path.exists(vnc_guard_path):
        target = target_url or "https://www.instagram.com/accounts/login/"
        subprocess.Popen([vnc_guard_path, "start", target], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)

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
        subprocess.run([vnc_guard_path, "stop"], check=False)
    else:
        pid_file = os.path.join(profile_dir, "bot-desktop", "websockify.pid")
        token_file = os.path.join(profile_dir, "bot-desktop", "vnc_token.cfg")
        for f in [pid_file, token_file]:
            if os.path.exists(f):
                try: os.remove(f)
                except Exception: pass
    return {"success": True, "account": account, "message": "VNC Guard session closed"}

def verify_session(account: str):
    profile_name = get_profile_name(account)
    profile_dir = get_profile_dir(profile_name)
    cookie_db = os.path.join(profile_dir, "bot-desktop", "browser-profile", "Default", "Network", "Cookies")

    authenticated = False
    if os.path.exists(cookie_db):
        try:
            conn = sqlite3.connect(f"file:{cookie_db}?mode=ro", uri=True)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM cookies WHERE host_key LIKE '%instagram.com%' AND name IN ('sessionid', 'ds_user_id')")
            rows = cursor.fetchall()
            names = {r[0] for r in rows}
            if "sessionid" in names and "ds_user_id" in names:
                authenticated = True
            conn.close()
        except Exception:
            pass

    return {
        "success": True,
        "account": account,
        "authenticated": authenticated,
        "status": "live" if authenticated else "login_required"
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
    parser.add_argument("command", choices=["provision", "vnc-start", "vnc-stop", "verify-session", "status"])
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

    if args.json:
        print(json.dumps(result))
    else:
        print(result)

if __name__ == "__main__":
    main()
