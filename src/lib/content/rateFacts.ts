/* ============================================================================
   대관료 — 화면 카피 정본

   Notion 「콘텐츠 전문 · BOOK IT」 › 대관료 (`/rates`) 표를 그대로 옮긴 것이다.
   요금 시트(`대관 오픈 준비_101.xlsx` › 대관료 시트)가 원 출처이며,
   금액의 소유는 이 파일과 대관료 페이지 한 곳이다.
   다른 페이지는 요금 수치를 복제하지 않고 체계만 설명한 뒤 이 페이지로 링크한다.
   ========================================================================= */

export const VAT_NOTE = "상기 금액은 부가세 별도 입니다.";

/* ------------------------------------------------------- 요금 체계 안내 --- */

export const RATE_STRUCTURE: { venue: string; desc: string }[] = [
  {
    venue: "아레나",
    desc: "공연 운영에 필요한 주요 시설·장비·서비스를 하나의 대관패키지로 제공하는 통합 요금체계입니다. 공연 규모와 운영 방식에 따라 패키지를 선택할 수 있으며, 비용 예측성과 운영 효율을 높일 수 있습니다.",
  },
  {
    venue: "중형공연장",
    desc: "대관일수 기준의 요금체계를 적용합니다. 사용 기간에 따라 기본 대관료가 산정되며, 필요한 부대시설 및 서비스는 별도 신청하여 이용할 수 있습니다.",
  },
];

/* ---------------------------------------------------------- 아레나 요금 --- */

export interface ArenaRate {
  key: string;
  name: string;
  capacity: string;
  stageType: string;
  seatingType: string;
  total: number;
  setupExclusive: string;
  showExclusive: string;
  facility: string;
  setupChange: string;
  showChange: string;
}

export const ARENA_RATES: ArenaRate[] = [
  {
    key: "A",
    name: "Rate A",
    capacity: "약 12,000명",
    stageType: "엔드 스테이지",
    seatingType: "플로어 지정석",
    total: 518_000_000,
    setupExclusive: "101,160,000원/4일 (25,290,000원/일당)",
    showExclusive: "113,000,000원/2일 (56,500,000원/일당)",
    facility: "303,840,000원/일당",
    setupChange: "46,790,000원/일당",
    showChange: "154,800,000원/일당",
  },
  {
    key: "B",
    name: "Rate B",
    capacity: "약 15,000명",
    stageType: "엔드 스테이지",
    seatingType: "플로어 스탠딩",
    total: 548_000_000,
    setupExclusive: "101,160,000원/4일 (25,290,000원/일당)",
    showExclusive: "113,000,000원/2일 (56,500,000원/일당)",
    facility: "333,840,000원/일당",
    setupChange: "46,790,000원/일당",
    showChange: "166,800,000원/일당",
  },
  {
    key: "C",
    name: "Rate C",
    capacity: "약 18,000명",
    stageType: "센터 스테이지",
    seatingType: "플로어 지정석",
    total: 613_000_000,
    setupExclusive: "101,160,000원/4일 (25,290,000원/일당)",
    showExclusive: "113,000,000원/2일 (56,500,000원/일당)",
    facility: "398,840,000원/일당",
    setupChange: "46,790,000원/일당",
    showChange: "196,800,000원/일당",
  },
  {
    key: "D",
    name: "Rate D",
    capacity: "약 22,000명",
    stageType: "센터 스테이지",
    seatingType: "플로어 스탠딩",
    total: 660_000_000,
    setupExclusive: "101,160,000원/4일 (25,290,000원/일당)",
    showExclusive: "113,000,000원/2일 (56,500,000원/일당)",
    facility: "445,840,000원/일당",
    setupChange: "46,790,000원/일당",
    showChange: "216,800,000원/일당",
  },
];

export const ARENA_RENTAL_PERIOD = "1주 (6일 — 셋업 4일⋅공연 2일)";

/** 아레나 패키지 최대 수용인원 — 위저드 입력 상한과 같은 값을 쓴다 */
export const ARENA_MAX_AUDIENCE = 22_000;

export const ARENA_RATE_INCLUDES: [string, string][] = [
  ["공간", "야외광장⋅티켓박스⋅전용 콘코스"],
  ["공간", "대기실14개실⋅다목적실 2개실⋅운영관리실⋅프로덕션룸⋅녹음실⋅식당⋅프레스룸"],
  ["프리미엄 공간", "스카이박스 2개실"],
  [
    "장비",
    "수납식객석(1F⋅3F) · 상부 리깅 시스템(마더트러스)⋅프로덕션 전력(7,000A) · 스마트 스테이지 2개⋅계단 LED⋅딜레이 스피커⋅리덕션커튼",
  ],
  ["주차", "150대"],
  ["미화", "객석 기본 클리닝(특효류 포함)"],
];

export interface ChargeRow {
  group: string;
  item: string;
  cost: string;
  note?: string;
}

export const ARENA_ADDITIONAL_CHARGES: ChargeRow[] = [
  { group: "추가 대관/H", item: "종일", cost: "35,000,000원", note: "시간당 09:00~24:00" },
  { group: "추가 대관/H", item: "철야", cost: "45,000,000원", note: "시간당 24:00~06:00" },
  { group: "공간·프로모션", item: "부스", cost: "1,000,000원", note: "1일⋅개소당" },
  { group: "공간·프로모션", item: "팝업 공간", cost: "2,000,000원", note: "1일 · 20평 기준" },
  { group: "공간·프로모션", item: "B1F 연습실", cost: "1,000,000원", note: "1일 기준" },
  { group: "공간·프로모션", item: "옥외 광고물/디지털 매체", cost: "—", note: "위치·규격에 따라 산정" },
  { group: "공간·프로모션", item: "송출 수수료", cost: "—", note: "매출의 3%" },
  { group: "무대 인프라", item: "센터 리프트", cost: "1,500,000원", note: "공연 회당" },
  { group: "무대 인프라", item: "팔로우 스팟", cost: "150,000원", note: "1일⋅대당 / 최대 15대" },
  { group: "무대 인프라", item: "유선 인터컴", cost: "—", note: "미정" },
  { group: "무대 인프라", item: "무선 인터컴", cost: "30,000원", note: "1일·팩당 / 최대 20팩" },
  { group: "기타", item: "수도광열비", cost: "실비", note: "실사용량 기준" },
  { group: "기타", item: "추가 주차권", cost: "15,000원", note: "1일권⋅대당" },
];

export const ARENA_LIMITS: [string, string][] = [
  ["기준 공연시간", "공연 1회당 최대 240분"],
  ["1일 2회 공연", "추가 회차 대관료 50% 할증"],
  ["기준 이용시간", "09:00–22:00"],
  ["이용 제한시간", "12:00–13:00 및 18:00–19:00"],
];

export const ARENA_RATE_NOTES: string[] = [
  "상기 금액은 부가세 별도 입니다.",
  "이용 제한시간의 변경은 별도 협의 가능합니다.",
  "운영 상황에 따라 목록에 포함되지 않은 추가적인 부대사용료가 발생할 수 있습니다.",
];

/* ----------------------------------------------------- 중형공연장 요금 --- */

export interface LiveHallRate {
  key: string;
  name: string;
  total: string;
  exclusive: string;
  facility: string;
}

export const LIVE_HALL_RATES: LiveHallRate[] = [
  {
    key: "setup",
    name: "평일/주말 셋업",
    total: "14,000,000원/일당",
    exclusive: "5,500,000원",
    facility: "8,500,000원",
  },
  {
    key: "weekday",
    name: "평일 공연",
    total: "21,000,000원/일당",
    exclusive: "7,900,000원",
    facility: "13,100,000원",
  },
  {
    key: "weekend",
    name: "주말 공연",
    total: "25,000,000원/일당",
    exclusive: "11,550,000원",
    facility: "13,450,000원",
  },
];

export const LIVE_HALL_RATE_INCLUDES: [string, string][] = [
  ["냉난방", "기준 이용시간"],
  ["공간", "야외광장 및 티켓박스"],
  ["공간", "대기실 4개실 및 퀵체인지룸"],
  ["장비", "무대리프트⋅팔로우스팟 4개⋅프로덕션 전력(3000A)⋅샤막"],
  ["주차", "100대"],
  ["미화", "객석 기본 클리닝(특효류 포함)"],
];

export const LIVE_HALL_ADDITIONAL_CHARGES: ChargeRow[] = [
  { group: "추가대관", item: "09:00~24:00", cost: "1,000,000원", note: "시간당" },
  { group: "추가대관", item: "24:00~06:00", cost: "1,500,000원", note: "시간당" },
  { group: "공간·프로모션", item: "팝업 공간", cost: "2,000,000원", note: "1일 · 20평 기준" },
  { group: "공간·프로모션", item: "B1F 연습실", cost: "1,000,000원", note: "1일 기준" },
  { group: "공간·프로모션", item: "옥외 광고", cost: "별도 협의", note: "위치·규격에 따라 산정" },
  { group: "공간·프로모션", item: "송출 수수료", cost: "별도 협의", note: "매출의 3% or 정액" },
  { group: "기타", item: "수도광열비", cost: "실비", note: "실사용량 기준" },
  { group: "기타", item: "추가 주차권", cost: "15,000원", note: "1일권⋅대당" },
];

export const LIVE_HALL_LIMITS: [string, string][] = [
  ["기준 이용시간", "09:00–22:00"],
  ["이용 제한시간", "12:00–13:00 및 18:00–19:00"],
  ["기준 공연시간", "공연 1회당 최대 180분"],
  ["1일 2회 공연", "추가 회차 대관료 30% 할증"],
];

export const LIVE_HALL_RATE_NOTES: string[] = [
  "상기 금액은 모두 부가세 별도 입니다.",
  "운영 상황에 따라 목록에 포함되지 않은 추가적인 부대사용료가 발생할 수 있습니다.",
];
