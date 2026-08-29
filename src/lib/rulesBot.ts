import Anthropic from "@anthropic-ai/sdk";
import { getRulesContent } from "./db";
import { parseRules } from "./content/pageContent";

/*
  대관 규약 문답 봇 (2026-08-29).

  대관 규약은 40개 조가 넘고 위약금·해지·안전·정산이 서로 다른 장에 흩어져 있어,
  "취소하면 얼마 물어야 하나" 같은 질문에 답하려면 여러 조를 함께 읽어야 한다.
  전문을 다 읽게 하는 대신 물어보게 한다.

  규칙 두 가지가 이 기능의 전부다:

  1) 규약 본문 밖에서 답하지 않는다. 대관료·위약금은 돈이 걸린 문제라, 그럴듯하게
     지어낸 한 문장이 분쟁이 된다. 근거 조문을 함께 내보내 사용자가 원문을 확인할
     수 있게 하고, 규약에 없으면 "없다"고 말한다.
  2) 원본은 DB 다. 화면(/rules)이 getRulesContent() 로 읽는 것과 같은 본문을 쓴다 —
     운영자가 규약을 고쳤는데 봇만 옛 판본으로 답하면 안 된다.

  ANTHROPIC_API_KEY 가 없으면 기능을 끈다(NICE·알림톡과 같은 관례 — 외부 서비스가
  없다고 화면이 막히면 안 된다).
*/

// 규약 본문이 통째로 매 요청 앞에 붙는다. 캐시를 켜 두면 같은 프리픽스라 두 번째
// 질문부터 입력 비용이 크게 떨어진다. 그래서 본문은 시스템 프롬프트 맨 앞에 두고
// 질문(매번 다름)은 뒤에 둔다 — 순서가 뒤집히면 캐시가 매번 깨진다.
const MODEL = "claude-opus-5";
const MAX_TOKENS = 2000;

export function isRulesBotConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface RulesBotTurn {
  role: "user" | "assistant";
  content: string;
}

export type RulesBotResult =
  | { status: "OK"; answer: string }
  | { status: "UNCONFIGURED" }
  | { status: "ERROR"; message: string };

/** 규약 본문을 조문 단위로 평문화한다. 장·조 제목을 남겨야 모델이 근거를 인용할 수 있다. */
export async function buildRulesText(): Promise<{ text: string; version: string; effectiveDate: string }> {
  const content = await getRulesContent();
  const chapters = parseRules(content.body);
  const text = chapters
    .map((chapter) => {
      const articles = chapter.articles
        .map((article) => `${article.title}\n${article.paragraphs.join("\n")}`)
        .join("\n\n");
      return `[${chapter.title}]\n${articles}`;
    })
    .join("\n\n");
  return { text, version: content.version, effectiveDate: content.effectiveDate };
}

export function systemPrompt(rules: { text: string; version: string; effectiveDate: string }) {
  // 캐시 프리픽스는 이 배열의 첫 블록이다 — 규약 본문은 바뀌기 전까지 바이트가 같다.
  return [
    {
      type: "text" as const,
      text: `아래는 서울아레나 대관 규약 전문이다 (${rules.version}, 시행일 ${rules.effectiveDate}).

${rules.text}`,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: `너는 위 대관 규약만 근거로 답하는 안내 도우미다. 대관을 검토하는 기획사 담당자가 질문한다.

지켜야 할 것:
- 위 규약 본문에 있는 내용만으로 답한다. 일반 상식이나 다른 공연장 관행을 끌어오지 않는다.
- 답의 근거가 된 조문을 반드시 밝힌다. 예: "제 27조 (계약의 해지)에 따르면 …".
- 규약에 없는 내용을 물으면 "규약에는 그 내용이 없습니다" 라고 말하고, 운영사 담당자에게
  문의하라고 안내한다. 추측해서 답하지 않는다.
- 금액·기한·비율은 규약에 적힌 숫자를 그대로 쓴다. 계산이 필요하면 근거 숫자와 계산 과정을
  함께 보여 준다.
- 여러 조가 걸리는 질문(예: 취소 위약금)은 관련 조문을 모두 찾아 단계별로 정리한다.
- 한국어로, 담당자가 바로 쓸 수 있게 간결하게 답한다. 서론 없이 본론부터 쓴다.
- 이 답변은 안내이지 법률 자문이나 계약 확답이 아니다. 해석이 갈릴 수 있는 대목에서는
  그 사실을 한 줄로 밝히고 운영사 확인을 권한다.`,
    },
  ];
}

export async function answerRulesQuestion(
  question: string,
  history: RulesBotTurn[] = [],
): Promise<RulesBotResult> {
  if (!isRulesBotConfigured()) return { status: "UNCONFIGURED" };
  const trimmed = question.trim();
  if (!trimmed) return { status: "ERROR", message: "질문을 입력해 주세요." };

  try {
    const rules = await buildRulesText();
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // 여러 조문을 엮어야 하는 질문이 흔해 사고를 켠다. 다만 공개 화면에서 반복 호출되므로
      // effort 는 medium 으로 둔다 — 규약 인용은 high 까지 필요하지 않았다.
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: systemPrompt(rules),
      messages: [
        ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user" as const, content: trimmed },
      ],
    });

    // 안전 거절은 200 으로 돌아온다 — content 를 읽기 전에 확인한다.
    if (response.stop_reason === "refusal") {
      return { status: "ERROR", message: "답변할 수 없는 질문입니다. 운영사 담당자에게 문의해 주세요." };
    }

    const answer = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!answer) return { status: "ERROR", message: "답변을 생성하지 못했습니다. 다시 시도해 주세요." };
    return { status: "OK", answer };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { status: "ERROR", message: "요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[rulesBot] API 오류", error.status, error.message);
      return { status: "ERROR", message: "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
    console.error("[rulesBot] 오류", error);
    return { status: "ERROR", message: "답변을 가져오지 못했습니다." };
  }
}
