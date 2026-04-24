import { prisma } from "@/lib/prisma";
import { extractAudio, cleanupFile } from "@/lib/ytdlp";
import { transcribeAudio, type WhisperSegment } from "@/lib/whisper";
import { translateSegments } from "@/lib/translate";
import { extractKeywordsFromTitle } from "@/lib/extract-keywords";
import {
  shouldChunk,
  splitAudio,
  cleanupChunks,
  CHUNK_OVERLAP_SECONDS,
  type AudioChunk,
} from "@/lib/audio-chunk";

export async function processScript(
  scriptId: number,
  url: string,
  sourceLanguage: string,
  targetLanguage: string
) {
  let audioPath: string | null = null;
  let chunks: AudioChunk[] = [];

  try {
    audioPath = await extractAudio(url);

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { title: true, transcriptionModel: true },
    });
    const model = script?.transcriptionModel || "whisper-1";
    const keywords = script?.title
      ? await extractKeywordsFromTitle(script.title, sourceLanguage)
      : "";
    const prompt = keywords || undefined;

    let segments: WhisperSegment[];

    if (shouldChunk(audioPath)) {
      chunks = await splitAudio(audioPath);
      segments = await transcribeChunks(chunks, model, sourceLanguage, prompt);
    } else {
      const result = await transcribeAudio(
        audioPath,
        model,
        sourceLanguage,
        prompt
      );
      segments = result.segments;
    }

    const translations = await translateSegments(
      segments,
      sourceLanguage,
      targetLanguage
    );

    await prisma.segment.createMany({
      data: segments.map((seg, index) => ({
        scriptId,
        startTime: seg.start,
        endTime: seg.end,
        originalText: seg.text,
        translatedText: translations[index] || "",
        position: index,
      })),
    });

    await prisma.script.update({
      where: { id: scriptId },
      data: { status: "completed" },
    });
  } finally {
    if (audioPath) cleanupFile(audioPath);
    cleanupChunks(chunks);
  }
}

async function transcribeChunks(
  chunks: AudioChunk[],
  model: string,
  sourceLanguage: string,
  prompt: string | undefined
): Promise<WhisperSegment[]> {
  const merged: WhisperSegment[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const { path: chunkPath, startOffset } = chunks[i];
    const { segments } = await transcribeAudio(
      chunkPath,
      model,
      sourceLanguage,
      prompt
    );

    for (const seg of segments) {
      const adjusted: WhisperSegment = {
        start: seg.start + startOffset,
        end: seg.end + startOffset,
        text: seg.text,
      };

      const inOverlap =
        i > 0 && adjusted.start < startOffset + CHUNK_OVERLAP_SECONDS;

      if (!inOverlap) {
        merged.push(adjusted);
        continue;
      }

      const dupIdx = merged.findLastIndex(
        (m) =>
          Math.abs(m.start - adjusted.start) <= 3 &&
          textsOverlap(m.text, adjusted.text)
      );

      if (dupIdx === -1) {
        merged.push(adjusted);
      } else if (adjusted.end > merged[dupIdx].end) {
        merged[dupIdx] = {
          start: Math.min(merged[dupIdx].start, adjusted.start),
          end: adjusted.end,
          text: adjusted.text,
        };
      }
    }
  }

  return merged;
}

function textsOverlap(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return true;
  return (
    na.length >= 4 &&
    nb.length >= 4 &&
    (na.includes(nb) || nb.includes(na))
  );
}
