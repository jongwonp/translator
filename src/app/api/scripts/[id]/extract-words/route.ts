import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { extractWords } from "@/lib/extract-words";

// POST /api/scripts/:id/extract-words - 단어 추출
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const scriptId = parseInt(id);

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { segments: { orderBy: { position: "asc" } } },
  });

  if (!script || script.userId !== auth.userId) {
    return NextResponse.json(
      { error: "스크립트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { segmentIds, level = "intermediate" } = body;

    // Filter segments if specific IDs provided
    const targetSegments = segmentIds
      ? script.segments.filter((s) => segmentIds.includes(s.id))
      : script.segments;

    if (targetSegments.length === 0) {
      return NextResponse.json({ words: [] });
    }

    // Get existing vocabulary to exclude
    const existingVocab = await prisma.vocabulary.findMany({
      where: {
        userId: auth.userId,
        language: script.sourceLanguage,
      },
      select: { word: true },
    });
    const existingWords = existingVocab.map((v) => v.word);

    const words = await extractWords(
      targetSegments.map((s) => ({ id: s.id, originalText: s.originalText })),
      script.sourceLanguage,
      level,
      existingWords
    );

    return NextResponse.json({ words });
  } catch (error) {
    console.error("Word extraction error:", error);
    return NextResponse.json(
      { error: "단어 추출에 실패했습니다." },
      { status: 500 }
    );
  }
}
