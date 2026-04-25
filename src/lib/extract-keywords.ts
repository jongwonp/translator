import { openai } from "./openai";

// gpt-4o-transcribe는 prompt 스타일을 흉내내므로, 쉼표 나열을 그대로 주면
// 전사 결과에도 마침표가 거의 안 붙어 문장 분리가 실패한다.
// 언어별 자연문으로 감싸 "마침표 있는 문장 스타일"을 유도한다.
const KEYWORD_WRAPPERS: Record<string, (kw: string) => string> = {
  ja: (kw) => `この動画の主なキーワード: ${kw}。`,
  en: (kw) => `Main keywords from this video: ${kw}.`,
  zh: (kw) => `本视频的主要关键词: ${kw}。`,
  ko: (kw) => `이 영상의 주요 키워드: ${kw}.`,
  es: (kw) => `Palabras clave principales del video: ${kw}.`,
  fr: (kw) => `Mots-clés principaux de la vidéo: ${kw}.`,
};

export function wrapKeywordsForTranscription(
  keywords: string,
  language: string
): string {
  const wrapper = KEYWORD_WRAPPERS[language];
  if (!wrapper) return `${keywords}.`;
  return wrapper(keywords);
}

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
