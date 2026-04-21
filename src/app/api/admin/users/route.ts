import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!(await isAdmin(auth.userId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const users = await prisma.user.findMany({
    where: status ? { status } : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
