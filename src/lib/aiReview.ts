// 어드민 심사 슬롯의 "AI 분석" 3줄 요약 (2026-08-22 요청).
//
// 첨부파일(계획서 PDF/HWP/DOCX) 본문은 읽지 않는다 — 이미 구조화된 값(금액·규모·검증
// 배지·첨부 유무·마케팅 동의 여부)만 근거로 삼는다는 게 요청 시 합의된 범위다. 그래서
// "공공성 참여"·"마케팅 활용"도 내용의 진정성이 아니라 자료 유무·동의 여부까지만 판단한다.
//
// ANTHROPIC_API_KEY 가 없으면 조회를 건너뛴다(NICE 연동과 같은 관례 — 외부 서비스가
// 없다고 심사 화면 자체가 막히면 안 된다).

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export function isAiReviewConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface AiReviewFacts {
  /** 신청 총액(VAT 포함) */
  total: number;
  subtotal: number;
  vat: number;
  venueLabel: string;
  expectedAudience: number;
  rentalDays: number;
  /** 검증 배지 7종 — verificationBadges.ts 와 같은 판정을 쓴다 */
  verdict: "AUTO" | "REVIEW";
  badges: { label: string; state: "PASS" | "WARN" | "NONE"; detail: string }[];
  /** 공공/공익 참여 계획서 첨부 건수 (내용은 읽지 않음) */
  publicInterestFileCount: number;
  /** 마케팅 정보 수신 동의 — 이력이 없으면 null */
  marketingConsent: boolean | null;
}

export type AiReviewResult =
  | { status: "OK"; lines: string[] }
  | { status: "UNCONFIGURED" }
  | { status: "ERROR"; message: string };

function buildPrompt(facts: AiReviewFacts): string {
  const badgeLines = facts.badges
    .map((b) => `- ${b.label}: ${b.state === "PASS" ? "통과" : b.state === "WARN" ? "확인 필요" : "해당 없음"} (${b.detail})`)
    .join("\n");

  return `당신은 공연장 대관 신청을 심사하는 운영자를 돕는 보조입니다. 아래는 신청 1건의
구조화된 데이터입니다 — 첨부파일 원문은 제공되지 않으니 내용을 추측하지 마세요.

[규모·금액]
- 공간: ${facts.venueLabel}
- 예상 관객: ${facts.expectedAudience.toLocaleString("ko-KR")}명
- 대관 일수: ${facts.rentalDays}일
- 신청 예상금액(VAT 포함): ${facts.total.toLocaleString("ko-KR")}원 (소계 ${facts.subtotal.toLocaleString("ko-KR")}원 + VAT ${facts.vat.toLocaleString("ko-KR")}원)

[검증 결과] 종합판정: ${facts.verdict === "AUTO" ? "전 항목 통과" : "확인 필요 항목 있음"}
${badgeLines}

[공공/공익 참여]
- 공공/공익 참여 계획서 첨부: ${facts.publicInterestFileCount}건 (내용은 확인 불가 — 첨부 유무만 참고)

[마케팅/서비스 데이터 활용 동의]
- ${facts.marketingConsent === null ? "동의 이력 없음" : facts.marketingConsent ? "동의함" : "미동의"}

위 정보만 근거로, 운영자가 심사 판단에 참고할 3줄 요약을 한국어로 작성하세요.
- 정확히 3줄. 번호·불릿·따옴표 없이 줄바꿈으로만 구분.
- 각 줄은 한 문장, 40자 내외.
- 1번째 줄: 규모·금액 수준에 대한 판단.
- 2번째 줄: 검증 결과(안정성)에 대한 판단 — 확인이 필요한 항목이 있다면 무엇인지.
- 3번째 줄: 공공성 참여·마케팅 동의 등 정책 참고사항.
- 제공되지 않은 정보(첨부 내용 등)는 언급하지 말고, 위 데이터에 없는 사실을 지어내지 마세요.`;
}

export async function generateQuoteAiReview(facts: AiReviewFacts): Promise<AiReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { status: "UNCONFIGURED" };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_REVIEW_MODEL || DEFAULT_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: buildPrompt(facts) }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return { status: "ERROR", message: `AI 분석 응답 오류 (HTTP ${response.status})` };
    }

    const json = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = json.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();
    if (!text) return { status: "ERROR", message: "AI 분석 응답이 비어 있습니다." };

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (lines.length === 0) return { status: "ERROR", message: "AI 분석 응답을 해석하지 못했습니다." };

    return { status: "OK", lines };
  } catch (error) {
    return {
      status: "ERROR",
      message: `AI 분석 중 오류가 발생했습니다. (${error instanceof Error ? error.message : "알 수 없음"})`,
    };
  }
}
