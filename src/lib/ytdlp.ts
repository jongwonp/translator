import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const execFileAsync = promisify(execFile);

const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";

function commonArgs(): string[] {
  const args: string[] = ["--remote-components", "ejs:github"];
  if (process.env.YTDLP_COOKIES_PATH) {
    args.push("--cookies", process.env.YTDLP_COOKIES_PATH);
  }
  return args;
}

export interface VideoInfo {
  title: string;
  duration: number;
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(YTDLP_PATH, [
    ...commonArgs(),
    "--dump-json",
    "--no-download",
    url,
  ]);
  const info = JSON.parse(stdout);
  return {
    title: info.title || "Untitled",
    duration: info.duration || 0,
  };
}

export async function extractAudio(url: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const fileId = `audio-${Date.now()}`;
  const outputTemplate = path.join(tmpDir, `${fileId}.%(ext)s`);

  await execFileAsync(YTDLP_PATH, [
    ...commonArgs(),
    "-f",
    "bestaudio",
    "-o",
    outputTemplate,
    url,
  ]);

  // yt-dlp determines the extension, find the downloaded file by prefix
  const files = fs
    .readdirSync(tmpDir)
    .filter((f) => f.startsWith(fileId) && !f.endsWith(".part"));

  if (files.length > 0) return path.join(tmpDir, files[0]);

  throw new Error("오디오 추출에 실패했습니다.");
}

export function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}
