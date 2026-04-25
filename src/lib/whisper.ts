import fs from "fs";
import { openai } from "./openai";

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  segments: WhisperSegment[];
  hasTimestamps: boolean;
}

export async function transcribeAudio(
  audioPath: string,
  model: string,
  language?: string,
  prompt?: string
): Promise<TranscriptionResult> {
  if (model === "gpt-4o-transcribe") {
    return transcribeWithGpt4o(audioPath, language, prompt);
  }
  return transcribeWithWhisper(audioPath, language, prompt);
}

async function transcribeWithWhisper(
  audioPath: string,
  language?: string,
  prompt?: string
): Promise<TranscriptionResult> {
  const file = fs.createReadStream(audioPath);

  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
    ...(language && { language }),
    ...(prompt && { prompt }),
  });

  const segments = (response as unknown as { segments?: WhisperSegment[] })
    .segments;
  if (!segments) {
    return {
      segments: [{ start: 0, end: 0, text: response.text }],
      hasTimestamps: false,
    };
  }

  return {
    segments: segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    })),
    hasTimestamps: true,
  };
}

async function transcribeWithGpt4o(
  audioPath: string,
  language?: string,
  prompt?: string
): Promise<TranscriptionResult> {
  const file = fs.createReadStream(audioPath);

  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-transcribe",
    response_format: "json",
    ...(language && { language }),
    ...(prompt && { prompt }),
  });

  const sentences = splitIntoSentences(response.text);
  return {
    segments: sentences.map((text) => ({ start: 0, end: 0, text })),
    hasTimestamps: false,
  };
}

// 문장 분리: 마침표/물음표/느낌표(영문/일문/중문) 또는 줄바꿈 기준.
// prompt 스타일 간섭 등으로 구두점이 거의 없는 전사가 돌아오면
// 쉼표 경계를 이용하되 너무 잘게 쪼개지지 않도록 목표 길이로 다시 묶는다.
function splitIntoSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?。！？])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length > 1 || text.length <= 200) return sentences;

  const TARGET_LEN = 150;

  // 쉼표 경계로 쪼갠 뒤, 목표 길이에 도달할 때까지 이어 붙여 읽기 편한 크기로 재조립
  const parts = text.split(/(?<=[,、，])/);
  if (parts.length >= 3) {
    const grouped: string[] = [];
    let buffer = "";
    for (const part of parts) {
      buffer += part;
      if (buffer.length >= TARGET_LEN) {
        grouped.push(buffer.trim());
        buffer = "";
      }
    }
    if (buffer.trim()) {
      if (grouped.length > 0 && buffer.length < TARGET_LEN / 2) {
        grouped[grouped.length - 1] =
          (grouped[grouped.length - 1] + buffer).trim();
      } else {
        grouped.push(buffer.trim());
      }
    }
    if (grouped.length >= 2) return grouped;
  }

  // 쉼표도 거의 없는 극단 케이스: 글자수 단위 강제 분할
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += TARGET_LEN) {
    chunks.push(text.slice(i, i + TARGET_LEN).trim());
  }
  return chunks.filter((s) => s.length > 0);
}
