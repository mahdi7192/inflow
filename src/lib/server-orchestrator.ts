import { execFile } from "child_process";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";
import { BotStatus, updateAccountBotStatus, setAccountVncSession, clearAccountVncSession } from "./db";

const execFileAsync = promisify(execFile);

function parseSafeJson<T = any>(stdout: string): T {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    throw new Error(`Invalid JSON output: ${trimmed}`);
  }
}

export interface ProvisionResult {
  success: boolean;
  profile_name: string;
  status: BotStatus;
  vnc_url?: string;
  token?: string;
  expires_at?: string;
  error?: string;
}

export interface VncSessionResult {
  success: boolean;
  vnc_url: string;
  token: string;
  expires_at: string;
  timeout_seconds: number;
  error?: string;
}

export interface SessionVerificationResult {
  success: boolean;
  authenticated: boolean;
  status: BotStatus;
  error?: string;
}

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "hermes_orchestrator.py");
const ORCHESTRATOR_URL = process.env.HERMES_ORCHESTRATOR_URL;
const ORCHESTRATOR_SECRET = process.env.HERMES_ORCHESTRATOR_SECRET;
const IS_SIMULATION =
  process.env.HERMES_SIMULATION === "true" ||
  process.platform === "darwin" ||
  process.platform === "win32";

export class ServerOrchestrator {
  /**
   * Determine execution mode: 'remote' if URL configured, 'local' on Linux, or 'mock' for dev
   */
  static getMode(): "remote" | "local" | "mock" {
    if (ORCHESTRATOR_URL) return "remote";
    if (IS_SIMULATION) return "mock";
    return "local";
  }

  /**
   * Provisions a dedicated Hermes profile for an account.
   */
  static async provisionProfile(account: string, pageToken: string): Promise<ProvisionResult> {
    const profileName = `inflow_${account}`;
    const mode = this.getMode();

    if (mode === "mock") {
      // High-fidelity simulation for development environments
      const token = crypto.randomBytes(8).toString("hex");
      const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      const vncUrl = `http://localhost:6080/vnc.html?autoconnect=true&resize=scale&path=websockify/?token=${token}`;

      updateAccountBotStatus(account, "login_required", "پروفایل هرمس و مانیتور مجازی با موفقیت ایجاد شد.", "system", null, profileName);
      setAccountVncSession(account, token, expiresAt);

      return {
        success: true,
        profile_name: profileName,
        status: "login_required",
        vnc_url: vncUrl,
        token,
        expires_at: expiresAt,
      };
    }

    if (mode === "local") {
      try {
        const { stdout } = await execFileAsync("python3", [
          SCRIPT_PATH,
          "provision",
          "--account",
          account,
          "--token",
          pageToken,
          "--json",
        ]);
        const data = parseSafeJson(stdout);
        if (data.success) {
          updateAccountBotStatus(account, "login_required", "پروفایل هرمس و مرورگر رسمی با موفقیت مستقر شدند.", "system", null, data.profile_name);
          if (data.token && data.expires_at) {
            setAccountVncSession(account, data.token, data.expires_at);
          }
          return {
            success: true,
            profile_name: data.profile_name || profileName,
            status: "login_required",
            vnc_url: data.vnc_url,
            token: data.token,
            expires_at: data.expires_at,
          };
        } else {
          updateAccountBotStatus(account, "error", data.error || "خطا در ساخت پروفایل هرمس", "system", data.error);
          return {
            success: false,
            profile_name: profileName,
            status: "error",
            error: data.error,
          };
        }
      } catch (err: unknown) {
        const errorMsg = (err as Error).message || "Failed to execute hermes_orchestrator.py";
        updateAccountBotStatus(account, "error", errorMsg, "system", errorMsg);
        return {
          success: false,
          profile_name: profileName,
          status: "error",
          error: errorMsg,
        };
      }
    }

    // Remote HTTP mode
    try {
      const resp = await fetch(`${ORCHESTRATOR_URL}/provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
        },
        body: JSON.stringify({ account, token: pageToken }),
      });
      const data = await resp.json();
      if (data.success) {
        updateAccountBotStatus(account, "login_required", "پروفایل هرمس در سرور ابری راه‌اندازی شد.", "system", null, data.profile_name);
        if (data.token && data.expires_at) {
          setAccountVncSession(account, data.token, data.expires_at);
        }
        return {
          success: true,
          profile_name: data.profile_name || profileName,
          status: "login_required",
          vnc_url: data.vnc_url,
          token: data.token,
          expires_at: data.expires_at,
        };
      } else {
        updateAccountBotStatus(account, "error", data.error || "خطا از سرور ارکستراتور", "system", data.error);
        return {
          success: false,
          profile_name: profileName,
          status: "error",
          error: data.error,
        };
      }
    } catch (err: unknown) {
      updateAccountBotStatus(account, "error", (err as Error).message, "system", (err as Error).message);
      return {
        success: false,
        profile_name: profileName,
        status: "error",
        error: (err as Error).message,
      };
    }
  }

  /**
   * Starts an on-demand VNC Guard session for an account with a 10-minute token.
   */
  static async startVncSession(account: string, targetUrl?: string): Promise<VncSessionResult> {
    const mode = this.getMode();

    if (mode === "mock") {
      const token = crypto.randomBytes(8).toString("hex");
      const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      const vncUrl = `http://localhost:6080/vnc.html?autoconnect=true&resize=scale&path=websockify/?token=${token}`;

      setAccountVncSession(account, token, expiresAt);
      return {
        success: true,
        vnc_url: vncUrl,
        token,
        expires_at: expiresAt,
        timeout_seconds: 600,
      };
    }

    if (mode === "local") {
      try {
        const args = [SCRIPT_PATH, "vnc-start", "--account", account, "--json"];
        if (targetUrl) args.push("--url", targetUrl);

        const { stdout } = await execFileAsync("python3", args);
        const data = parseSafeJson(stdout);
        if (data.success) {
          setAccountVncSession(account, data.token, data.expires_at);
          return {
            success: true,
            vnc_url: data.vnc_url,
            token: data.token,
            expires_at: data.expires_at,
            timeout_seconds: data.timeout_seconds || 600,
          };
        }
        return { success: false, vnc_url: "", token: "", expires_at: "", timeout_seconds: 0, error: data.error };
      } catch (err: unknown) {
        return { success: false, vnc_url: "", token: "", expires_at: "", timeout_seconds: 0, error: (err as Error).message };
      }
    }

    // Remote mode
    try {
      const resp = await fetch(`${ORCHESTRATOR_URL}/vnc-start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
        },
        body: JSON.stringify({ account, url: targetUrl }),
      });
      const data = await resp.json();
      if (data.success) {
        setAccountVncSession(account, data.token, data.expires_at);
        return {
          success: true,
          vnc_url: data.vnc_url,
          token: data.token,
          expires_at: data.expires_at,
          timeout_seconds: data.timeout_seconds || 600,
        };
      }
      return { success: false, vnc_url: "", token: "", expires_at: "", timeout_seconds: 0, error: data.error };
    } catch (err: unknown) {
      return { success: false, vnc_url: "", token: "", expires_at: "", timeout_seconds: 0, error: (err as Error).message };
    }
  }

  /**
   * Closes an active VNC Guard session immediately.
   */
  static async stopVncSession(account: string): Promise<{ success: boolean; error?: string }> {
    clearAccountVncSession(account);
    const mode = this.getMode();

    if (mode === "mock") {
      return { success: true };
    }

    if (mode === "local") {
      try {
        await execFileAsync("python3", [SCRIPT_PATH, "vnc-stop", "--account", account, "--json"]);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
      }
    }

    // Remote mode
    try {
      await fetch(`${ORCHESTRATOR_URL}/vnc-stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
        },
        body: JSON.stringify({ account }),
      });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Verifies if an authentic Instagram session was harvested in Chrome.
   */
  static async verifySession(account: string): Promise<SessionVerificationResult> {
    const mode = this.getMode();

    if (mode === "mock") {
      updateAccountBotStatus(account, "live", "نشست اینستاگرام با موفقیت تایید شد و ربات لایو است.", "system");
      clearAccountVncSession(account);
      return { success: true, authenticated: true, status: "live" };
    }

    if (mode === "local") {
      try {
        const { stdout } = await execFileAsync("python3", [
          SCRIPT_PATH,
          "verify-session",
          "--account",
          account,
          "--json",
        ]);
        const data = parseSafeJson(stdout);
        if (data.authenticated) {
          updateAccountBotStatus(account, "live", "نشست اینستاگرام استخراج و تایید شد.", "system");
          clearAccountVncSession(account);
          return { success: true, authenticated: true, status: "live" };
        }
        return { success: true, authenticated: false, status: "login_required" };
      } catch (err: unknown) {
        return { success: false, authenticated: false, status: "error", error: (err as Error).message };
      }
    }

    // Remote mode
    try {
      const resp = await fetch(`${ORCHESTRATOR_URL}/verify-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
        },
        body: JSON.stringify({ account }),
      });
      const data = await resp.json();
      if (data.authenticated) {
        updateAccountBotStatus(account, "live", "نشست اینستاگرام استخراج و تایید شد.", "system");
        clearAccountVncSession(account);
        return { success: true, authenticated: true, status: "live" };
      }
      return { success: true, authenticated: false, status: "login_required" };
    } catch (err: unknown) {
      return { success: false, authenticated: false, status: "error", error: (err as Error).message };
    }
  }

  /**
   * Synchronizes account profile metrics and posts using the isolated bot browser profile.
   */
  static async syncAccount(account: string): Promise<{
    success: boolean;
    posts_synced?: number;
    followers_text?: string;
    total_posts_reported?: number;
    error?: string;
  }> {
    const mode = this.getMode();
    if (mode === "mock") {
      return { success: true, posts_synced: 10, followers_text: "1,200 followers" };
    }

    if (mode === "local") {
      try {
        const { stdout } = await execFileAsync("python3", [
          SCRIPT_PATH,
          "sync",
          "--account",
          account,
          "--json",
        ], { timeout: 120000 });
        const data = parseSafeJson(stdout);
        return data;
      } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
      }
    }

    // Remote mode
    try {
      const resp = await fetch(`${ORCHESTRATOR_URL}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
        },
        body: JSON.stringify({ account }),
      });
      return await resp.json();
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
