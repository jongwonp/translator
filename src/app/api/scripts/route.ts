import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getVideoInfo, extractAudio, cleanupFile } from "@/lib/ytdlp";
import { transcribeAudio } from "@/lib/whisper";
import { translateSegments } from "@/lib/translate";

// POST /api/scripts - 스크립트 생성
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { url, sourceLanguage, targetLanguage } = await request.json();

    if (!url || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: "URL, 원본 언어, 번역 언어를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 1. 영상 정보 가져오기
    const videoInfo = await getVideoInfo(url);

    // 2. 스크립트 레코드 생성
    const script = await prisma.script.create({
      data: {
        userId: auth.userId,
        url,
        title: videoInfo.title,
        sourceLanguage,
        targetLanguage,
        status: "processing",
      },
    });

    // 3. 비동기로 처리 (응답은 먼저 반환)
    processScript(script.id, url, sourceLanguage, targetLanguage).catch(
      async (error) => {
        console.error("Script processing failed:", error);
        await prisma.script.update({
          where: { id: script.id },
          data: { status: "failed" },
        });
      }
    );

    return NextResponse.json(
      { scriptId: script.id, status: "processing", title: videoInfo.title },
      { status: 202 }
    );
  } catch (error) {
    console.error("Script creation error:", error);
    return NextResponse.json(
      { error: "스크립트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

async function processScript(
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

// GET /api/scripts - 내 스크립트 목록 조회
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const scripts = await prisma.script.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      url: true,
      sourceLanguage: true,
      targetLanguage: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ scripts });
}
