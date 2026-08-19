import type { AddonItem, PackageInclusion, RateTable, RentalPackage } from "./types";

// 모든 금액은 확정 전 플레이스홀더입니다. 실제 요금표 확정 시 운영자 백오피스(요금표 관리)에서
// 교체하면 됩니다. 이 파일은 DB가 비어 있을 때 최초 1회 시드하는 기본값입니다.

export const SEED_RATE_TABLE_VERSION = "2026-07-seed-v1";

// 아래 4개 패키지의 기본정보/기본 포함사항은 "패키지 구성" 명세(엑셀) 기준입니다.
// 대관 구성(화~일)·세부 구성(준비 4일+공연 2일)·대관시간(09:00~22:00)·야외광장 포함 여부는
// 전 패키지 공통이며, 객석 운영 형태·무대형태는 명세상 "대관시스템 미노출" 항목이라 신청자 화면에는 표시하지 않습니다.
// [확정 2026-08-14, 기능정의서 부록A #6/2-43] "4개 패키지 구성이 완전히 동일, Bowl 사용료만
// 차등" — 패키지별로 다르던 기본 포함 항목(대기실 수·트러스 세트 등)을 전 패키지 공통으로
// 통일한다. 패키지 간 유일한 차이는 audienceTier·baseFeePerWeek(Bowl 내재)·추가일 단가뿐이다.
// "아레나 기본구성" 시트 기준(부속공간은 산정표 실제 금액 기준인 7개실 — 요약표의 6개실은
// 산정표 상 오타로 문서에 기록됨).
const ARENA_PARKING_PER_DAY = "150대/일";
const ARENA_WAITING_ROOM_NOTE = "지하 8실 · 지상 6실 (14개실)";
const ARENA_SIDE_FACILITIES = "부속공간 7개실 · 식당 · 하역시설";
const ARENA_INCLUDED_ITEMS: PackageInclusion[] = [
  { addonId: "outdoor_plaza", quantity: 2 },
  { addonId: "ticket_box", quantity: 2 },
  { addonId: "parking", quantity: 150 },
  { addonId: "loading_dock", quantity: 6 },
  { addonId: "waiting_room", quantity: 14 },
  { addonId: "side_facility", quantity: 6 },
  { addonId: "mother_truss_a", quantity: 6 },
  { addonId: "mother_truss_b", quantity: 6 },
  { addonId: "mother_truss_c", quantity: 6 },
  { addonId: "mother_truss_l", quantity: 6 },
  { addonId: "mother_truss_r", quantity: 6 },
  { addonId: "smart_stage", quantity: 2 },
  { addonId: "stair_led", quantity: 2 },
  { addonId: "delay_speaker", quantity: 2 },
  { addonId: "skybox", quantity: 2 },
  { addonId: "production_power", quantity: 6 },
];

export const SEED_PACKAGES: RentalPackage[] = [
  {
    id: 1,
    venueId: "arena",
    name: "패키지 1",
    tagline: "합리적인 규모의 콘서트를 위한 스탠더드 패키지",
    audienceTier: { min: 0, max: 12_000, label: "~12,000석 규모" },
    baseFeePerWeek: 518_000_000, // [확정 2026-08-14] 패키지 요금표 시트 — VAT 별도, 준비 4일+공연 2일 기준
    bowlFee: 96_000_000, // [패키지 구성 산정표] 1만명 x 2회 x 4,000원/인 — baseFeePerWeek와 합산 시 산정표 근거(496.76M)와 확정가(518M) 사이 21.24M 차이가 남, 재확인 필요
    includedWeeks: 1,
    mediaTier: null,
    discountRatio: 0,
    setupExtraDayFee: 46_790_000, // [확정 2026-08-14]
    performanceExtraDayFee: 154_800_000, // [확정 2026-08-14]
    dayBreakdown: "준비 4일 + 공연 2일",
    defaultPerformanceDays: 2,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: true,
    parkingPerDay: ARENA_PARKING_PER_DAY,
    waitingRoomNote: ARENA_WAITING_ROOM_NOTE,
    sideFacilities: ARENA_SIDE_FACILITIES,
    seatingType: "지정 좌석형",
    stageType: "엔드스테이지",
    includedItems: ARENA_INCLUDED_ITEMS,
  },
  {
    id: 2,
    venueId: "arena",
    name: "패키지 2",
    tagline: "확장된 홍보 효과가 필요한 중대형 공연을 위한 패키지",
    audienceTier: { min: 12_001, max: 15_000, label: "~15,000석 규모" },
    baseFeePerWeek: 548_000_000, // [확정 2026-08-14] 패키지 요금표 시트
    bowlFee: 120_000_000, // [패키지 구성 산정표] 1.5만명 x 2회 x 4,000원/인
    includedWeeks: 1,
    mediaTier: "BASIC",
    discountRatio: 0,
    setupExtraDayFee: 46_790_000, // [확정 2026-08-14]
    performanceExtraDayFee: 166_800_000, // [확정 2026-08-14]
    dayBreakdown: "준비 4일 + 공연 2일",
    defaultPerformanceDays: 2,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: true,
    parkingPerDay: ARENA_PARKING_PER_DAY,
    waitingRoomNote: ARENA_WAITING_ROOM_NOTE,
    sideFacilities: ARENA_SIDE_FACILITIES,
    seatingType: "지정석 + 스탠딩",
    stageType: "엔드스테이지",
    includedItems: ARENA_INCLUDED_ITEMS,
  },
  {
    id: 3,
    venueId: "arena",
    name: "패키지 3",
    tagline: "대형 스탠딩 공연을 위한 풀프로덕션 패키지",
    audienceTier: { min: 15_001, max: 18_000, label: "~18,000석 규모" },
    baseFeePerWeek: 613_000_000, // [확정 2026-08-14] 패키지 요금표 시트
    bowlFee: 180_000_000, // [패키지 구성 산정표] 1.8만명 x 2회 x 5,000원/인
    includedWeeks: 1,
    mediaTier: "EXTENDED",
    discountRatio: 0,
    setupExtraDayFee: 46_790_000, // [확정 2026-08-14]
    performanceExtraDayFee: 196_800_000, // [확정 2026-08-14]
    dayBreakdown: "준비 4일 + 공연 2일",
    defaultPerformanceDays: 2,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: true,
    parkingPerDay: ARENA_PARKING_PER_DAY,
    waitingRoomNote: ARENA_WAITING_ROOM_NOTE,
    sideFacilities: ARENA_SIDE_FACILITIES,
    seatingType: "스탠딩",
    stageType: "센터스테이지",
    includedItems: ARENA_INCLUDED_ITEMS,
  },
  {
    id: 4,
    venueId: "arena",
    name: "패키지 4",
    tagline: "최대 규모 공연을 위한 프리미엄 올인원 패키지",
    audienceTier: { min: 18_001, max: 99_999, label: "20,000석+ 규모" },
    baseFeePerWeek: 660_000_000, // [확정 2026-08-14] 패키지 요금표 시트
    bowlFee: 220_000_000, // [패키지 구성 산정표] 2.2만명 x 2회 x 5,000원/인
    includedWeeks: 1,
    mediaTier: "FULL",
    discountRatio: 0,
    setupExtraDayFee: 46_790_000, // [확정 2026-08-14]
    performanceExtraDayFee: 216_800_000, // [확정 2026-08-14]
    dayBreakdown: "준비 4일 + 공연 2일",
    defaultPerformanceDays: 2,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: true,
    parkingPerDay: ARENA_PARKING_PER_DAY,
    waitingRoomNote: ARENA_WAITING_ROOM_NOTE,
    sideFacilities: ARENA_SIDE_FACILITIES,
    seatingType: "스탠딩",
    stageType: "센터스테이지",
    includedItems: ARENA_INCLUDED_ITEMS,
  },
  {
    id: 5,
    venueId: "medium-hall",
    name: "중형공연장 패키지",
    tagline: "약 2,000석 규모의 중형 공연·행사를 위한 기본 패키지",
    audienceTier: { min: 0, max: 2_000, label: "~2,000석 규모" },
    baseFeePerWeek: 15_000_000,
    bowlFee: 0, // 중형공연장은 Bowl 사용료 개념 없음
    includedWeeks: 1,
    mediaTier: null,
    discountRatio: 0,
    // [미확정, 플레이스홀더] 중형공연장은 아레나와 요금 체계 자체가 다른 일 단위 요금제(DAILY)로
    // 교체될 예정(2-50) — 확정 전까지 옛 extraWeekRatio 환산값을 그대로 사용한다.
    setupExtraDayFee: 1_500_000,
    performanceExtraDayFee: 1_500_000,
    dayBreakdown: "준비 2일 + 공연 1일",
    defaultPerformanceDays: 1,
    rentalHours: "09:00 ~ 22:00",
    outdoorPlazaIncluded: false,
    parkingPerDay: "50대/일",
    waitingRoomNote: "지상 2실",
    sideFacilities: "운영관리실",
    seatingType: "지정 좌석형",
    stageType: "엔드스테이지",
    includedItems: [
      { addonId: "waiting_room", quantity: 2 },
      { addonId: "intercom_wireless", quantity: 4 },
    ],
  },
];

export const SEED_ADDONS: AddonItem[] = [
  { id: "late_night_slot", category: "SCHEDULE", name: "심야 추가대관", pricingType: "PER_HOUR", unitPrice: 2_000_000, unitLabel: "원/시간", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE", note: "특정 월요일·시간 선택 필요" },
  { id: "extra_slot", category: "SCHEDULE", name: "일반 추가대관", pricingType: "PER_HOUR", unitPrice: 1_000_000, unitLabel: "원/시간", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "cleaning", category: "SERVICE", name: "청소비", pricingType: "PER_PERSON", unitPrice: 1_000, unitLabel: "원/인", availability: { mode: "ALWAYS" }, autoQuantity: "AUDIENCE", billingPhase: "ESTIMATE", visibility: "VISIBLE", note: "예상 관객수 자동 산출" },
  { id: "meal", category: "SERVICE", name: "식사비", pricingType: "PER_MEAL", unitPrice: 12_000, unitLabel: "원/식", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "artist_meal", category: "SERVICE", name: "아티스트 식사", pricingType: "PER_MEAL", unitPrice: 30_000, unitLabel: "원/식", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "catering", category: "SERVICE", name: "케이터링", pricingType: "PER_MEAL", unitPrice: 25_000, unitLabel: "원/식", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "retractable_seat", category: "FACILITY", name: "수납식 객석 사용료", pricingType: "PER_SECTION", unitPrice: 3_000_000, unitLabel: "원/섹션", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  // [신규 2026-08-19, 패키지 구성 산정표] 야외광장·티켓박스·주차·하역시설·부속공간 — 예전에는
  // pkg.outdoorPlazaIncluded/parkingPerDay/sideFacilities 같은 순수 설명 문자열로만 있어서
  // "기본 구성" 그리드에 항목으로 잡히지도, 관리자가 단가를 편집할 수도 없었다. 이제 다른
  // 기본 포함 항목과 동일하게 addon으로 등록하고 visibility="ITEM_ONLY"(항목명만 노출,
  // 단가·금액은 감춤)로 표시한다 — 별도로 초과 구매하는 개념이 없는 항목들이라 availability는
  // ALWAYS로 두되 StepConfigOptions의 "선택 옵션" 목록에서는 ITEM_ONLY를 걸러 제외한다.
  { id: "outdoor_plaza", category: "SPACE", name: "야외광장", pricingType: "PER_DAY", unitPrice: 10_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "ITEM_ONLY" },
  { id: "ticket_box", category: "SPACE", name: "티켓박스", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "ITEM_ONLY" },
  { id: "parking", category: "SPACE", name: "주차", pricingType: "PER_DAY", unitPrice: 72_000, unitLabel: "원/대", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "ITEM_ONLY", note: "6일 기준 총액 환산 단가" },
  { id: "loading_dock", category: "SPACE", name: "하역시설", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "ITEM_ONLY" },
  { id: "side_facility", category: "SPACE", name: "부속공간", pricingType: "PER_DAY", unitPrice: 4_200_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "ITEM_ONLY", note: "7개실 기준" },
  { id: "waiting_room", category: "SPACE", name: "대기실", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE", note: "패키지 기본 포함분 초과 시 과금" },
  { id: "practice_room", category: "SPACE", name: "연습실", pricingType: "PER_DAY", unitPrice: 800_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "multi_room", category: "SPACE", name: "다목적실", pricingType: "PER_DAY", unitPrice: 700_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "recording_room", category: "SPACE", name: "녹음실", pricingType: "PER_DAY", unitPrice: 1_500_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "simulation_room", category: "SPACE", name: "시뮬레이션룸", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "press_room", category: "SPACE", name: "프레스룸", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "skybox", category: "PREMIUM", name: "스카이박스", pricingType: "PER_ROOM", unitPrice: 3_000_000, unitLabel: "원/실", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  // [개정 2026-08-19] 패키지 구성 산정표 — 트러스(센터) 5종 합산이 6일 기준 63,000,000원
  // (일당 10,500,000원)으로 확정됨. 세부 5종 개별 단가는 산정표에 없어, 기존 비율(3.0:2.5:2.0:2.5:2.5)을
  // 유지한 채 합계만 10,500,000원/일에 맞춰 비례 축소했다 — 개별 단가가 확정되면 교체 필요.
  { id: "mother_truss_a", category: "PRODUCTION", name: "마더트러스 A 추가", pricingType: "PER_DAY", unitPrice: 2_520_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE", note: "선택 패키지 불포함 시에만 선택 가능" },
  { id: "mother_truss_b", category: "PRODUCTION", name: "마더트러스 B 추가", pricingType: "PER_DAY", unitPrice: 2_100_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "mother_truss_c", category: "PRODUCTION", name: "마더트러스 C 추가", pricingType: "PER_DAY", unitPrice: 1_680_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "mother_truss_l", category: "PRODUCTION", name: "마더트러스 L 추가", pricingType: "PER_DAY", unitPrice: 2_100_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "mother_truss_r", category: "PRODUCTION", name: "마더트러스 R 추가", pricingType: "PER_DAY", unitPrice: 2_100_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "reduction_curtain", category: "PRODUCTION", name: "리덕션 커튼", pricingType: "PER_DAY", unitPrice: 1_500_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "center_lift", category: "PRODUCTION", name: "센터리프트", pricingType: "PER_DAY", unitPrice: 4_000_000, unitLabel: "원/일", availability: { mode: "IF_NOT_INCLUDED" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  // [개정 2026-08-14, 부록A] IF_PACKAGE_IN(패키지별 차등 노출) 규칙 폐기 — 전 패키지 공통 노출(ALWAYS).
  { id: "smart_stage", category: "PRODUCTION", name: "스마트스테이지", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "follow_spot", category: "PRODUCTION", name: "팔로우 스팟", pricingType: "PER_DAY", unitPrice: 500_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "stair_led", category: "PRODUCTION", name: "계단 LED", pricingType: "PER_DAY", unitPrice: 800_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "intercom_wireless", category: "PRODUCTION", name: "무선 인터컴", pricingType: "PER_DAY", unitPrice: 300_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "intercom_wired", category: "PRODUCTION", name: "유선 인터컴", pricingType: "PER_DAY", unitPrice: 200_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "production_power", category: "PRODUCTION", name: "프로덕션 전기", pricingType: "PER_DAY", unitPrice: 500_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE", note: "준비일·공연일 기본 제공" },
  { id: "delay_speaker", category: "PRODUCTION", name: "딜레이 스피커", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE", note: "공연일 기본 제공" },
  { id: "online_streaming_fee", category: "FEE", name: "온라인 송출 수수료", pricingType: "REVENUE_PERCENT", unitPrice: 5, unitLabel: "매출 %", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "util_electricity", category: "UTILITY", name: "일반전기", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", visibility: "VISIBLE", note: "실사용 부과" },
  { id: "util_water", category: "UTILITY", name: "상하수도", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", visibility: "VISIBLE", note: "실사용 부과" },
  { id: "util_heating", category: "UTILITY", name: "난방비", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", visibility: "VISIBLE", note: "실사용 부과" },
  { id: "util_cooling", category: "UTILITY", name: "냉방비", pricingType: "METERED", unitPrice: 0, unitLabel: "실사용 정산", availability: { mode: "ALWAYS" }, billingPhase: "SETTLEMENT", visibility: "VISIBLE", note: "실사용 부과" },
  // [신규 2026-08-14, 기능정의서 2-48] 아레나 유틸리티(필수) — 전 패키지 동일 금액, 견적에 자동
  // 산입되지만 신청자 화면에는 항목 자체가 드러나지 않는다(HIDDEN). 3항목 합계 61,000,000원.
  { id: "arena_utility_power_water", category: "UTILITY", name: "수도광열비", pricingType: "FIXED_PER_WEEK", unitPrice: 20_000_000, unitLabel: "원/6일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "HIDDEN", note: "대관 시 필수 사용 항목 · 전 패키지 동일" },
  { id: "arena_utility_same_day_teardown", category: "UTILITY", name: "당일 철수 (21~24시)", pricingType: "FIXED_PER_WEEK", unitPrice: 14_000_000, unitLabel: "원/6일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "HIDDEN", note: "350만원/시간 × 4시간 · 전 패키지 동일" },
  { id: "arena_utility_overnight_teardown", category: "UTILITY", name: "익일 철야 (24~06시)", pricingType: "FIXED_PER_WEEK", unitPrice: 27_000_000, unitLabel: "원/6일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "HIDDEN", note: "450만원/시간 × 6시간 · 전 패키지 동일" },
  { id: "media_basic", category: "PROMOTION", name: "디지털 매체 (A세트)", pricingType: "PER_DAY", unitPrice: 2_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [2] }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "media_extended", category: "PROMOTION", name: "디지털 매체 (B세트)", pricingType: "PER_DAY", unitPrice: 4_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [3] }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "media_full", category: "PROMOTION", name: "디지털 매체 (C세트)", pricingType: "PER_DAY", unitPrice: 6_000_000, unitLabel: "원/일", availability: { mode: "IF_PACKAGE_IN", packages: [4] }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "outdoor_streetlight", category: "PROMOTION", name: "옥외광고 (가로등 배너)", pricingType: "PER_DAY", unitPrice: 500_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "outdoor_xbanner", category: "PROMOTION", name: "옥외광고 (엑스배너)", pricingType: "PER_DAY", unitPrice: 300_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
  { id: "outdoor_wrapping", category: "PROMOTION", name: "옥외광고 (래핑)", pricingType: "PER_DAY", unitPrice: 1_000_000, unitLabel: "원/일", availability: { mode: "ALWAYS" }, billingPhase: "ESTIMATE", visibility: "VISIBLE" },
];

// 초과 주차 단가는 아직 미확정 항목(명세서 4.3)이라, 패키지 기본 대관료의 60%를 임시 비율로 둔다.
export const SEED_EXTRA_WEEK_RATIO = 0.6;

// 화~일 6일 중 미사용 요일 1일당 할인 비율. 6일 중 1일 = 약 16.7%를 임시 비율로 둔다.
export const SEED_DAY_EXCLUSION_DISCOUNT_RATIO = 1 / 6;

export function buildSeedRateTable(): RateTable {
  return {
    version: SEED_RATE_TABLE_VERSION,
    vatRate: 0.1,
    extraWeekRatio: SEED_EXTRA_WEEK_RATIO,
    dayExclusionDiscountRatio: SEED_DAY_EXCLUSION_DISCOUNT_RATIO,
    packages: SEED_PACKAGES,
    addons: SEED_ADDONS,
    updatedAt: new Date(0).toISOString(),
  };
}
