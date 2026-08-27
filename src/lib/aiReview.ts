// 어드민 심사 슬롯의 "AI 분석" 요약 (2026-08-22 요청, 2026-08-22 심사 기준 문서 비교 확장).
//
// 기본 3줄 요약은 구조화된 값(금액·규모·검증 배지·첨부 유무·마케팅 동의 여부)만 근거로
// 삼는다 — 첨부파일(계획서 PDF/HWP/DOCX) 본문은 읽지 않는다는 게 처음 요청 시 합의된
// 범위다. 다만 운영자가 "심사 기준" 문서(신청서 전체에 공통 적용되는 정책 문서, 신청서
// 마다 올리는 게 아니다)를 별도로 등록해두면, 그 문서 내용까지 실제로 읽어 신청 정보와
// 비교한 제안을 추가로 준다 — 이건 사용자가 비용·지연 트레이드오프를 알고 명시적으로
// 요청한 범위 확장이다. PDF는 Claude API의 문서 입력(base64)으로 그대로 보내고, DOCX는
// mammoth로 텍스트만 추출해 보낸다. HWP는 파서가 없어 업로드 단계에서 막는다.
//
// ANTHROPIC_API_KEY 가 없으면 조회를 건너뛴다(NICE 연동과 같은 관례 — 외부 서비스가
// 없다고 심사 화면 자체가 막히면 안 된다).

import fs from "node:fs/promises";
import mammoth from "mammoth";
import type { CompetingCandidateFacts } from "./scoring/competingCandidate";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
// DOCX 본문을 통째로 넣으면 토큰이 과도해질 수 있어 앞부분만 잘라 보낸다.
const MAX_DOCX_CHARS = 40_000;

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

export interface ReviewCriteriaFile {
  fileName: string;
  /** "application/pdf" | DOCX mime */
  mimeType: string;
  filePath: string;
}

export type AiReviewResult =
  | { status: "OK"; lines: string[] }
  | { status: "UNCONFIGURED" }
  | { status: "ERROR"; message: string };

function buildFactsSection(facts: AiReviewFacts): string {
  const badgeLines = facts.badges
    .map((b) => `- ${b.label}: ${b.state === "PASS" ? "통과" : b.state === "WARN" ? "확인 필요" : "해당 없음"} (${b.detail})`)
    .join("\n");

  return `[규모·금액]
- 공간: ${facts.venueLabel}
- 예상 관객: ${facts.expectedAudience.toLocaleString("ko-KR")}명
- 대관 일수: ${facts.rentalDays}일
- 신청 예상금액(VAT 포함): ${facts.total.toLocaleString("ko-KR")}원 (소계 ${facts.subtotal.toLocaleString("ko-KR")}원 + VAT ${facts.vat.toLocaleString("ko-KR")}원)

[검증 결과] 종합판정: ${facts.verdict === "AUTO" ? "전 항목 통과" : "확인 필요 항목 있음"}
${badgeLines}

[공공/공익 참여]
- 공공/공익 참여 계획서 첨부: ${facts.publicInterestFileCount}건 (내용은 확인 불가 — 첨부 유무만 참고)

[마케팅/서비스 데이터 활용 동의]
- ${facts.marketingConsent === null ? "동의 이력 없음" : facts.marketingConsent ? "동의함" : "미동의"}`;
}

function buildInstructions(hasCriteria: boolean): string {
  if (!hasCriteria) {
    return `위 정보만 근거로, 운영자가 심사 판단에 참고할 3줄 요약을 한국어로 작성하세요.
- 정확히 3줄. 번호·불릿·따옴표 없이 줄바꿈으로만 구분.
- 각 줄은 한 문장, 40자 내외.
- 1번째 줄: 규모·금액 수준에 대한 판단.
- 2번째 줄: 검증 결과(안정성)에 대한 판단 — 확인이 필요한 항목이 있다면 무엇인지.
- 3번째 줄: 공공성 참여·마케팅 동의 등 정책 참고사항.
- 제공되지 않은 정보(첨부 내용 등)는 언급하지 말고, 위 데이터에 없는 사실을 지어내지 마세요.`;
  }
  return `위 신청 정보와 함께 전달된 "심사 기준" 문서를 근거로, 운영자가 심사 판단에 참고할
5줄 요약을 한국어로 작성하세요.
- 정확히 5줄. 번호·불릿·따옴표 없이 줄바꿈으로만 구분.
- 각 줄은 한 문장, 40자 내외.
- 1번째 줄: 규모·금액 수준에 대한 판단.
- 2번째 줄: 검증 결과(안정성)에 대한 판단 — 확인이 필요한 항목이 있다면 무엇인지.
- 3번째 줄: 공공성 참여·마케팅 동의 등 정책 참고사항.
- 4번째 줄: 이 신청 건이 심사 기준 문서의 어느 항목을 충족/미충족하는지.
- 5번째 줄: 심사 기준 대비 종합 제안(승인 권장/확인 필요/부적합 등 방향성).
- 신청 정보에 없는 사실은 지어내지 말고, 심사 기준 문서에 없는 기준을 만들어내지 마세요.`;
}

async function buildCriteriaBlock(
  criteria: ReviewCriteriaFile,
): Promise<{ type: "document"; source: { type: "base64"; media_type: string; data: string } } | { type: "text"; text: string }> {
  const bytes = await fs.readFile(criteria.filePath);
  if (criteria.mimeType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } };
  }
  const { value: text } = await mammoth.extractRawText({ buffer: bytes });
  const truncated = text.length > MAX_DOCX_CHARS;
  return {
    type: "text",
    text: `[심사 기준 문서: ${criteria.fileName}]\n${text.slice(0, MAX_DOCX_CHARS)}${truncated ? "\n(이하 생략)" : ""}`,
  };
}

// [신규 2026-08-26] "동일 기간 내 다른 대관사 비교" 슬롯의 AI 추천. 단일 신청서 요약과
// 같은 원칙 — 구조화된 값(자동 채점 초안 점수, 신청 규모·금액, 상태)만 근거로 삼고
// 첨부파일 원문은 읽지 않는다. 자동 채점 자체가 이미 여러 "확인 필요"·"잠정치" 캐비어트를
// 달고 있으므로(scoreQuote.ts), 프롬프트에도 그 한계를 그대로 전달해 AI가 확정적으로
// 단정하지 않게 한다. CompetingCandidateFacts 자체는 lib/scoring/competingCandidate.ts가
// 정본이다 — 표 렌더링과 이 프롬프트가 같은 모양의 데이터를 공유한다.
export type { CompetingCandidateFacts };

function buildCompetingFactsSection(candidates: CompetingCandidateFacts[]): string {
  return candidates
    .map((c, i) => {
      const lines = [
        `${i + 1}. ${c.companyName ?? "회사명 미상"} (${c.quoteId}${c.isCurrent ? " — 지금 보고 있는 신청서" : ""})`,
        `   - 공간: ${c.venueLabel} / 상태: ${c.statusLabel}`,
        `   - 자동 채점 초안 잠정 합계: ${c.provisionalScore}점 (미산정 ${c.unresolvedMax}점 별도, 잠정 ${c.eligible ? "적격" : "미달"})`,
        `   - 예상 관객 ${c.expectedAudience.toLocaleString("ko-KR")}명 · 예상금액(VAT포함) ${c.total.toLocaleString("ko-KR")}원`,
      ];
      return lines.join("\n");
    })
    .join("\n");
}

export async function generateCompetingRecommendation(
  candidates: CompetingCandidateFacts[],
): Promise<AiReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { status: "UNCONFIGURED" };
  if (candidates.length < 2) {
    return { status: "ERROR", message: "비교할 다른 신청서가 없습니다." };
  }

  try {
    const prompt = `당신은 공연장 대관 신청을 심사하는 운영자를 돕는 보조입니다. 아래는 같은
기간(주차)에 겹치는 신청서 ${candidates.length}건의 구조화된 데이터입니다 — 자동 채점은
「대관 심의 평가 세부 기준」 항목 중 정형 필드로 산정 가능한 부분의 잠정 초안이며,
일부 항목은 아직 산정되지 않았거나(미산정) 필드 부족으로 잠정치입니다. 첨부파일 원문은
제공되지 않으니 내용을 추측하지 마세요.

${buildCompetingFactsSection(candidates)}

위 정보만 근거로, 운영자가 경합 판단에 참고할 요약을 한국어로 작성하세요.
- 정확히 4줄. 번호·불릿·따옴표 없이 줄바꿈으로만 구분.
- 각 줄은 한 문장, 50자 내외.
- 1번째 줄: 잠정 점수·적격 여부 기준으로 가장 우위인 신청서(회사명)와 그 이유.
- 2번째 줄: 미산정 배점이 커서 순위가 바뀔 수 있는 신청서가 있다면 그 리스크.
- 3번째 줄: 점수 외에 운영자가 추가로 확인해야 할 점(정성 항목·부적격 게이트 등).
- 4번째 줄: 최종 판단은 심의위원의 몫이라는 점을 짧게 명시.
- 제공되지 않은 정보는 언급하지 말고, 위 데이터에 없는 사실을 지어내지 마세요.`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_REVIEW_MODEL || DEFAULT_MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return { status: "ERROR", message: `AI 추천 응답 오류 (HTTP ${response.status})` };
    }

    const json = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = json.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();
    if (!text) return { status: "ERROR", message: "AI 추천 응답이 비어 있습니다." };

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (lines.length === 0) return { status: "ERROR", message: "AI 추천 응답을 해석하지 못했습니다." };

    return { status: "OK", lines };
  } catch (error) {
    return {
      status: "ERROR",
      message: `AI 추천 중 오류가 발생했습니다. (${error instanceof Error ? error.message : "알 수 없음"})`,
    };
  }
}

export async function generateQuoteAiReview(
  facts: AiReviewFacts,
  criteria?: ReviewCriteriaFile | null,
): Promise<AiReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { status: "UNCONFIGURED" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Anthropic 문서/텍스트 혼합 콘텐츠 블록
    const content: any[] = [];
    if (criteria) content.push(await buildCriteriaBlock(criteria));
    content.push({
      type: "text",
      text: `당신은 공연장 대관 신청을 심사하는 운영자를 돕는 보조입니다. 아래는 신청 1건의
구조화된 데이터입니다${criteria ? " — 위에 첨부된 심사 기준 문서와 비교해 판단하세요." : " — 첨부파일 원문은 제공되지 않으니 내용을 추측하지 마세요."}

${buildFactsSection(facts)}

${buildInstructions(!!criteria)}`,
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_REVIEW_MODEL || DEFAULT_MODEL,
        max_tokens: criteria ? 500 : 300,
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(criteria ? 45_000 : 20_000),
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
      .slice(0, criteria ? 5 : 3);
    if (lines.length === 0) return { status: "ERROR", message: "AI 분석 응답을 해석하지 못했습니다." };

    return { status: "OK", lines };
  } catch (error) {
    return {
      status: "ERROR",
      message: `AI 분석 중 오류가 발생했습니다. (${error instanceof Error ? error.message : "알 수 없음"})`,
    };
  }
}
