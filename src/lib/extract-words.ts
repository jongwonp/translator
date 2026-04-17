import { openai } from "./openai";

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  zh: "중국어",
};

const DIFFICULTY_SCALES: Record<string, string> = {
  ja: "JLPT 기준으로 N5(가장 쉬움) ~ N1(가장 어려움)",
  en: "CEFR 기준으로 A1(가장 쉬움) ~ C2(가장 어려움)",
  zh: "HSK 기준으로 1급(가장 쉬움) ~ 6급(가장 어려움)",
};

export interface ExtractedWord {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  segmentId: number;
  difficulty: string;
}

export async function extractWords(
  segments: { id: number; originalText: string }[],
  sourceLanguage: string,
  existingWords: string[]
): Promise<ExtractedWord[]> {
  const langName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const difficultyScale =
    DIFFICULTY_SCALES[sourceLanguage] || "쉬움 ~ 어려움 순서로 난이도를 표기";

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
        content: `당신은 ${langName} 어학 교사입니다. 주어진 스크립트에서 학습에 유용한 단어를 빠짐없이 추출해주세요.

조건:
- 스크립트에 등장하는 학습 가치가 있는 모든 단어를 추출 (조사, 접속사 등 기능어 제외)
- 고유명사(인명, 지명, 브랜드명)는 제외
- 이미 단어장에 있는 단어는 제외
- 각 단어에 난이도(difficulty)를 반드시 표기: ${difficultyScale}
- 각 단어에 대해 발음(읽기), 한국어 뜻, 원문에서의 예문을 포함
- 결과는 반드시 JSON 배열로 반환

반환 형식:
[{"word": "단어", "reading": "발음", "meaning": "뜻", "example": "예문", "segmentId": 세그먼트ID, "difficulty": "난이도"}]`,
      },
      {
        role: "user",
        content: `다음 ${langName} 스크립트에서 단어를 추출해주세요:\n\n${segmentTexts}${excludeList}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || "{}";
  try {
    const parsed = JSON.parse(content);
    const words = Array.isArray(parsed)
      ? parsed
      : (Object.values(parsed).find((v) => Array.isArray(v)) as ExtractedWord[]) || [];
    return words.map((w: ExtractedWord) => ({
      word: w.word || "",
      reading: w.reading || "",
      meaning: w.meaning || "",
      example: w.example || "",
      segmentId: w.segmentId || segments[0]?.id || 0,
      difficulty: w.difficulty || "",
    }));
  } catch {
    return [];
  }
}
