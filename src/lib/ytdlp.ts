import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const execFileAsync = promisify(execFile);

export interface VideoInfo {
  title: string;
  duration: number;
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync("yt-dlp", [
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
  const outputPath = path.join(tmpDir, `audio-${Date.now()}.mp3`);

  await execFileAsync("yt-dlp", [
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "-o",
    outputPath,
    url,
  ]);

  // yt-dlp may add extension, check both paths
  if (fs.existsSync(outputPath)) return outputPath;
  const withExt = outputPath + ".mp3";
  if (fs.existsSync(withExt)) return withExt;

  // Find the file by prefix
  const prefix = path.basename(outputPath).replace(".mp3", "");
  const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(prefix));
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
