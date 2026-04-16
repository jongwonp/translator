import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/vocabulary/export - CSV 내보내기 (Anki 호환)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");

  const where: Record<string, unknown> = { userId: auth.userId };
  if (language) where.language = language;

  const words = await prisma.vocabulary.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Anki CSV format: front\tback
  const csvLines = words.map((w) => {
    const front = w.reading ? `${w.word} (${w.reading})` : w.word;
    const back = w.example ? `${w.meaning}\n${w.example}` : w.meaning;
    return `${escapeCsv(front)}\t${escapeCsv(back)}`;
  });

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vocabulary-${language || "all"}.csv"`,
    },
  });
}

function escapeCsv(str: string): string {
  if (str.includes("\t") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
