import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/vocabulary - 단어장에 저장
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { scriptId, words, language } = await request.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: "저장할 단어를 선택해주세요." },
        { status: 400 }
      );
    }

    await prisma.vocabulary.createMany({
      data: words.map(
        (w: {
          word: string;
          reading?: string;
          meaning: string;
          example?: string;
        }) => ({
          userId: auth.userId,
          scriptId: scriptId || null,
          word: w.word,
          reading: w.reading || "",
          meaning: w.meaning,
          example: w.example || "",
          language: language || "en",
        })
      ),
    });

    return NextResponse.json(
      { message: `${words.length}개 단어가 저장되었습니다.` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Vocabulary save error:", error);
    return NextResponse.json(
      { error: "단어 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/vocabulary - 다중 삭제
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "삭제할 단어를 선택해주세요." },
      { status: 400 }
    );
  }

  await prisma.vocabulary.deleteMany({
    where: {
      id: { in: ids },
      userId: auth.userId,
    },
  });

  return new NextResponse(null, { status: 204 });
}

// GET /api/vocabulary - 단어장 조회
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = { userId: auth.userId };
  if (language) where.language = language;
  if (search) {
    where.OR = [
      { word: { contains: search } },
      { meaning: { contains: search } },
    ];
  }

  const [total, words] = await Promise.all([
    prisma.vocabulary.count({ where }),
    prisma.vocabulary.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        script: { select: { title: true, url: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, words, page, limit });
}
