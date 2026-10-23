import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.join(process.cwd(), "data", "media_cache");

if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Unpack any nested proxies
  while (
    targetUrl &&
    (targetUrl.includes("/api/media/proxy?url=") ||
      targetUrl.includes("/api/image-proxy?url="))
  ) {
    const idx = targetUrl.indexOf("url=");
    if (idx !== -1) {
      try {
        targetUrl = decodeURIComponent(targetUrl.substring(idx + 4));
      } catch {
        targetUrl = targetUrl.substring(idx + 4);
      }
    } else {
      break;
    }
  }

  if (
    targetUrl &&
    !targetUrl.startsWith("http://") &&
    !targetUrl.startsWith("https://")
  ) {
    try {
      const decoded = decodeURIComponent(targetUrl);
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        targetUrl = decoded;
      }
    } catch {
      // ignore
    }
  }

  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new NextResponse("Invalid protocol", { status: 400 });
    }

    const urlHash = crypto.createHash("md5").update(targetUrl).digest("hex");
    const cachePath = path.join(CACHE_DIR, `${urlHash}.jpg`);

    if (fs.existsSync(cachePath)) {
      const cachedBuf = fs.readFileSync(cachePath);
      return new NextResponse(cachedBuf, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
        },
      });
    }

    // Check if URL looks like an MP4/video upfront
    const isVideoUrl =
      parsed.pathname.endsWith(".mp4") ||
      targetUrl.includes(".mp4?") ||
      targetUrl.includes("/o1/v/t2/f2/m86/");

    if (isVideoUrl) {
      try {
        const { stdout } = await execFileAsync(
          "ffmpeg",
          [
            "-ss",
            "00:00:01",
            "-i",
            targetUrl,
            "-vframes",
            "1",
            "-q:v",
            "2",
            "-f",
            "image2pipe",
            "-vcodec",
            "mjpeg",
            "pipe:1",
          ],
          { encoding: "buffer", maxBuffer: 15 * 1024 * 1024 }
        );

        if (stdout && stdout.length > 0) {
          try {
            fs.writeFileSync(cachePath, stdout);
          } catch {
            // cache write failure is non-fatal
          }
          return new NextResponse(stdout, {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
            },
          });
        }
      } catch (ffmpegErr) {
        console.warn("FFmpeg frame extraction failed, falling back to fetch:", ffmpegErr);
      }
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream image fetch failed: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (contentType.startsWith("video/")) {
      try {
        const { stdout } = await execFileAsync(
          "ffmpeg",
          [
            "-ss",
            "00:00:01",
            "-i",
            targetUrl,
            "-vframes",
            "1",
            "-q:v",
            "2",
            "-f",
            "image2pipe",
            "-vcodec",
            "mjpeg",
            "pipe:1",
          ],
          { encoding: "buffer", maxBuffer: 15 * 1024 * 1024 }
        );

        if (stdout && stdout.length > 0) {
          try {
            fs.writeFileSync(cachePath, stdout);
          } catch {}
          return new NextResponse(stdout, {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
            },
          });
        }
      } catch {
        // ignore and fallback to buffer
      }
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    return new NextResponse(`Image proxy error: ${(error as Error).message}`, {
      status: 500,
    });
  }
}
