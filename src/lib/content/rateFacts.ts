/* ============================================================================
   대관료 정본 — 요금 시트(대관 오픈 준비_101.xlsx › 대관료 시트) 기준

   금액의 소유는 이 파일과 대관료 페이지(`/packages`) 한 곳이다.
   다른 페이지는 요금 수치를 복제하지 않고 체계만 설명한 뒤 이 페이지로 링크한다.

   현재 사이트에서 교체한 값
     ① 아레나 패키지 대관료 — 495,500,000 / 577,500,000 / 675,500,000 / 727,500,000 을
        요금 시트 값(518 / 548 / 613 / 660백만)으로 전면 교체
     ② 송출 수수료 — 매출 5% → 매출의 3% (화면에 "₩5" 로 출력되던 표시 버그 포함)
     ③ 센터 리프트 — 실물 1 EA 이므로 "패키지 3·4 기본 포함 2대"는 성립하지 않는다.
        기본 포함에서 빼고 추가 사용료 항목으로만 둔다
     ④ 관계자 주차 — "최대 200대"는 근거가 없다. 포함분(아레나 150 / 중형 100)과
        단지 총량(915)을 구분해 표기

   확인이 필요한 채로 남긴 것
     · 시설 사용료 — 원 시트 항목명은 "시설 사용료/일당" 이지만,
       셋업일 전용 + 공연일 전용 + 시설 사용료 = 각 패키지 대관료와 정확히 일치한다
       (101,160,000 + 113,000,000 + 303,840,000 = 518,000,000).
       1일 단가가 아니라 1주 총액으로 판단해 "시설 사용료 (1주)" 로 고쳤다. 요금 담당 확인 필요.
     · 스카이박스 2개실(마케팅팀) · 프로덕션 전력 수치(무대팀) — 시트에 확인 필요 표기가
       남아 있어 수치를 쓰지 않고 항목명만 남겼다.
     · 유선 인터컴 — 시트에 요금이 없어 창작하지 않고 "요금 미정" 으로 둔다.
   ========================================================================= */

export const VAT_NOTE = "전 금액 부가가치세 별도입니다.";

/** 두 공간의 요금 체계 비교. 값이 실제로 다른 항목만 행으로 넣는다. */
export const RATE_STRUCTURE: { label: string; arena: string; liveHall: string }[] = [
  { label: "요금 산정 단위", arena: "1주 (셋업 4일 + 공연 2일)", liveHall: "대관일수" },
  { label: "요금 구조", arena: "대관패키지 1~4 중 선택", liveHall: "일자별 셋업·공연 구분으로 합산" },
  { label: "공연일 요금의 평일·주말 구분", arena: "없음", liveHall: "있음" },
  { label: "부대시설·장비", arena: "패키지 포함 범위가 정해져 있음", liveHall: "항목별로 개별 신청" },
  { label: "기준 공연시간", arena: "1회당 최대 240분", liveHall: "1회당 최대 180분" },
  { label: "1일 2회 공연 시 추가 회차 할증", arena: "50%", liveHall: "30%" },
  { label: "포함 주차", arena: "150대", liveHall: "100대" },
];

/** 신청 시 고르는 것 — 대관 안내(`/guide`)의 RATE STRUCTURE 에만 추가로 붙는 행 */
export const RATE_STRUCTURE_CHOICE = {
  label: "신청 시 고르는 것",
  arena: "대관 주차와 패키지",
  liveHall: "희망 일자와 일자별 셋업·공연 지정",
} as const;

/* ------------------------------------------------------- 아레나 대관료 --- */

export interface ArenaPackageRate {
  id: 1 | 2 | 3 | 4;
  name: string;
  capacity: string;
  stageType: string;
  seatingType: string;
  /** 1주 대관료 (VAT 별도) */
  total: number;
  setupExclusive: number;
  setupPerDay: number;
  showExclusive: number;
  showPerDay: number;
  facility: number;
  setupChangePerDay: number;
  showChangePerDay: number;
}

export const ARENA_PACKAGE_RATES: ArenaPackageRate[] = [
  {
    id: 1,
    name: "패키지 1",
    capacity: "약 12,000명",
    stageType: "엔드 스테이지",
    seatingType: "플로어 지정석",
    total: 518_000_000,
    setupExclusive: 101_160_000,
    setupPerDay: 25_290_000,
    showExclusive: 113_000_000,
    showPerDay: 56_500_000,
    facility: 303_840_000,
    setupChangePerDay: 46_790_000,
    showChangePerDay: 154_800_000,
  },
  {
    id: 2,
    name: "패키지 2",
    capacity: "약 15,000명",
    stageType: "엔드 스테이지",
    seatingType: "플로어 스탠딩",
    total: 548_000_000,
    setupExclusive: 101_160_000,
    setupPerDay: 25_290_000,
    showExclusive: 113_000_000,
    showPerDay: 56_500_000,
    facility: 333_840_000,
    setupChangePerDay: 46_790_000,
    showChangePerDay: 166_800_000,
  },
  {
    id: 3,
    name: "패키지 3",
    capacity: "약 18,000명",
    stageType: "센터 스테이지",
    seatingType: "플로어 지정석",
    total: 613_000_000,
    setupExclusive: 101_160_000,
    setupPerDay: 25_290_000,
    showExclusive: 113_000_000,
    showPerDay: 56_500_000,
    facility: 398_840_000,
    setupChangePerDay: 46_790_000,
    showChangePerDay: 196_800_000,
  },
  {
    id: 4,
    name: "패키지 4",
    capacity: "약 22,000명",
    stageType: "센터 스테이지",
    seatingType: "플로어 스탠딩",
    total: 660_000_000,
    setupExclusive: 101_160_000,
    setupPerDay: 25_290_000,
    showExclusive: 113_000_000,
    showPerDay: 56_500_000,
    facility: 445_840_000,
    setupChangePerDay: 46_790_000,
    showChangePerDay: 216_800_000,
  },
];

/** 아레나 패키지 최대 수용인원 — 위저드 입력 상한과 같은 값을 쓴다 */
export const ARENA_MAX_AUDIENCE = 22_000;

export interface ChargeRow {
  group: string;
  item: string;
  /** 금액이 없는 항목(협의·미정·실비)은 문자열로 둔다 */
  rate: number | string;
  unit?: string;
}

export const ARENA_ADDITIONAL_CHARGES: ChargeRow[] = [
  { group: "추가 대관", item: "종일 09:00~24:00", rate: 35_000_000, unit: "시간" },
  { group: "추가 대관", item: "철야 24:00~06:00", rate: 45_000_000, unit: "시간" },
  { group: "공간·프로모션", item: "부스", rate: 1_000_000, unit: "1일·개소당" },
  { group: "공간·프로모션", item: "팝업 공간", rate: 2_000_000, unit: "1일·20평 기준" },
  { group: "공간·프로모션", item: "B1F 연습실", rate: 1_000_000, unit: "1일" },
  { group: "공간·프로모션", item: "옥외 광고물·디지털 매체", rate: "위치·규격에 따라 산정" },
  { group: "공간·프로모션", item: "송출 수수료", rate: "매출의 3%" },
  { group: "무대 인프라", item: "센터 리프트", rate: 1_500_000, unit: "공연 회당" },
  { group: "무대 인프라", item: "팔로우 스팟", rate: 150_000, unit: "1일·대당, 최대 15대" },
  { group: "무대 인프라", item: "무선 인터컴", rate: 30_000, unit: "1일·팩당, 최대 20팩" },
  { group: "무대 인프라", item: "유선 인터컴", rate: "요금 미정" },
  { group: "기타", item: "수도광열비", rate: "실사용량 기준 실비" },
  { group: "기타", item: "추가 주차권", rate: 15_000, unit: "1일권·대당" },
];

export const ARENA_LIMITS: [string, string][] = [
  ["기준 공연시간", "공연 1회당 최대 240분"],
  ["1일 2회 공연", "추가 회차 대관료 50% 할증"],
  ["기준 이용시간", "09:00 ~ 22:00"],
  ["이용 제한시간", "12:00 ~ 13:00, 18:00 ~ 19:00 (변경은 별도 협의 가능)"],
];

/* --------------------------------------------------- 중형공연장 대관료 --- */

export interface LiveHallDayRate {
  label: string;
  total: number;
  exclusive: number;
  facility: number;
}

export const LIVE_HALL_DAY_RATES: LiveHallDayRate[] = [
  { label: "평일·주말 셋업", total: 14_000_000, exclusive: 5_500_000, facility: 8_500_000 },
  { label: "평일 공연", total: 21_000_000, exclusive: 7_900_000, facility: 13_100_000 },
  { label: "주말 공연", total: 25_000_000, exclusive: 11_550_000, facility: 13_450_000 },
];

export const LIVE_HALL_OPTIONAL_SERVICES: ChargeRow[] = [
  { group: "추가 대관", item: "09:00~24:00", rate: 1_000_000, unit: "시간" },
  { group: "추가 대관", item: "24:00~06:00", rate: 1_500_000, unit: "시간" },
  { group: "공간·프로모션", item: "팝업 공간", rate: 2_000_000, unit: "1일·20평 기준" },
  { group: "공간·프로모션", item: "B1F 연습실", rate: 1_000_000, unit: "1일" },
  { group: "공간·프로모션", item: "옥외 광고", rate: "별도 협의" },
  { group: "공간·프로모션", item: "송출 수수료", rate: "매출의 3% 또는 정액" },
  { group: "기타", item: "수도광열비", rate: "실사용량 기준 실비" },
  { group: "기타", item: "추가 주차권", rate: 15_000, unit: "1일권·대당" },
];

export const LIVE_HALL_LIMITS: [string, string][] = [
  ["기준 공연시간", "공연 1회당 최대 180분"],
  ["1일 2회 공연", "추가 회차 대관료 30% 할증"],
  ["기준 이용시간", "09:00 ~ 22:00"],
  ["이용 제한시간", "12:00 ~ 13:00, 18:00 ~ 19:00"],
];

/* ---------------------------------------------------------- 공통 고지 --- */

export const RATE_COMMON_NOTES: string[] = [
  "이 페이지에 표기된 모든 금액은 부가가치세 별도입니다.",
  "운영 상황에 따라 안내 목록에 포함되지 않은 추가 부대사용료가 발생할 수 있습니다.",
  "수도광열비는 신청 시점에 확정되지 않습니다. 실사용량을 기준으로 산정해 공연 종료 후 사후 정산 단계에서 청구합니다.",
  "신청 화면에서 계산되는 금액은 입력하신 조건으로 산출한 예상 금액입니다. 최종 금액은 심사와 협의를 거쳐 계약서에 확정됩니다.",
];
