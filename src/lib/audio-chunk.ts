import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const execFileAsync = promisify(execFile);

export const CHUNK_OVERLAP_SECONDS = 3;

export interface ChunkConfig {
  thresholdBytes?: number;
  thresholdDurationSec?: number;
  chunkDurationSec: number;
}

export interface AudioChunk {
  path: string;
  startOffset: number;
}

export async function shouldChunk(
  filePath: string,
  config: ChunkConfig
): Promise<boolean> {
  if (config.thresholdBytes) {
    const size = fs.statSync(filePath).size;
    if (size > config.thresholdBytes) return true;
  }
  if (config.thresholdDurationSec) {
    const duration = await getDuration(filePath);
    if (duration > config.thresholdDurationSec) return true;
  }
  return false;
}

async function getDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

export async function splitAudio(
  filePath: string,
  config: ChunkConfig
): Promise<AudioChunk[]> {
  const duration = await getDuration(filePath);
  const tmpDir = os.tmpdir();
  const ext = path.extname(filePath);
  const base = `chunk-${Date.now()}`;

  const chunks: AudioChunk[] = [];
  let idx = 0;

  for (let start = 0; start < duration; start += config.chunkDurationSec) {
    const chunkDuration = Math.min(
      config.chunkDurationSec + CHUNK_OVERLAP_SECONDS,
      duration - start
    );
    const chunkPath = path.join(tmpDir, `${base}-${idx}${ext}`);

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      String(start),
      "-t",
      String(chunkDuration),
      "-i",
      filePath,
      "-c",
      "copy",
      chunkPath,
    ]);

    chunks.push({ path: chunkPath, startOffset: start });
    idx++;
  }

  return chunks;
}

export function cleanupChunks(chunks: AudioChunk[]) {
  for (const c of chunks) {
    try {
      if (fs.existsSync(c.path)) fs.unlinkSync(c.path);
    } catch {
      // ignore cleanup errors
    }
  }
}
