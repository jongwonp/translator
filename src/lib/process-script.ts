import { prisma } from "@/lib/prisma";
import { extractAudio, cleanupFile } from "@/lib/ytdlp";
import { transcribeAudio } from "@/lib/whisper";
import { translateSegments } from "@/lib/translate";
import { extractKeywordsFromTitle } from "@/lib/extract-keywords";

export async function processScript(
  scriptId: number,
  url: string,
  sourceLanguage: string,
  targetLanguage: string
) {
  let audioPath: string | null = null;

  try {
    // 1. 오디오 추출
    audioPath = await extractAudio(url);

    // 2. 음성 인식 (제목에서 뽑은 고유명사를 prompt로 전달해 표기 일관성 개선)
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { title: true, transcriptionModel: true },
    });
    const keywords = script?.title
      ? await extractKeywordsFromTitle(script.title, sourceLanguage)
      : "";
    const { segments } = await transcribeAudio(
      audioPath,
      script?.transcriptionModel || "whisper-1",
      sourceLanguage,
      keywords || undefined
    );

    // 3. 번역
    const translations = await translateSegments(
      segments,
      sourceLanguage,
      targetLanguage
    );

    // 4. DB에 저장
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
  }
}
