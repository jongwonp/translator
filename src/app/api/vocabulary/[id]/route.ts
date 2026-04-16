import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// DELETE /api/vocabulary/:id - 단어 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const wordId = parseInt(id);

  const word = await prisma.vocabulary.findUnique({
    where: { id: wordId },
  });

  if (!word || word.userId !== auth.userId) {
    return NextResponse.json(
      { error: "단어를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  await prisma.vocabulary.delete({ where: { id: wordId } });

  return new NextResponse(null, { status: 204 });
}
