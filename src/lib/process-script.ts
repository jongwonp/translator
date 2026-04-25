import { prisma } from "@/lib/prisma";
import { extractAudio, cleanupFile } from "@/lib/ytdlp";
import { transcribeAudio, type WhisperSegment } from "@/lib/whisper";
import { translateSegments } from "@/lib/translate";
import {
  extractKeywordsFromTitle,
  wrapKeywordsForTranscription,
} from "@/lib/extract-keywords";
import {
  shouldChunk,
  splitAudio,
  cleanupChunks,
  CHUNK_OVERLAP_SECONDS,
  type AudioChunk,
  type ChunkConfig,
} from "@/lib/audio-chunk";

// gpt-4o-transcribe는 출력 토큰 상한 + 긴 입력에서 mid-chunk 누락 가능성이
// 알려져 있어, 더 잘게(5분) 자르고 호출도 병렬로 보낸다.
// whisper-1은 세그먼트 단위로 결과를 반환해 출력 제약·누락 위험이 사실상 없음.
const CHUNK_CONFIGS: Record<string, ChunkConfig> = {
  "whisper-1": {
    thresholdBytes: 24 * 1024 * 1024,
    chunkDurationSec: 1200,
  },
  "gpt-4o-transcribe": {
    thresholdBytes: 24 * 1024 * 1024,
    thresholdDurationSec: 300,
    chunkDurationSec: 300,
  },
};

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
    const prompt = keywords
      ? wrapKeywordsForTranscription(keywords, sourceLanguage)
      : undefined;

    let segments: WhisperSegment[];
    const chunkConfig = CHUNK_CONFIGS[model] ?? CHUNK_CONFIGS["whisper-1"];

    await prisma.script.update({
      where: { id: scriptId },
      data: { status: "transcribing" },
    });

    if (await shouldChunk(audioPath, chunkConfig)) {
      chunks = await splitAudio(audioPath, chunkConfig);
      segments = await transcribeChunks(
        scriptId,
        chunks,
        model,
        sourceLanguage,
        prompt
      );
    } else {
      const result = await transcribeAudio(
        audioPath,
        model,
        sourceLanguage,
        prompt
      );
      segments = result.segments;
    }

    await prisma.script.update({
      where: { id: scriptId },
      data: { status: "translating" },
    });

    const translations = await translateSegments(
      segments,
      sourceLanguage,
      targetLanguage,
      async (done, total) => {
        await prisma.script.update({
          where: { id: scriptId },
          data: { status: `translating:${done}/${total}` },
        });
      }
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
  scriptId: number,
  chunks: AudioChunk[],
  model: string,
  sourceLanguage: string,
  prompt: string | undefined
): Promise<WhisperSegment[]> {
  // 모든 청크를 동시에 전사. 청크가 완료될 때마다 진행 카운터 갱신.
  let done = 0;
  const total = chunks.length;
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const result = await transcribeAudio(
        chunk.path,
        model,
        sourceLanguage,
        prompt
      );
      done++;
      await prisma.script.update({
        where: { id: scriptId },
        data: { status: `transcribing:${done}/${total}` },
      });
      return result;
    })
  );

  const merged: WhisperSegment[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const { startOffset } = chunks[i];
    const { segments } = results[i];

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
