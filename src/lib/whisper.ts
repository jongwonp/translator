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

// 문장 분리: 마침표/물음표/느낌표(영문/일문/중문) 또는 줄바꿈 기준
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
