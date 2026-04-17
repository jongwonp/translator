import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { processScript } from "@/lib/process-script";

// POST /api/scripts/:id/retry - 실패한 스크립트 재시도
export async function POST(
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

  if (script.status !== "failed") {
    return NextResponse.json(
      { error: "실패한 스크립트만 재시도할 수 있습니다." },
      { status: 400 }
    );
  }

  // 상태를 processing으로 변경
  await prisma.script.update({
    where: { id: scriptId },
    data: { status: "processing" },
  });

  // 비동기로 처리
  processScript(
    scriptId,
    script.url,
    script.sourceLanguage,
    script.targetLanguage
  ).catch(async (error) => {
    console.error("Script retry failed:", error);
    await prisma.script.update({
      where: { id: scriptId },
      data: { status: "failed" },
    });
  });

  return NextResponse.json({ status: "processing" });
}
