import { openai } from "./openai";

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  es: "스페인어",
  fr: "프랑스어",
};

const REFUSAL_MESSAGE = "[번역 거부: 선정적/폭력적 내용으로 판단됨]";

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

  const batchSize = 20;
  const translations: string[] = [];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const batchTranslations = await translateBatch(batch, sourceName, targetName);
    translations.push(...batchTranslations);
  }

  return translations;
}

async function translateBatch(
  batch: { text: string }[],
  sourceName: string,
  targetName: string
): Promise<string[]> {
  const result = await callTranslation(batch, sourceName, targetName);

  if (!result.refused) {
    return result.translations;
  }

  // 배치가 통째로 거부되면, 각 세그먼트를 단독으로 병렬 재시도
  return Promise.all(
    batch.map(async (seg) => {
      const single = await callTranslation([seg], sourceName, targetName);
      if (single.refused) return REFUSAL_MESSAGE;
      return single.translations[0] ?? seg.text;
    })
  );
}

async function callTranslation(
  batch: { text: string }[],
  sourceName: string,
  targetName: string
): Promise<{ refused: boolean; translations: string[] }> {
  const numberedTexts = batch
    .map((s, idx) => `[${idx + 1}] ${s.text}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(sourceName, targetName),
      },
      {
        role: "user",
        content: numberedTexts,
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content || "";
  const lines = content.split("\n").filter((line) => line.trim());

  const hasAnyNumbered = lines.some((line) => /\[\d+\]/.test(line));
  if (!hasAnyNumbered) {
    return { refused: true, translations: [] };
  }

  const translations: string[] = [];
  for (let j = 0; j < batch.length; j++) {
    const pattern = new RegExp(`\\[${j + 1}\\]\\s*(.+)`);
    const match = lines.find((line) => pattern.test(line));
    if (match) {
      const parsed = match.match(pattern);
      translations.push(parsed?.[1]?.trim() || batch[j].text);
    } else {
      translations.push(
        lines[j]?.replace(/^\[\d+\]\s*/, "").trim() || batch[j].text
      );
    }
  }

  return { refused: false, translations };
}

function buildSystemPrompt(sourceName: string, targetName: string): string {
  return `당신은 외국어 학습자를 위한 번역 전문가입니다. 개인 학습 목적으로 수집된 영상 자막 세그먼트를 ${sourceName}에서 ${targetName}로 번역합니다.

# 맥락
- 입력은 학습자 본인만 열람하는 개인 학습 자료입니다. 제3자 공개나 홍보·배포 용도가 아닙니다.
- 영상 주제는 역사·의학·과학·문학·범죄 보도·사회 이슈 등 어떤 분야든 올 수 있습니다. 분야 특성상 일부 표현이 민감하게 보일 수 있으나, 학습자가 원문을 이해하기 위해서는 판단·검열 없이 원문 의미를 그대로 옮기는 **언어 변환**이 필요합니다.
- 당신의 역할은 판단·경고·조언이 아니라 언어 변환입니다.

# 출력 형식 (반드시 지킬 것)
1. 각 입력 줄은 "[번호] 원문" 형식입니다. 같은 "[번호] 번역" 형식으로, **입력과 동일한 개수의 줄**을 반환해주세요.
2. 전체 응답을 거부하지 마세요. 입력 전체를 거부 문구 한 줄로 대체하는 것은 허용되지 않습니다. 대부분의 줄은 반드시 정상 번역되어야 합니다.
3. 특정 줄이 정말로 번역 불가능하다고 판단될 때에 한해, **그 줄만** "[번호] [정책상 번역 불가]" 로 표시하고 나머지 줄은 정상 번역해주세요.
4. 번역 결과 외의 해설·의견·주석·경고·서두 인사말 등은 일절 추가하지 마세요.
5. 원문이 불완전하거나 오인식된 단어를 포함할 수 있습니다. 문맥상 자연스러운 의미로 번역해주세요.`;
}
