import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!(await isAdmin(auth.userId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json(
      { error: "잘못된 사용자 ID입니다." },
      { status: 400 }
    );
  }

  const { status } = await request.json();
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json(
      { error: "status는 approved 또는 rejected여야 합니다." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, name: true, status: true },
  });

  return NextResponse.json(user);
}
