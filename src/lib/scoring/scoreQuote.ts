// [신규 2026-08-25] 대관 심사 채점 엔진 — 「서울아레나 대관 심의 평가 세부 기준」
// Ver. 26-09-13(부록 F)을 신청 위저드의 실제 필드에 물린 자동 산정 로직.
//
// 배점표는 자주 개정된다(26-08-22 → 26-09-13). 개정본을 받으면 SCORING_RUBRIC_VERSION
// 부터 올릴 것 — 그 값이 위원 화면(ScoringPanel)에 그대로 찍혀, 위원이 손에 든 심사표와
// 같은 버전인지 확인하는 유일한 근거다. 상수를 안 올리면 화면은 옛 버전을 주장하면서
// 새 기준으로 채점하는 상태가 된다.
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
//   · 가점 M-BON-03(중형 신진 아티스트 기용) — 신청서에 입력란 없음
//   · A-SAF-03 계약 증빙 첨부 — 신청서에 항목 없음, 계약 상태만으로 판정
//   · 동점 tie-break 자동 판정, 위원별 봉인 채점, 시뮬레이션 — 전부 별도 단계(S1 이후)
import type { PerformanceInfo, PublicInterestItem, QuoteSelection, SafetyPledge } from "@/lib/pricing/types";
import type {
  BonusItem,
  DisqualifierCheck,
  PenaltyItem,
  QuoteScoreBreakdown,
  ScoreCategory,
  ScoreConfidence,
  ScoreItem,
  VenueScoreResult,
} from "./types";

const SCORING_RUBRIC_VERSION = "26-09-13";

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

// [수정 2026-09-18, 심사표 1:1 대조] 중형 평가표(배점표 2p)를 보는 위원 화면에 아레나
// 접두(A-)가 찍혀 있어 심사표와 1:1로 안 읽혔다 — 수익성만 M-REV 로 갈라져 있고 공공성·
// 마케팅·안전은 전부 A- 였다. 배점·구간은 두 평가표가 같으므로 점수는 그대로 두고 코드
// 접두만 공간에 맞춘다.
function codePrefix(venueId: "arena" | "medium-hall"): "A" | "M" {
  return venueId === "medium-hall" ? "M" : "A";
}

function scorePublic(info: PerformanceInfo, venueId: "arena" | "medium-hall"): ScoreCategory {
  const P = codePrefix(venueId);
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
    code: `${P}-PUB-01`,
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
    code: `${P}-PUB-02`,
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

function scoreMarketing(venueId: "arena" | "medium-hall"): ScoreCategory {
  const P = codePrefix(venueId);
  const items: ScoreItem[] = [];
  // [2026-09-02, 감사 2026-09-18] "타겟 정의·집행 예산·타임라인은 제외" 요청 이후
  // mediaMixOnline/mediaMixOffline 자유 서술 입력칸 자체가 위저드에서 없어지고
  // 첨부파일(MARKETING_PLAN 분류) 업로드로 바뀌었다(StepMarketingCooperation.tsx
  // 참고) — 그날 이후 제출된 모든 신청서는 이 필드가 항상 빈 문자열이라 PROVISIONAL로
  // 두면 "구체적 서술 0/2요소 → 0점"이 실제 신청자가 무엇을 냈는지와 무관하게 항상
  // 찍힌다. 텍스트가 아니라 파일로 받는 값이라 selection만으로는 판정할 신호가 없다 —
  // UNAVAILABLE로 내려 위원이 첨부된 마케팅 실행 계획서 파일을 직접 열어 판단하게 한다.
  items.push({
    code: `${P}-MKT-01`,
    label: "마케팅 실행 계획",
    maxScore: 5,
    score: null,
    confidence: "UNAVAILABLE",
    // [수정 2026-09-18 재개정, Ver.26-09-13] 이 한 줄은 개정 때마다 구간이 바뀐다 —
    // 옛 2구간("2개 5·1개 2·0개 0") → 26-08-22 의 4구간("전부 5·3개 3·2개 1·미구체 0")
    // → 26-09-13 의 3구간. 26-09-13 배점표는 4요소 나열 없이 「구체화 5 · 중간 3 · 미흡 0」
    // 만 쓴다. 점수는 어차피 UNAVAILABLE(첨부파일로 받는 값이라 자동 산정 불가)이지만,
    // 화면에 뜨는 기준 문구만은 위원이 손에 든 배점표와 글자 그대로 같아야 한다.
    rule: "구체화 5 · 중간 3 · 미흡 0",
    note: "2026-09-02부터 마케팅 실행 계획은 텍스트 입력이 아니라 첨부파일(마케팅 실행 계획서)로 제출됩니다 — 신청 상세의 첨부 서류에서 직접 확인해 위원이 판단하세요.",
  });

  // 13-16/13-17 — 협조 동의 항목은 대관계약 별지 동의서 「심사 중립성」 조항과
  // 충돌 소지가 있어 법무 확정 전까지 (가)안(심사 화면 제외)을 기본값으로 적용한다.
  items.push({
    code: `${P}-MKT-02`,
    label: "공동 프로모션 협조",
    maxScore: 5,
    score: null,
    confidence: "EXCLUDED",
    rule: "동의 5 / 비동의 0",
    note: "대관계약 별지 동의서의 「심사 중립성」 조항과 충돌 소지가 있어 법무 확정 전까지 심사 화면에서 제외합니다(기능정의서 13-16/13-71, 오픈 전 필수 결정사항 #38).",
  });

  // [2026-09-07, 감사 2026-09-18] "동의 구하는거 그 두줄 자체가 없어야해" 요청으로
  // coSponsorshipConsent를 묻던 화면이 신청 단계에서 빠졌다(StepMarketingCooperation.tsx
  // 참고) — 필드는 남아있지만 그 날 이후로는 아무 위저드 경로도 이 값을 true로 만들지
  // 않는다. PROVISIONAL로 두면 모든 신규 신청서가 항상 "비동의 또는 미선택 → 0점"으로
  // 찍혀 실제로는 판단할 방법이 없는 걸 "협업 의사 없음"처럼 보여준다. UNAVAILABLE로
  // 내려 "협업 동의 여부"(contentCooperationConsent, 신청 상세에 노출됨)를 참고해
  // 위원이 직접 판단하게 한다.
  items.push({
    code: `${P}-MKT-03`,
    label: "공동 스폰서십·브랜딩·캠페인 협업",
    maxScore: 5,
    score: null,
    confidence: "UNAVAILABLE",
    rule: "명시 개수 2개↑ 5 · 1개↑ 3 · 없음 0",
    note: "2026-09-07부터 이 항목을 직접 묻는 화면이 없습니다 — 신청 상세의 '협업 동의 여부'와 첨부 자료를 참고해 위원이 직접 판단하세요.",
  });

  items.push({
    code: `${P}-MKT-04`,
    label: "공연 실적 데이터 제공 협조",
    maxScore: 5,
    score: null,
    confidence: "EXCLUDED",
    rule: "세일즈 데이터 제공 + Pollstar 등록 2종 동의 개수 — 2개 5·1개 3·0개 0",
    // 코드 접두를 박아 두면 중형 화면에서 「A-MKT-02」를 찾게 되는데 거기엔 M-MKT-02 가
    // 보인다 — 같은 화면 안에서 가리키는 이름이 어긋나면 안 된다.
    note: `${P}-MKT-02와 같은 이유로 법무 확정 전까지 심사 화면에서 제외합니다.`,
  });

  return { key: "MARKETING", label: "마케팅 계획·협업", nominalMax: 20, items };
}

// PerformanceInfo.safetyPledgeSigned는 아무도 set하지 않는 죽은 필드다(항상 false로
// 초기화만 됨, performanceInfoDefaults.ts 참고) — 실제 서약은 StepSafetyPledge.tsx가
// 별개 필드인 selection.safetyPledge에 쓴다. 심사 채점뿐 아니라 관리자 심사 화면들
// (QuoteApplicationDetail.tsx, admin/[id]/application/page.tsx)도 "완료 여부"를 보여줄 때
// 이 함수로 통일한다 — 세 곳이 각자 판정하면 기준이 갈릴 수 있다(2026-09-17 감사에서 발견).
export function isSafetyPledgeComplete(pledge: SafetyPledge | undefined): boolean {
  return (
    !!pledge &&
    pledge.safetyStructure &&
    pledge.legalInspection &&
    pledge.staffSafetyTraining &&
    pledge.followVenueGuidance &&
    pledge.audienceSafetyMeasures &&
    pledge.insuranceCoverage &&
    pledge.consequenceAcknowledged &&
    pledge.signature.trim().length > 0
  );
}

function scoreSafety(
  info: PerformanceInfo,
  pledge: SafetyPledge | undefined,
  venueId: "arena" | "medium-hall",
): ScoreCategory {
  const P = codePrefix(venueId);
  const items: ScoreItem[] = [];

  const bigRecords = info.pastPerformances.filter((r) => parseAudienceNumber(r.audience) >= 10000);
  const n = bigRecords.length;
  const perfScore = n >= 10 ? 5 : n >= 5 ? 3 : n >= 1 ? 1 : 0;
  items.push({
    code: `${P}-SAF-01`,
    label: "주최사 수행 실적",
    maxScore: 5,
    score: perfScore,
    confidence: "PROVISIONAL",
    rule: "최근 3년 내 1만 이상 공연 건수 — 10건↑ 5·5건↑ 3·1건↑ 1·0건 0",
    evidence: `등록된 1만↑ 실적 ${n}건 (전체 ${info.pastPerformances.length}건)`,
    note: "실적 기간(period)이 자유 서술이라 '최근 3년 이내' 여부를 자동 판별할 수 없습니다 — 등록된 전체 실적 기준 잠정치입니다.",
  });

  const pledgeComplete = isSafetyPledgeComplete(pledge);
  items.push({
    code: `${P}-SAF-02`,
    label: "안전 관리 계획 적정성 및 규정 준수",
    maxScore: 10,
    score: pledgeComplete ? 10 : 0,
    confidence: "AUTO",
    rule: "서약서(7항목) 전체 동의 + 서명 제출 → 10 / 미제출 0",
    evidence: pledgeComplete ? "서약 7항목 전체 동의 + 서명 확인됨" : "서약 미완료 또는 서명 없음",
  });

  const contractDone = info.castContractStatus === "COMPLETED";
  items.push({
    code: `${P}-SAF-03`,
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

// [수정 2026-09-18, 심사표 원본(Ver.26-08-22) 재대조] 두 가지가 배점표와 어긋나 있었다.
//
// 1) 가점 항목은 아레나·중형이 서로 다르다(배점표 1p·2p) — 아레나는 지역상생 5·공익객석
//    5·경합 추가 대관료 4~10(3항목), 중형은 지역상생 3·공익객석 3·신진 아티스트 기용
//    16(세 번째 항목 자체가 다름)인데, 이 함수는 venueId를 받지 않고 항상 같은 4항목·
//    같은 배점을 냈다 — 중형 신청서에 아레나 배점(5/5/경합대관료)이 그대로 찍히고
//    있었다.
// 2) "지역상생 프로그램 참여"는 배점표에 한 줄뿐인데, 위저드에는 같은 취지의 체크박스가
//    둘(LOCAL_COMMUNITY_PROGRAM · REGIONAL_VENUE_ACTIVATION_PROGRAM, 둘 다 "지역상생 ·
//    공연장 활성화" 그룹) 있어 옛 코드가 각각을 A-BON-01·A-BON-04로 따로 채점했다 — 두
//    체크박스를 모두 선택하면 배점표에 없는 10점(5+5)이 나오는 이중 채점이었다. 어느
//    쪽을 체크해도 같은 한 줄로 합산한다.
function scoreBonuses(info: PerformanceInfo, venueId: "arena" | "medium-hall"): BonusItem[] {
  const selected = info.publicInterestItems ?? [];
  const localSolidarity =
    selected.includes("LOCAL_COMMUNITY_PROGRAM") || selected.includes("REGIONAL_VENUE_ACTIVATION_PROGRAM");

  if (venueId === "medium-hall") {
    return [
      {
        code: "M-BON-01",
        label: "지역상생 프로그램 참여 (제안 혹은 협업)",
        maxScore: 3,
        score: localSolidarity ? 3 : 0,
        confidence: "AUTO",
      },
      {
        code: "M-BON-02",
        label: "공익 목적의 객석 수량 추가 제공",
        maxScore: 3,
        score: selected.includes("PUBLIC_INTEREST_SEATS") ? 3 : 0,
        confidence: "PROVISIONAL",
        // 중형 화면에서 「A-PUB-01」을 가리키면 위원이 못 찾는다 — 그 화면에는 M-PUB-01 이
        // 보인다. 코드 접두를 공간에 맞춘 뒤에도 note 안에 박힌 참조가 남아 있었다.
        note: "제공 좌석 수를 입력받는 필드가 없어 체크 여부로만 판정합니다. 문화소외계층 초청석(M-PUB-01①)과 같은 좌석을 중복 신고했는지 위원이 확인하세요(13-N #39-d).",
      },
      {
        code: "M-BON-03",
        label: "신진 아티스트 기용 (데뷔 1년 이내 또는 첫 단독 공연)",
        maxScore: 16,
        score: null,
        confidence: "UNAVAILABLE",
        note:
          (info.artistMainHistory ?? []).length > 0
            ? `등록된 아티스트 이력의 데뷔연도: ${(info.artistMainHistory ?? []).map((r) => r.debutYear || "미입력").join(", ")}. '첫 단독 공연' 여부는 입력받는 필드가 없어 위원이 위 이력을 참고해 직접 판단하세요.`
            : "등록된 아티스트 이력이 없고, '데뷔 1년 이내·첫 단독 공연' 여부를 입력받는 필드도 없어 자동 산정할 수 없습니다. 위원이 직접 확인하세요.",
      },
    ];
  }

  // [신규 2026-08-26] 경합 시 추가 제안 대관료는 배점표상 "티켓 매출 X%" 구간별
  // 점수다(0.5%↑ 4·1%↑ 6·1.5%↑ 8·2%↑ 10) — ticketRevenueShareRate가 그 %값이다.
  // competitionFeeOptionMin/Max(정액 범위, 원 단위)는 배점표에 정량 기준이 없는
  // 별도 자유 제안이라 점수에는 반영하지 않고 참고용으로만 note에 남긴다.
  const rsRate = info.ticketRevenueShareRate;
  const rsScore =
    typeof rsRate === "number"
      ? bandScore(rsRate, [{ min: 2, score: 10 }, { min: 1.5, score: 8 }, { min: 1, score: 6 }, { min: 0.5, score: 4 }], 0)
      : 0;
  const hasFeeRange =
    typeof info.competitionFeeOptionMax === "number" && info.competitionFeeOptionMax > 0;
  const feeRangeNote = hasFeeRange
    ? ` (별도 제안: 대관료 옵션 ${info.competitionFeeOptionMin?.toLocaleString() ?? 0}~${info.competitionFeeOptionMax?.toLocaleString()}원 — 배점표에 정량 기준이 없어 점수에는 반영하지 않았습니다.)`
    : "";

  return [
    {
      code: "A-BON-01",
      label: "지역상생 프로그램 참여 (제안 혹은 협업)",
      maxScore: 5,
      score: localSolidarity ? 5 : 0,
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
      label: "경합 추가 대관료 제안 (티켓 매출 0.5%↑ 4 · 1%↑ 6 · 1.5%↑ 8 · 2%↑ 10)",
      maxScore: 10,
      score: rsScore,
      confidence: "PROVISIONAL",
      note:
        `티켓 매출 RS 제안 요율 ${typeof rsRate === "number" ? `${rsRate}%` : "미입력"}.` +
        feeRangeNote +
        " 자유 입력값이라 실제 이행 가능성·적정성은 위원이 직접 검토해야 합니다.",
    },
  ];
}

/**
 * [신규 2026-09-18, 심사표 1:1 대조] 배점표 3) 감점 항목 — "심사표와 심사 평가 항목이
 * 매칭이 안 된다"(niki).
 *
 * 배점표에는 감점이 다섯 줄로 명시돼 있는데 화면에는 그 줄이 하나도 없고, 하단에 "이력
 * 조회 기능이 없어 0으로 취급한다"는 문구만 있었다 — 위원이 심사표를 들고 화면을 봐도
 * 「3년 내 대관 계약 해지 −5」를 적용할 자리가 없었다.
 *
 * 자동 판정은 여전히 불가하다(신청사 이력 조회 테이블이 없다). 그래도 배점표와 같은 줄을
 * 같은 순서·같은 감점 폭으로 보여주고 「위원 판단」으로 표시한다 — 부적격 게이트
 * (scoreDisqualifiers)가 이미 쓰는 방식과 같다. 아레나·중형 배점표(1p·2p)의 감점 항목은
 * 다섯 줄이 완전히 동일해서 공간별로 가르지 않는다.
 */
function scorePenalties(venueId: "arena" | "medium-hall"): PenaltyItem[] {
  const P = codePrefix(venueId);
  const NOTE =
    "신청사 이력 조회 기능이 아직 없어 자동 판정할 수 없습니다 — 위원이 직접 확인해 적용하세요. 동일 사건이면 사유별 최대값 1개만 적용합니다(배점표 3 단서).";
  return [
    { code: `${P}-PEN-01`, label: "3년 내 대관 계약 해지 이력", penalty: -5, auto: false, triggered: null, note: NOTE },
    { code: `${P}-PEN-02`, label: "대관 승인 이후 취소 이력", penalty: -3, auto: false, triggered: null, note: NOTE },
    { code: `${P}-PEN-03`, label: "정산 분쟁 이력", penalty: -5, auto: false, triggered: null, note: NOTE },
    { code: `${P}-PEN-04`, label: "공연장 정책 위반 이력", penalty: -3, auto: false, triggered: null, note: NOTE },
    { code: `${P}-PEN-05`, label: "중대 안전사고/법규 위반 이력", penalty: -10, auto: false, triggered: null, note: NOTE },
  ];
}

function scoreDisqualifiers(pledge: SafetyPledge | undefined): DisqualifierCheck[] {
  return [
    // 배점표 3) 대관 적격 판정은 「안전 규정 준수 서약서(체크리스트) 미제출 **및 계획
    // 적정성 부족**」을 한 줄로 묶는다 — 앞부분만 적어 두면 위원이 심사표의 그 줄을 화면
    // 에서 찾지 못한다. 자동 판정은 서약서 제출 여부만 본다(계획 적정성은 위원 판단).
    {
      code: "DQ-01",
      label: "안전 규정 준수 서약서(체크리스트) 미제출 및 계획 적정성 부족",
      auto: true,
      triggered: !isSafetyPledgeComplete(pledge),
    },
    { code: "DQ-02", label: "신청 서류 허위 기재·중대 누락", auto: false, triggered: null },
    { code: "DQ-03", label: "제출 서류 미비로 평가 불가", auto: false, triggered: null },
  ];
}

function computeVenueScore(venueId: "arena" | "medium-hall", selection: QuoteSelection): VenueScoreResult {
  const info = selection.performanceInfo;
  const categories: ScoreCategory[] = [
    scoreRevenue(venueId, selection),
    scorePublic(info, venueId),
    scoreMarketing(venueId),
    scoreSafety(info, selection.safetyPledge, venueId),
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

  const bonuses = scoreBonuses(info, venueId);
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
    penalties: scorePenalties(venueId),
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
