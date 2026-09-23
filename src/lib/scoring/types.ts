// [신규 2026-08-25] 대관 심사 채점 — 「서울아레나 대관 심의 평가 세부 기준」 Ver. 26-09-13을
// 물린 자동 산정 엔진의 결과 타입. 참고: `대관시스템_기능정의서.md` 13장(대관 심사 인텔리전스).
//
// 13-3 "시스템은 100점 초안을 내되 확정하지 않는다" 원칙에 따라, 이 값들은 어디까지나
// 관리자 심사 화면에 참고용으로 보여주는 초안이다. 기존 Review(승인/보류/거절 + 점수 +
// 사유)의 실제 판정·저장 로직은 건드리지 않는다 — 이 결과는 어떤 API에도 쓰이지 않고
// 화면에 표시만 된다.
//
// confidence:
//   AUTO        — 정형 필드로 규칙 그대로 산정(글래스박스 근거 확실)
//   PROVISIONAL — 규칙은 정량이지만 필드가 부족해 근사치로 산정(잠정치, 위원 확인 필요)
//   EXCLUDED    — 법무·정책 미확정으로 심사 화면에 노출하지 않기로 한 항목(13-16/13-71)
//   UNAVAILABLE — 신청서에 입력 통로 자체가 없어 산정 불가
export type ScoreConfidence = "AUTO" | "PROVISIONAL" | "EXCLUDED" | "UNAVAILABLE";

/**
 * [신규 2026-09-23] 심사 화면 재설계 — "왜 이 점수가 나왔는지" 를 rule 원문(사람이
 * 읽는 문장)과 별개로 화면이 직접 그릴 수 있는 형태로도 들고 있는다. 단일 구간표로
 * 표현되는 항목(대부분의 배점표 줄)에만 채운다 — 여러 값을 합산하는 항목(M-REV-01
 * 등)은 사다리 하나로 못 그리므로 비워 두고 rule·evidence 문장만 보여준다.
 *
 * `score`는 배점표의 해당 구간 점수 그대로다 — ScoreItem.score 와 값이 같은 구간이
 * "적중"으로 강조된다(별도 hit 플래그를 안 둔다 — 값이 둘로 갈리면 나중에 어긋난다).
 */
export interface ScoreBand {
  label: string;
  score: number;
}

export interface ScoreItem {
  code: string; // "A-REV-01" 등 — 13-C-1 코드 그대로
  label: string;
  maxScore: number;
  score: number | null; // null = EXCLUDED 또는 UNAVAILABLE(집계에서 제외)
  confidence: ScoreConfidence;
  rule: string; // 배점 기준 원문 요약(글래스박스 — 13-4)
  evidence?: string; // 이번 신청서의 어느 값이 이 점수를 만들었는지
  note?: string; // 캐비어트 · 확정 필요 사항
  bands?: ScoreBand[]; // 화면에 "기준 사다리"로 그릴 구간표(있는 항목만)
}

type ScoreCategoryKey = "REVENUE" | "PUBLIC" | "MARKETING" | "SAFETY";

export interface ScoreCategory {
  key: ScoreCategoryKey;
  label: string;
  nominalMax: number; // 배점표상 만점(제외 항목 포함, 예: 마케팅 20)
  items: ScoreItem[];
}

export interface BonusItem {
  code: string;
  label: string;
  maxScore: number;
  score: number | null;
  confidence: ScoreConfidence;
  note?: string;
  bands?: ScoreBand[]; // ScoreItem.bands 와 같은 용도
}

export interface DisqualifierCheck {
  code: string; // "DQ-01" 등
  label: string;
  auto: boolean; // 시스템이 자동 판정 가능한 사유인가
  triggered: boolean | null; // auto=false면 항상 null(위원 판단 필요)
}

/**
 * [신규 2026-09-18] 감점 항목(배점표 3) — "심사표와 심사 평가 항목이 매칭이 안 된다"(niki).
 *
 * 배점표에는 감점이 다섯 줄(계약 해지 −5 · 승인 후 취소 −3 · 정산 분쟁 −5 · 정책 위반 −3 ·
 * 중대 안전사고 −10)로 명시돼 있는데, 화면에는 그 줄이 하나도 없고 하단에 "이력 조회
 * 기능이 없어 0으로 취급한다"는 문구만 있었다 — 위원이 심사표를 들고 화면을 봐도 감점을
 * 적용할 자리가 없었다.
 *
 * 자동 판정은 여전히 불가하다(신청사 이력 조회 테이블이 없다). 그래도 **배점표와 같은
 * 줄을 같은 순서로 보여주고 「위원 판단」으로 표시**해야 1:1로 읽힌다 — 부적격 게이트
 * (DisqualifierCheck)가 이미 쓰는 방식과 같다.
 */
export interface PenaltyItem {
  code: string; // "A-PEN-01" 등
  label: string;
  /** 배점표상 감점 폭(음수, 예: -5) */
  penalty: number;
  /** 시스템이 자동 판정 가능한가 — 지금은 전부 false(이력 조회 미구현) */
  auto: boolean;
  /** auto=false면 항상 null(위원 판단 필요) */
  triggered: boolean | null;
  note?: string;
}

export interface VenueScoreResult {
  venueId: "arena" | "medium-hall";
  venueLabel: string;
  categories: ScoreCategory[];
  bonuses: BonusItem[];
  /** 배점표 3) 감점 항목 — 자동 판정은 못 하지만 심사표와 같은 줄을 같은 순서로 보여준다 */
  penalties: PenaltyItem[];
  disqualifiers: DisqualifierCheck[];
  computedSubtotal: number; // 산정된(EXCLUDED/UNAVAILABLE 제외) 항목 점수 합
  unresolvedMax: number; // EXCLUDED/UNAVAILABLE 항목의 배점 합 — "아직 안 정해진 점수"
  bonusTotal: number;
  penaltyTotal: number; // 이력 조회 기능 미구현 — 항상 0(감점 항목은 penalties 로 노출만 한다)
  provisionalFinal: number; // computedSubtotal + bonusTotal - penaltyTotal
  provisionalEligible: boolean; // provisionalFinal >= 60 (참고용 — unresolvedMax > 0이면 확정 판정 아님)
}

export interface QuoteScoreBreakdown {
  rubricVersion: string;
  results: VenueScoreResult[]; // SIMULTANEOUS면 2건(아레나·중형 독립 심사, 13-C-5 (가)안), 아니면 1건
}
