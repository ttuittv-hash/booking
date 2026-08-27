// [신규 2026-08-25] 대관 심사 채점 — 「서울아레나 대관 심의 평가 세부 기준」 Ver. 26-08-22를
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

export interface ScoreItem {
  code: string; // "A-REV-01" 등 — 13-C-1 코드 그대로
  label: string;
  maxScore: number;
  score: number | null; // null = EXCLUDED 또는 UNAVAILABLE(집계에서 제외)
  confidence: ScoreConfidence;
  rule: string; // 배점 기준 원문 요약(글래스박스 — 13-4)
  evidence?: string; // 이번 신청서의 어느 값이 이 점수를 만들었는지
  note?: string; // 캐비어트 · 확정 필요 사항
}

export type ScoreCategoryKey = "REVENUE" | "PUBLIC" | "MARKETING" | "SAFETY";

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
}

export interface DisqualifierCheck {
  code: string; // "DQ-01" 등
  label: string;
  auto: boolean; // 시스템이 자동 판정 가능한 사유인가
  triggered: boolean | null; // auto=false면 항상 null(위원 판단 필요)
}

export interface VenueScoreResult {
  venueId: "arena" | "medium-hall";
  venueLabel: string;
  categories: ScoreCategory[];
  bonuses: BonusItem[];
  disqualifiers: DisqualifierCheck[];
  computedSubtotal: number; // 산정된(EXCLUDED/UNAVAILABLE 제외) 항목 점수 합
  unresolvedMax: number; // EXCLUDED/UNAVAILABLE 항목의 배점 합 — "아직 안 정해진 점수"
  bonusTotal: number;
  penaltyTotal: number; // 이력 조회 기능 미구현 — 항상 0
  provisionalFinal: number; // computedSubtotal + bonusTotal - penaltyTotal
  provisionalEligible: boolean; // provisionalFinal >= 60 (참고용 — unresolvedMax > 0이면 확정 판정 아님)
}

export interface QuoteScoreBreakdown {
  rubricVersion: string;
  results: VenueScoreResult[]; // SIMULTANEOUS면 2건(아레나·중형 독립 심사, 13-C-5 (가)안), 아니면 1건
}
