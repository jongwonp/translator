import { openai } from "./openai";

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  zh: "중국어",
};

const LEVEL_DESCRIPTIONS: Record<string, Record<string, string>> = {
  ja: {
    beginner: "JLPT N5~N4 수준 이하의 단어는 제외하고, N3 이상의 단어를 추출",
    intermediate: "JLPT N4~N3 수준 이하의 단어는 제외하고, N2 이상의 단어를 추출",
    advanced: "JLPT N2 이하의 단어는 제외하고, N1 수준 이상의 어려운 단어만 추출",
  },
  en: {
    beginner: "기초 영어 단어(상위 2000단어)를 제외하고 추출",
    intermediate: "중급 영어 단어(상위 5000단어)를 제외하고 추출",
    advanced: "고급 영어 단어(상위 8000단어)를 제외하고, 전문 용어나 고급 단어만 추출",
  },
  zh: {
    beginner: "HSK 1~2급 수준 이하의 단어는 제외하고 추출",
    intermediate: "HSK 1~4급 수준 이하의 단어는 제외하고 추출",
    advanced: "HSK 5급 이하의 단어는 제외하고, 6급 이상의 어려운 단어만 추출",
  },
};

export interface ExtractedWord {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  segmentId: number;
}

export async function extractWords(
  segments: { id: number; originalText: string }[],
  sourceLanguage: string,
  level: string,
  existingWords: string[]
): Promise<ExtractedWord[]> {
  const langName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const levelDesc =
    LEVEL_DESCRIPTIONS[sourceLanguage]?.[level] ||
    "학습자 수준에 맞는 어려운 단어를 추출";

  const segmentTexts = segments
    .map((s) => `[SEG-${s.id}] ${s.originalText}`)
    .join("\n");

  const excludeList =
    existingWords.length > 0
      ? `\n\n이미 사용자 단어장에 있는 단어 (제외): ${existingWords.join(", ")}`
      : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `당신은 ${langName} 어학 교사입니다. 주어진 스크립트에서 학습자에게 유용한 단어를 추출해주세요.

조건:
- ${levelDesc}
- 고유명사(인명, 지명, 브랜드명)는 제외
- 각 단어에 대해 발음(읽기), 한국어 뜻, 원문에서의 예문을 포함
- 이미 단어장에 있는 단어는 제외
- 결과는 반드시 JSON 배열로 반환

반환 형식:
[{"word": "단어", "reading": "발음", "meaning": "뜻", "example": "예문", "segmentId": 세그먼트ID}]`,
      },
      {
        role: "user",
        content: `다음 ${langName} 스크립트에서 어려운 단어를 추출해주세요:\n\n${segmentTexts}${excludeList}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || "{}";
  try {
    const parsed = JSON.parse(content);
    const words = Array.isArray(parsed) ? parsed : parsed.words || [];
    return words.map((w: ExtractedWord) => ({
      word: w.word || "",
      reading: w.reading || "",
      meaning: w.meaning || "",
      example: w.example || "",
      segmentId: w.segmentId || segments[0]?.id || 0,
    }));
  } catch {
    return [];
  }
}
