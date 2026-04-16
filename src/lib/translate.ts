import { openai } from "./openai";

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  es: "스페인어",
  fr: "프랑스어",
};

export async function translateSegments(
  segments: { text: string }[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  if (sourceLanguage === targetLanguage) {
    return segments.map((s) => s.text);
  }

  const sourceName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  // Batch segments to reduce API calls (up to 20 segments per batch)
  const batchSize = 20;
  const translations: string[] = [];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const numberedTexts = batch
      .map((s, idx) => `[${idx + 1}] ${s.text}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 전문 번역가입니다. ${sourceName}를 ${targetName}로 자연스럽게 번역해주세요.
각 줄은 [번호] 형식으로 시작합니다. 같은 형식으로 번역 결과를 반환해주세요.
번호와 형식을 그대로 유지하고, 텍스트만 번역해주세요.`,
        },
        {
          role: "user",
          content: numberedTexts,
        },
      ],
      temperature: 0.3,
    });

    const result = response.choices[0].message.content || "";
    const lines = result.split("\n").filter((line) => line.trim());

    // Parse numbered translations
    for (let j = 0; j < batch.length; j++) {
      const pattern = new RegExp(`\\[${j + 1}\\]\\s*(.+)`);
      const match = lines.find((line) => pattern.test(line));
      if (match) {
        const parsed = match.match(pattern);
        translations.push(parsed?.[1]?.trim() || batch[j].text);
      } else {
        translations.push(lines[j]?.replace(/^\[\d+\]\s*/, "").trim() || batch[j].text);
      }
    }
  }

  return translations;
}
