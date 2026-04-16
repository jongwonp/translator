import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/scripts/:id - 스크립트 상세 조회
export async function GET(
  _request: NextRequest,
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
    include: {
      segments: { orderBy: { position: "asc" } },
    },
  });

  if (!script || script.userId !== auth.userId) {
    return NextResponse.json(
      { error: "스크립트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(script);
}

// DELETE /api/scripts/:id - 스크립트 삭제
export async function DELETE(
  _request: NextRequest,
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
  });

  if (!script || script.userId !== auth.userId) {
    return NextResponse.json(
      { error: "스크립트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  await prisma.script.delete({ where: { id: scriptId } });

  return new NextResponse(null, { status: 204 });
}
