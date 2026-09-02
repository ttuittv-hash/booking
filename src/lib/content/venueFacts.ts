import type { FeatureItem } from "@/components/ui/kit";

/* ============================================================================
   YOUR STAGE — 화면 카피 정본

   Notion 「대관 사이트 8/20 오픈 기준 정보구조 재구성 및 페이지별 콘텐츠 전문」
   › 콘텐츠 전문 · YOUR STAGE 를 그대로 옮긴 것이다.
   문구를 임의로 다듬지 않는다 — 이 파일이 화면에 나가는 문장의 정본이다.

   서울아레나 `/seoularena` — 탭: 시설개요 / 시설 특징
   시설 소개  `/features`   — 탭: 아레나 / 중형공연장
   ========================================================================= */

/* ------------------------------------------------ 서울아레나 › 시설개요 --- */

export const ABOUT_LEAD =
  "서울아레나는 대한민국 최초의 K-POP 전문 아레나입니다. 공연 제작과 관객 경험을 중심으로 설계된 메인 아레나와 중형공연장, 컨벤션 시설을 하나의 복합 문화공간으로 운영하며, 공연·전시·컨벤션·기업행사 등 다양한 형태의 이벤트를 개최할 수 있습니다. 국내외 공연기획사와 아티스트에게 안정적인 공연 환경을, 관객에게는 수준 높은 문화 경험을 제공하는 것을 목표로 합니다.";

export interface VenueHeroCopy {
  title: string;
  eyebrow: string;
  desc: string;
  /** 전면 배경 사진. 운영자가 백오피스에서 바꿀 수 있고, 여기 값은 초기값이다 */
  image: string | null;
}

/** 전면 사진 섹션 두 개 — Figma `02 공간 안내 › Header / 5` 레이아웃 */
export const VENUE_HEROES: VenueHeroCopy[] = [
  {
    title: "아레나",
    eyebrow: "최대 22,500명",
    image: "/images/arena.jpg",
    desc: "국내외 대형 콘서트와 라이브 공연을 위한 전문 공연장. 공연 연출에 따라 다양한 좌석 배치와 무대 구성이 가능하며, 최신 무대·음향·조명·반입반출 시스템을 갖춰 투어 공연은 물론 대규모 시상식, 방송 행사, 기업 이벤트까지 폭넓게 운영합니다.",
  },
  {
    title: "중형공연장",
    eyebrow: "최대 3,500명",
    image: "/images/live-hall.jpg",
    desc: "콘서트, 뮤지컬, 팬미팅, 쇼케이스, 기업행사 등 중형 규모 콘텐츠에 적합한 공연장. 관객과 아티스트 간 높은 몰입감을 제공하는 공간으로, 공연 특성에 맞는 유연한 운영이 가능합니다.",
  },
];

/** 시설개요 탭의 FEATURES — 번호가 붙는 5줄 */
export const COMPLEX_FEATURES: FeatureItem[] = [
  { title: "메인 아레나·중형공연장·컨벤션으로 구성된 복합 문화시설", lines: [] },
  { title: "공연 규모와 행사 목적에 따른 다양한 공간 선택 가능", lines: [] },
  { title: "공연 및 행사 간 연계 운영 가능", lines: [] },
  { title: "공연 제작과 관객 동선을 고려한 시설 구성", lines: [] },
  { title: "최신 공연 운영 환경을 고려한 전문 공연 인프라", lines: [] },
];

export const COMPLEX_FEATURES_LEAD = "공연 규모와 목적이 달라도 하나의 단지 안에서 해결하세요.";

/* ----------------------------------------------- 서울아레나 › 시설 특징 --- */

/*
  Notion 에 "시설 특징 설명 문단"으로 비어 있던 자리.
  브랜드 언어가이드(Clear · Confident · Engaging / BUSINESS 레이어 = FORMAL)에 맞춰
  작성했다. 수치는 Notion 홈 선언문과 시설 특징 목록에 이미 확인된 값만 썼다.
*/
export const WHY_LEAD =
  "같은 규모의 공연장이라도 무대에서 할 수 있는 일은 상부가 무엇을 얼마나 매달 수 있는지, 짐이 어디까지 들어오는지에서 갈립니다. 서울아레나는 플로어 위 35m 그리드가 180톤을 받아 내고, 40ft 컨테이너가 9.9m × 4.5m 반입구로 플로어까지 그대로 들어옵니다. 604㎡ 실내 하역 공간은 날씨의 영향을 받지 않습니다. 연출 규모와 반입 동선을 먼저 정해 두었기 때문에, 준비는 공간을 설득하는 일이 아니라 공간을 쓰는 일에서 시작합니다.";

/**
 * 시설 특징 FEATURES — 서울아레나(시설 특징) 탭과 시설 소개(아레나) 탭이 같은 목록을 쓴다.
 * 두 화면이 같은 사실을 말하므로 문구를 복제하지 않고 이 상수를 참조한다.
 *
 * 각 항목의 첫 줄까지가 Notion 원문이고, 마지막 줄은 그 사양이 대관사에게 무엇을 뜻하는지
 * 브랜드 언어가이드에 맞춰 덧붙인 것이다. 수치는 Notion 문서에 이미 있는 값만 썼다.
 */
export const STAGE_FEATURES: FeatureItem[] = [
  {
    title: "플로어 직진입형 “Truck” Dock",
    lines: [
      "초대형 세트・장비 직반입",
      "9.9m x 4.5m 초대형 반입구 (40ft 컨테이너 진입)",
      "트럭이 플로어까지 그대로 들어오므로 지게차로 옮겨 싣는 단계가 없습니다. 반입 첫날부터 세트를 바로 세웁니다.",
    ],
  },
  {
    title: "604㎡ 규모 실내 하역·서비스 공간",
    lines: [
      "기상 영향 없는 안정적 상하차・적재 가능",
      "32m × 18m × 6m 규모가 실내에 있어 비와 눈, 기온이 반입·철수 일정을 흔들지 않습니다.",
    ],
  },
  {
    title: "마더트러스 기반 상부 설치 효율화",
    lines: [
      "플로어 전 영역 커버하는 마더 트러스",
      "자동하강(윈치・호이스트) 시스템으로 대형 구조물 설치 시간 반나절 이상 단축",
      "상부에 올라가지 않고 플로어에서 리깅을 마칩니다. 셋업 첫날 일정이 그만큼 앞당겨집니다.",
    ],
  },
  {
    title: "180톤 이상의 국내 최대 상부 하중",
    lines: [
      "플라잉・회전・다중 세트 등 고난도 연출 무제한 확장성",
      "마더트러스 5기가 활하중 180톤을 나눠 받습니다. 무대에 연출을 맞추는 대신 연출에 무대를 맞추실 수 있습니다.",
    ],
  },
  {
    title: "대형 프로덕션 수용하는 운영 인프라",
    lines: [
      "대기실, 연습실 포함 총 30개실 이상의 운영 부속 공간 보유",
      "대기실이 지하 1층과 1층으로 나뉘어 있어 출연진과 스태프 동선을 겹치지 않게 짤 수 있습니다.",
    ],
  },
  {
    title: "운영 효율을 극대화 하는 전문 지원 시설",
    lines: [
      "프레스룸, 회의실, 스탭식당 등 공연 준비・진행・운영 전 단계 지원",
      "프레스 행사와 스태프 식사를 외부로 내보내지 않고 단지 안에서 해결합니다.",
    ],
  },
  {
    title: "이동식 스마트 스테이지",
    lines: [
      "자동 이송 무대 시스템을 통해 아티스트가 관객과 직접 소통하는 연출 구현",
      "사람이 밀지 않아도 전방향으로 회전하며 주행합니다. 대당 5톤까지 싣고, 두 대를 이어 하나의 무대로 확장할 수 있습니다.",
    ],
  },
  {
    title: "센터 리프트",
    lines: [
      "센터 리프트를 통해 무대 중앙 등퇴장 연출 지원",
      "대기실과 인접한 지하 동선으로 이동 전환 최소화",
      "지하 대기홀에서 플로어 중앙까지 한 번에 올라옵니다. 등장 직전 별도 이동 동선이 필요하지 않습니다.",
    ],
  },
];

/* -------------------------------------------------- 시설 소개 › 아레나 --- */

export interface OverviewCard {
  /** eyebrow — 카드 제목 */
  label: string;
  /** 카드 본문 */
  value: string;
}

/*
  [2026-09-02 디자인 개편] 상위 4개 포인트는 "공연장 형태 / 실내 아레나" 처럼
  분류를 말하던 자리였는데, 라벨이 곧 설명이고 값이 수치인 형태로 바꿨다 —
  첫 화면에서 규모를 숫자로 먼저 보여주기 위해서다. 라벨이 길어지는 대신
  값은 짧은 수치 한 덩어리가 된다.
*/
export const ARENA_OVERVIEW: OverviewCard[] = [
  { label: "무대·객석 구성에 따른 최대 수용 인원", value: "22,500" },
  { label: "최대 49m × 79.9m 플로어", value: "3,553㎡" },
  { label: "플로어 기준 테크니컬 그리드 높이", value: "35m" },
  { label: "작업 높이까지 하강 가능한 마더트러스", value: "180t" },
];

export const LIVE_HALL_OVERVIEW: OverviewCard[] = [
  { label: "공연장 형태", value: "실내 공연장" },
  { label: "공연 가능 형태", value: "콘서트, 팬미팅, 쇼케이스, 뮤지컬, 기업행사 등" },
  { label: "좌석 운영", value: "공연 특성에 따라 운영 가능" },
  { label: "무대 구성", value: "다양한 공연 형태에 대응 가능한 무대 운영" },
];

export interface StageCapacity {
  /** 무대 배치 이름 */
  stage: string;
  /** 카드 부제 — 이 구성이 어떤 공연에 맞는지 한 줄 */
  desc: string;
  seated: string;
  standing: string;
  /** 층별 내역. `[층, 좌석, 부연]` — 부연은 생략할 수 있다 */
  floors: [string, string, string?][];
}

/*
  [2026-09-02 디자인 개편] 층별 표(Details)를 카드에서 뺐다 — 층별 내역은 아래
  FLOOR & SEATING 섹션이 한 축으로 모아 보여준다. 카드에는 배치 이름 · 한 줄 설명 ·
  SEATED / STANDING 수치만 남는다.
*/
export const ARENA_CAPACITY: StageCapacity[] = [
  {
    stage: "CENTER STAGE",
    desc: "360° 관람 구조를 활용한 최대 규모 구성",
    seated: "15,000–17,000",
    standing: "18,000–22,500",
    floors: [],
  },
  {
    stage: "END STAGE",
    desc: "대형 콘서트와 투어링 프로덕션에 적합한 대표 구성",
    seated: "10,000–13,000",
    standing: "12,000–18,000",
    floors: [],
  },
];

/**
 * 아레나 층별 구성 — FLOOR & SEATING 섹션.
 * 배치별 카드에 접혀 있던 층별 표를 한 축으로 폈다. 배치가 달라도 층 자체의
 * 물리 제원은 같으므로 배치마다 반복할 이유가 없다.
 */
export const ARENA_FLOOR_SEATING: FeatureItem[] = [
  { title: "ARENA FLOOR", lines: ["49 × 79.9m", "최대 3,553㎡", "수납식 객석 1,848석"] },
  { title: "2F FIXED SEATING", lines: ["2,950석", "휠체어석·보호자석 별도"] },
  { title: "3F FIXED SEATING", lines: ["6,431석", "수납식 객석 156석 별도"] },
  { title: "4F PREMIUM", lines: ["706석", "스카이박스 52실 포함"] },
  { title: "5F FIXED SEATING", lines: ["3,038석", "상층 고정 객석"] },
];

/**
 * 중형공연장 객석 — 아레나와 같은 카드 규격으로 맞춘다.
 * 총계(CAPACITY)와 층별 고정석(FIXED SEATS)을 카드 두 장으로 나눈다.
 * 2층·3층 합(1,524+12+446+28)이 정확히 2,010이라 총계와 내역이 맞아떨어진다.
 */
export const LIVE_HALL_CAPACITY: StageCapacity[] = [
  {
    stage: "CAPACITY",
    desc: "공연 형태에 따라 가변 운영",
    seated: "2,010석",
    standing: "최대 3,060석",
    floors: [],
  },
  {
    stage: "FIXED SEATS",
    desc: "층별 고정 객석 구성",
    seated: "",
    standing: "",
    floors: [
      ["2층", "1,524석", "장애인석 12석 별도"],
      ["3층", "446석", "장애인석 28석 별도"],
    ],
  },
];

/* ---------------------------------------------------- 스펙 카드 묶음 ----- */

/**
 * 4칼럼 스펙 카드 — [라벨 / 큰 수치 / 설명] 세 줄.
 * PRODUCTION & RIGGING · LOAD-IN & SUPPORT 처럼 "수치가 주인공인" 섹션에 쓴다.
 * 카드 안이 목록인 ADDITIONAL FACILITIES 카드와는 다른 물건이다.
 */
export interface SpecCardFact {
  label: string;
  value: string;
  desc: string;
}

export interface SpecCardGroupFact {
  title: string;
  cards: SpecCardFact[];
}

export const ARENA_SPEC_GROUPS: SpecCardGroupFact[] = [
  {
    title: "PRODUCTION & RIGGING",
    cards: [
      { label: "GRID IRON", value: "2,549㎡", desc: "테크니컬 그리드 아이언" },
      { label: "MOTHER TRUSS", value: "5 SET · 180t", desc: "작업 높이까지 하강 가능한 마더트러스" },
      { label: "SMART STAGE", value: "2 EA", desc: "전 방향 이동·회전 가능한 이동형 스테이지" },
      { label: "CENTER LIFT", value: "4.8 × 4.8m", desc: "최대 운행 높이 약 4.6m" },
      { label: "DELAY SPEAKER", value: "72 EA", desc: "대형 공연용 상설 딜레이 스피커" },
      { label: "3D FLYING POWER", value: "8 SET", desc: "상부 연출 장비 운용 전기 인프라" },
    ],
  },
  {
    title: "LOAD-IN & SUPPORT",
    cards: [
      { label: "INDOOR LOADING AREA", value: "604㎡", desc: "대형 화물차량의 플로어 직접 진입" },
      { label: "ARTIST / PRODUCTION", value: "30+ SPACES", desc: "대기실·연습실·프로덕션 오피스" },
      { label: "MEDICAL ROOM", value: "MAX. 3", desc: "공연 규모에 따라 최대 3개소" },
      { label: "SKYBOX", value: "52실", desc: "프라이빗 관람 및 호스피탈리티" },
    ],
  },
];

/**
 * 중형공연장 ADDITIONAL FACILITIES — 아레나 스펙 카드와 같은 디자인으로 맞췄다.
 * **내용은 임시값이다**(디자인 확인용). 확정 제원이 나오면 운영자 콘텐츠 관리에서
 * 갈아 끼우거나 이 상수를 고친다.
 */
export const LIVE_HALL_SPEC_GROUPS: SpecCardGroupFact[] = [
  {
    title: "ADDITIONAL FACILITIES",
    cards: [
      { label: "LOADING AREA", value: "TBD", desc: "임시 내용 — 확정 제원 반영 예정" },
      { label: "DRESSING ROOM", value: "TBD", desc: "임시 내용 — 확정 제원 반영 예정" },
      { label: "REHEARSAL ROOM", value: "TBD", desc: "임시 내용 — 확정 제원 반영 예정" },
      { label: "LOUNGE", value: "TBD", desc: "임시 내용 — 확정 제원 반영 예정" },
    ],
  },
];

/**
 * 부대시설 — **카테고리 카드**로 보여준다(Figma 2608 「additional facilities」).
 * 한 줄에 두 장(6col × 2)이고, 카드 안은 [시설명 → 부연] 목록이다.
 * 목록이 20줄 넘는 표 하나로는 어느 것이 무엇인지 읽히지 않아 묶음으로 나눈다.
 */
export interface FacilityGroupFact {
  title: string;
  items: { label: string; desc?: string }[];
}

export const ARENA_FACILITY_GROUPS: FacilityGroupFact[] = [
  {
    title: "VIP 공간",
    items: [
      { label: "VIP 라운지", desc: "VIP·관계자 전용 휴게 공간 (수량·규모 추후 확정 예정)" },
      { label: "스카이박스", desc: "프리미엄 관람석 겸 프라이빗 라운지 (좌석 수 추후 확정 예정)" },
    ],
  },
  {
    title: "관객 공간",
    items: [
      { label: "로비", desc: "출입구 연계 메인 로비 및 안내 공간" },
      { label: "라운지", desc: "관객·참석자를 위한 휴게 공간 (규모 추후 확정 예정)" },
      { label: "광장", desc: "야외 이벤트·팬 행사 등에 활용 가능한 옥외 공용 공간" },
      {
        label: "프레스룸",
        desc: "기자간담회·인터뷰 등에 활용하며, 애프터파티 공간으로도 가변 운영이 가능합니다.",
      },
      { label: "휠체어석", desc: "20석 (동반석 20석 별도)" },
      { label: "화장실 및 장애인 화장실", desc: "전층 운영" },
    ],
  },
  {
    title: "아티스트 공간",
    items: [
      { label: "아티스트 대기실", desc: "출연진 분장 및 대기 공간" },
      { label: "샤워실", desc: "총 18개소 (공용 12개소, 대기실 내부 6개소)" },
      { label: "의무실", desc: "최대 3개소 운영 가능" },
    ],
  },
  {
    title: "운영 · BOH 공간",
    items: [
      { label: "프로덕션 오피스", desc: "공연 제작 및 운영 스태프 업무공간" },
      { label: "FOH 컨트롤 포지션", desc: "음향·조명·영상 운영 공간" },
      { label: "하역장", desc: "대형 공연장비 반입·반출 전용" },
      { label: "화물용 엘리베이터", desc: "공연 장비 운반 전용" },
      { label: "관계자 주차", desc: "최대 200대 제공 (패키지별 상이)" },
      { label: "대형·중형버스 주차", desc: "대형버스 최대 7대 / 중형버스 최대 5대" },
      { label: "운영지원 공간" },
    ],
  },
];

export const LIVE_HALL_FACILITY_GROUPS: FacilityGroupFact[] = [
  {
    title: "아티스트 공간",
    items: [
      { label: "아티스트 대기실", desc: "출연진 분장 및 대기 공간 (실수 확정 후 안내)" },
      { label: "의무실", desc: "2개소" },
    ],
  },
  {
    title: "운영 · BOH 공간",
    items: [
      { label: "프로덕션 오피스" },
      { label: "FOH 컨트롤 포지션" },
      { label: "하역장" },
      { label: "화물용 엘리베이터" },
      { label: "관계자 주차", desc: "제공 대수 추후 확정 예정" },
      { label: "운영지원 공간" },
    ],
  },
  {
    title: "관객 공간",
    items: [{ label: "휠체어석", desc: "총 20석 (1층 6석, 2층 14석 / 동반석 별도)" }],
  },
];
