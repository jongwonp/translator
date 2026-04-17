import { openai } from "./openai";

export async function extractKeywordsFromTitle(
  title: string,
  language: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `당신은 영상 제목에서 고유명사(지명, 인명, 브랜드명, 작품명 등)를 추출하는 도우미입니다.
조건:
- 원문 언어(${language})의 표기 그대로 반환 (번역/음역 금지)
- 고유명사만 추출. 일반 명사·형용사·동사 등은 제외
- 결과는 쉼표로 구분된 단어 나열로만 반환 (다른 설명 금지)
- 추출할 고유명사가 없으면 빈 문자열 반환`,
      },
      {
        role: "user",
        content: title,
      },
    ],
    temperature: 0,
  });

  return (response.choices[0].message.content || "").trim();
}
