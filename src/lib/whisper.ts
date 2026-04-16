import fs from "fs";
import { openai } from "./openai";

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export async function transcribeAudio(
  audioPath: string,
  language?: string
): Promise<WhisperSegment[]> {
  const file = fs.createReadStream(audioPath);

  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
    ...(language && { language }),
  });

  const segments = (response as unknown as { segments?: WhisperSegment[] })
    .segments;
  if (!segments) {
    return [{ start: 0, end: 0, text: response.text }];
  }

  return segments.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));
}
