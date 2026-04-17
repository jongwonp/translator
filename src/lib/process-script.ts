import { prisma } from "@/lib/prisma";
import { extractAudio, cleanupFile } from "@/lib/ytdlp";
import { transcribeAudio } from "@/lib/whisper";
import { translateSegments } from "@/lib/translate";

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

    // 2. 음성 인식
    const whisperSegments = await transcribeAudio(audioPath, sourceLanguage);

    // 3. 번역
    const translations = await translateSegments(
      whisperSegments,
      sourceLanguage,
      targetLanguage
    );

    // 4. DB에 저장
    await prisma.segment.createMany({
      data: whisperSegments.map((seg, index) => ({
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
