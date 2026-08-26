// [신규 2026-08-25] 대관 심사 채점 엔진 — 「서울아레나 대관 심의 평가 세부 기준」
// Ver. 26-08-22(부록 F)를 신청 위저드의 실제 필드에 물린 자동 산정 로직.
// 상세 규칙은 `대관시스템_기능정의서.md` 13-C-4를 그대로 옮긴 것이다.
//
// 이 파일은 "13-3 시스템은 100점 초안을 내되 확정하지 않는다" 원칙에 따라
// 순수 계산 함수만 제공한다 — DB에 쓰지 않고, 기존 Review(승인/보류/거절) 흐름에도
// 관여하지 않는다. 관리자 화면에 참고용 초안으로만 보여준다(ScoringPanel.tsx).
//
// 구현하지 않은 것(의도적 축소 — 아래는 각 항목 note에도 캐비어트로 남김):
//   · 배점표 DB 버전관리(ScoringRubric 엔티티) — 지금은 이 파일의 상수가 정본
//   · 경합 시 순위 기반 A-REV-02 산정 — 항상 패키지 등급/공연일수 기준 잠정치
//   · 이력 기반 감점(A-PEN-01~05) — 이력 조회 테이블 없음, 항상 0
//   · 가점 A-BON-03(경합 추가 대관료) — 신청서에 입력란 없음
//   · A-SAF-03 계약 증빙 첨부 — 신청서에 항목 없음, 계약 상태만으로 판정
//   · 동점 tie-break 자동 판정, 위원별 봉인 채점, 시뮬레이션 — 전부 별도 단계(S1 이후)
import type { MarketingCooperation, PerformanceInfo, PublicInterestItem, QuoteSelection, SafetyPledge } from "@/lib/pricing/types";
import type {
  BonusItem,
  DisqualifierCheck,
  QuoteScoreBreakdown,
  ScoreCategory,
  ScoreConfidence,
  ScoreItem,
  VenueScoreResult,
} from "./types";

export const SCORING_RUBRIC_VERSION = "26-08-22";

const VENUE_LABEL: Record<"arena" | "medium-hall", string> = {
  arena: "아레나",
  "medium-hall": "중형공연장",
};

// A-PUB-01 체크리스트 5항목 매핑(13-C-4) — 암표·부정거래 방지와 소비자 보호는
// 평가표에서 같은 항목(⑤)으로 병합되므로 반드시 distinct 카운트한다.
const PUBLIC_CHECKLIST_MAP: Partial<Record<PublicInterestItem, 1 | 2 | 3 | 4 | 5>> = {
  DISCOUNT_ACCESS: 1,
  ACCESSIBILITY_SUPPORT: 2,
  VENUE_LINKED_PROGRAM: 3,
  COMPLAINT_REDUCTION_PLEDGE: 4,
  ANTI_SCALPING: 5,
  CONSUMER_PROTECTION: 5,
};

function bandScore(n: number, bands: { min: number; score: number }[], fallback: number): number {
  for (const b of bands) {
    if (n >= b.min) return b.score;
  }
  return fallback;
}

// 자유서술 필드에 수치·금액·일자 중 하나라도 들어있는지 — 숫자 하나로 셋을 근사한다
// (A-MKT-01 "concrete()" 판정, 13-C-4).
function hasConcreteContent(text: string): boolean {
  return text.trim().length > 0 && /\d/.test(text);
}

function parseAudienceNumber(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  return Number(digits);
}

function scoreRevenue(venueId: "arena" | "medium-hall", selection: QuoteSelection): ScoreCategory {
  const items: ScoreItem[] = [];

  if (venueId === "arena") {
    const n = selection.expectedAudience;
    const score = bandScore(
      n,
      [
        { min: 20000, score: 20 },
        { min: 15000, score: 15 },
        { min: 12000, score: 10 },
        { min: 10000, score: 5 },
      ],
      3,
    );
    items.push({
      code: "A-REV-01",
      label: "예상 관객 규모",
      maxScore: 20,
      score,
      confidence: "AUTO",
      rule: "2만↑ 20 · 1.5만↑ 15 · 1.2만↑ 10 · 1만↑ 5 · 1만 미만 3",
      evidence: `1회당 예상 관객 수 ${n.toLocaleString()}명`,
    });

    const pkg = selection.packageId;
    const pkgScore = pkg === 4 ? 20 : pkg === 3 ? 15 : pkg === 2 ? 10 : pkg === 1 ? 5 : null;
    items.push({
      code: "A-REV-02",
      label: "대관 수익성",
      maxScore: 20,
      score: pkgScore,
      confidence: pkgScore === null ? "UNAVAILABLE" : "PROVISIONAL",
      rule: "경합 시 순위(1위 20·2위 15·3위 10·4위↓ 5) / 비경합 시 패키지4=20·3=15·2=10·1=5",
      evidence: pkg ? `선택 패키지 ${pkg}` : "패키지 미확정(Custom 등)",
      note: "경합 시 순위 기반 산정은 구현되지 않아 항상 패키지 등급 기준 잠정치입니다. 같은 주차 경합 여부는 관리자가 별도로 확인하세요.",
    });
  } else {
    const n = selection.secondaryAudience;
    const audienceScore = bandScore(
      n,
      [
        { min: 3000, score: 16 },
        { min: 2500, score: 12 },
        { min: 2000, score: 8 },
        { min: 1500, score: 4 },
      ],
      0,
    );
    const perfDays = Object.values(selection.midHallDays).filter((d) => d.role === "PERFORMANCE");
    const totalShows = perfDays.reduce((sum, d) => sum + d.shows, 0);
    const showBonus = totalShows >= 6 ? 4 : totalShows >= 4 ? 3 : totalShows === 3 ? 2 : totalShows === 2 ? 1 : 0;
    items.push({
      code: "M-REV-01",
      label: "예상 관객 규모(회차 가중 포함)",
      maxScore: 20,
      score: Math.min(20, audienceScore + showBonus),
      confidence: "AUTO",
      rule: "3천↑ 16·2.5천↑ 12·2천↑ 8·1.5천↑ 4 + 회차 가중(2회 +1·3회 +2·4~5회 +3·6회 +4)",
      evidence: `1회당 예상 관객 수 ${n.toLocaleString()}명 · 총 ${totalShows}회차`,
    });

    const perfDayCount = perfDays.length;
    const dayScore = perfDayCount >= 4 ? 20 : perfDayCount === 3 ? 15 : perfDayCount === 2 ? 10 : null;
    items.push({
      code: "M-REV-02",
      label: "대관 수익성",
      maxScore: 20,
      score: dayScore,
      confidence: dayScore === null ? "UNAVAILABLE" : "PROVISIONAL",
      rule: "비경합 시 공연 일수 기준 — 4일 20·3일 15·2일 10 (1일 이하는 평가표에 규정 없음)",
      evidence: `공연일 ${perfDayCount}일`,
      note:
        perfDayCount <= 1
          ? "평가표 원문에 1일 이하 구간 배점이 없습니다(13-C-4 ⚠). 위원 확인 필요."
          : "경합 시 순위 기반 산정은 구현되지 않아 항상 공연 일수 기준 잠정치입니다.",
    });
  }

  return { key: "REVENUE", label: "수익성·흥행성", nominalMax: 40, items };
}

function scorePublic(info: PerformanceInfo): ScoreCategory {
  const items: ScoreItem[] = [];
  const selected = info.publicInterestItems ?? [];
  const distinctMapped = new Set<number>();
  for (const item of selected) {
    const mapped = PUBLIC_CHECKLIST_MAP[item];
    if (mapped) distinctMapped.add(mapped);
  }
  const n = distinctMapped.size;
  const pubScore = n === 5 ? 15 : n === 4 ? 12 : n === 3 ? 9 : n === 2 ? 6 : n === 1 ? 3 : 0;
  items.push({
    code: "A-PUB-01",
    label: "공공성·공익성 이행 계획",
    maxScore: 15,
    score: pubScore,
    confidence: "AUTO",
    rule: "체크리스트 5개(할인·접근성·연계사업·민원저감·소비자보호[암표방지 병합]) 중 충족 개수 — 5개 15·4개 12·3개 9·2개 6·1개 3·0개 0",
    evidence: `체크리스트 충족 ${n}/5개`,
    note: "'검토 중'으로 표시한 항목도 체크 자체는 충족으로 셉니다(13-N #39-c 임시 규칙). 위원 확인 시 반영 여부 조정하세요.",
  });

  const hasAgencyEvent = selected.includes("PUBLIC_AGENCY_LINKED_EVENT");
  items.push({
    code: "A-PUB-02",
    label: "공공 부문 연계 행사",
    maxScore: 5,
    score: hasAgencyEvent ? 5 : 0,
    confidence: "PROVISIONAL",
    rule: "공적 주체 주최·주관·공식위탁 + 증빙 서류 → 5 / 없음 0",
    evidence: hasAgencyEvent ? "'공공기관·지자체 연계 행사' 체크됨" : "체크 안 됨",
    note: "기관명·관계(주최/주관/공식위탁 vs 후원)·증빙 첨부를 구분하는 필드가 없습니다 — 체크 여부만으로 잠정 산정, 위원이 증빙을 직접 확인해야 합니다.",
  });

  return { key: "PUBLIC", label: "공공성·공익성", nominalMax: 20, items };
}

function scoreMarketing(mkt: MarketingCooperation | undefined): ScoreCategory {
  const items: ScoreItem[] = [];
  const plan = mkt?.executionPlan;
  const concreteCount = plan
    ? [plan.targetDefinition, plan.mediaMix, plan.budget, plan.timeline].filter(hasConcreteContent).length
    : 0;
  const mktScore = concreteCount === 4 ? 5 : concreteCount === 3 ? 3 : concreteCount === 2 ? 1 : 0;
  items.push({
    code: "A-MKT-01",
    label: "마케팅 실행 계획",
    maxScore: 5,
    score: mktScore,
    confidence: "PROVISIONAL",
    rule: "타겟정의·매체믹스·집행예산·타임라인 4요소 중 수치·금액·일자 포함 개수 — 4개 5·3개 3·2개 1·그외 0",
    evidence: `구체적 서술 ${concreteCount}/4요소`,
    note: "자유 서술 텍스트에 숫자가 포함되어 있는지로만 '구체성'을 근사합니다 — 실제 내용 타당성은 위원이 읽고 판단해야 합니다.",
  });

  // 13-16/13-17 — 협조 동의 항목은 대관계약 별지 동의서 「심사 중립성」 조항과
  // 충돌 소지가 있어 법무 확정 전까지 (가)안(심사 화면 제외)을 기본값으로 적용한다.
  items.push({
    code: "A-MKT-02",
    label: "공동 프로모션 협조",
    maxScore: 5,
    score: null,
    confidence: "EXCLUDED",
    rule: "동의 5 / 비동의 0",
    note: "대관계약 별지 동의서의 「심사 중립성」 조항과 충돌 소지가 있어 법무 확정 전까지 심사 화면에서 제외합니다(기능정의서 13-16/13-71, 오픈 전 필수 결정사항 #38).",
  });

  const sponsorConsent = mkt?.coSponsorshipConsent === true;
  items.push({
    code: "A-MKT-03",
    label: "공동 스폰서십·브랜딩·캠페인 협업",
    maxScore: 5,
    score: sponsorConsent ? 3 : 0,
    confidence: "PROVISIONAL",
    rule: "명시 개수 2개↑ 5 · 1개↑ 3 · 없음 0",
    evidence: sponsorConsent ? "동의함" : "비동의 또는 미선택",
    note: "화면이 동의/비동의 이분으로만 받고 있어(스폰서명·개수 입력란 없음) 5점과 3점을 구분할 수 없습니다 — 동의 시 '1개 이상' 기준 3점 잠정 산정입니다.",
  });

  items.push({
    code: "A-MKT-04",
    label: "공연 실적 데이터 제공 협조",
    maxScore: 5,
    score: null,
    confidence: "EXCLUDED",
    rule: "세일즈 데이터 제공 + Pollstar 등록 2종 동의 개수 — 2개 5·1개 3·0개 0",
    note: "A-MKT-02와 같은 이유로 법무 확정 전까지 심사 화면에서 제외합니다.",
  });

  return { key: "MARKETING", label: "마케팅 계획·협업", nominalMax: 20, items };
}

function scoreSafety(info: PerformanceInfo, pledge: SafetyPledge | undefined): ScoreCategory {
  const items: ScoreItem[] = [];

  const bigRecords = info.pastPerformances.filter((r) => parseAudienceNumber(r.audience) >= 10000);
  const n = bigRecords.length;
  const perfScore = n >= 10 ? 5 : n >= 5 ? 3 : n >= 1 ? 1 : 0;
  items.push({
    code: "A-SAF-01",
    label: "주최사 수행 실적",
    maxScore: 5,
    score: perfScore,
    confidence: "PROVISIONAL",
    rule: "최근 3년 내 1만 이상 공연 건수 — 10건↑ 5·5건↑ 3·1건↑ 1·0건 0",
    evidence: `등록된 1만↑ 실적 ${n}건 (전체 ${info.pastPerformances.length}건)`,
    note: "실적 기간(period)이 자유 서술이라 '최근 3년 이내' 여부를 자동 판별할 수 없습니다 — 등록된 전체 실적 기준 잠정치입니다.",
  });

  const pledgeComplete =
    !!pledge &&
    pledge.safetyStructure &&
    pledge.legalInspection &&
    pledge.staffSafetyTraining &&
    pledge.followVenueGuidance &&
    pledge.audienceSafetyMeasures &&
    pledge.insuranceCoverage &&
    pledge.consequenceAcknowledged &&
    pledge.signature.trim().length > 0;
  items.push({
    code: "A-SAF-02",
    label: "안전 관리 계획 적정성 및 규정 준수",
    maxScore: 10,
    score: pledgeComplete ? 10 : 0,
    confidence: "AUTO",
    rule: "서약서(7항목) 전체 동의 + 서명 제출 → 10 / 미제출 0",
    evidence: pledgeComplete ? "서약 7항목 전체 동의 + 서명 확인됨" : "서약 미완료 또는 서명 없음",
  });

  const contractDone = info.castContractStatus === "COMPLETED";
  items.push({
    code: "A-SAF-03",
    label: "개최 신뢰도",
    maxScore: 5,
    score: contractDone ? 5 : 0,
    confidence: "PROVISIONAL",
    rule: "출연자 계약서 제출 → 5 / 미제출 0",
    evidence: `주요 출연진 계약 상태: ${info.castContractStatus ?? "미입력"}`,
    note: "계약서 증빙 첨부 필드가 없어 계약 상태값만으로 판정합니다. '협의 중'은 미제출로 잠정 처리했습니다(기능정의서 13-N #39-g 미확정).",
  });

  return { key: "SAFETY", label: "안전관리·수행역량", nominalMax: 20, items };
}

function scoreBonuses(info: PerformanceInfo): BonusItem[] {
  const selected = info.publicInterestItems ?? [];
  const bonuses: BonusItem[] = [
    {
      code: "A-BON-01",
      label: "지역상생 프로그램 참여",
      maxScore: 5,
      score: selected.includes("LOCAL_COMMUNITY_PROGRAM") ? 5 : 0,
      confidence: "AUTO",
    },
    {
      code: "A-BON-02",
      label: "공익 목적 객석 수량 추가 제공",
      maxScore: 5,
      score: selected.includes("PUBLIC_INTEREST_SEATS") ? 5 : 0,
      confidence: "PROVISIONAL",
      note: "제공 좌석 수를 입력받는 필드가 없어 체크 여부로만 판정합니다. 문화소외계층 초청석(A-PUB-01①)과 같은 좌석을 중복 신고했는지 위원이 확인하세요(13-N #39-d).",
    },
    {
      code: "A-BON-03",
      label: "경합 추가 대관료 제안",
      maxScore: 10,
      score: null,
      confidence: "UNAVAILABLE",
      note: "신청서에 입력란 자체가 없어 신청자가 제안할 방법이 없습니다(기능정의서 13-N #39-h).",
    },
  ];
  return bonuses;
}

function scoreDisqualifiers(pledge: SafetyPledge | undefined): DisqualifierCheck[] {
  const pledgeComplete =
    !!pledge &&
    pledge.safetyStructure &&
    pledge.legalInspection &&
    pledge.staffSafetyTraining &&
    pledge.followVenueGuidance &&
    pledge.audienceSafetyMeasures &&
    pledge.insuranceCoverage &&
    pledge.consequenceAcknowledged &&
    pledge.signature.trim().length > 0;
  return [
    { code: "DQ-01", label: "안전 규정 준수 서약서 미제출", auto: true, triggered: !pledgeComplete },
    { code: "DQ-02", label: "신청 서류 허위 기재·중대 누락", auto: false, triggered: null },
    { code: "DQ-03", label: "제출 서류 미비로 평가 불가", auto: false, triggered: null },
  ];
}

function computeVenueScore(venueId: "arena" | "medium-hall", selection: QuoteSelection): VenueScoreResult {
  const info = selection.performanceInfo;
  const categories: ScoreCategory[] = [
    scoreRevenue(venueId, selection),
    scorePublic(info),
    scoreMarketing(selection.marketingCooperation),
    scoreSafety(info, selection.safetyPledge),
  ];

  const isCounted = (c: ScoreConfidence) => c === "AUTO" || c === "PROVISIONAL";
  let computedSubtotal = 0;
  let unresolvedMax = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      if (isCounted(item.confidence) && item.score !== null) computedSubtotal += item.score;
      else unresolvedMax += item.maxScore;
    }
  }

  const bonuses = scoreBonuses(info);
  const bonusTotal = bonuses.reduce((sum, b) => (isCounted(b.confidence) && b.score !== null ? sum + b.score : sum), 0);
  const penaltyTotal = 0; // 이력 조회 기능 미구현 — 항상 0(신규 취급)

  const provisionalFinal = computedSubtotal + bonusTotal - penaltyTotal;
  const disqualifiers = scoreDisqualifiers(selection.safetyPledge);
  const autoDisqualified = disqualifiers.some((d) => d.auto && d.triggered);

  return {
    venueId,
    venueLabel: VENUE_LABEL[venueId],
    categories,
    bonuses,
    disqualifiers,
    computedSubtotal,
    unresolvedMax,
    bonusTotal,
    penaltyTotal,
    provisionalFinal,
    provisionalEligible: provisionalFinal >= 60 && !autoDisqualified,
  };
}

// 13-C-5 — 동시 대관(SIMULTANEOUS)은 (가)안 "공간별 독립 심사"를 기본값으로 적용한다.
// 공공성·마케팅·안전은 selection.performanceInfo/marketingCooperation/safetyPledge를
// 공통 입력으로 보고 두 공간에 동일하게 적용한다(midHallPerformanceInfo는 참조하지 않음).
export function scoreQuote(selection: QuoteSelection): QuoteScoreBreakdown {
  const venues: ("arena" | "medium-hall")[] =
    selection.bookingMode === "SIMULTANEOUS" ? ["arena", "medium-hall"] : selection.venueId === "medium-hall" ? ["medium-hall"] : ["arena"];

  return {
    rubricVersion: SCORING_RUBRIC_VERSION,
    results: venues.map((v) => computeVenueScore(v, selection)),
  };
}
