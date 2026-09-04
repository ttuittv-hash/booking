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

/*
  [2026-09-02] 아래 카피는 **dev(partner.dev.seoularena.net)에서 운영자가 편집해
  운영 중인 문구**를 그대로 옮긴 것이다. 이 파일의 값은 시드일 뿐이고 실제 화면은
  DB(`site_content`)를 보므로, 둘이 갈라지면 새로 띄우는 환경만 옛 문구가 나온다.
  빈 줄이 문단, 한 번의 줄바꿈은 줄바꿈이다(`Prose`).
*/
export const ABOUT_LEAD = [
  '"음악으로 사람과 세상을 연결하는 \n대한민국 최초의 공연 전문 아레나"',
  "서울아레나는 공연을 위해 설계된 아레나와 중형공연장을 중심으로, \n아티스트의 창의적인 아이디어를 완성도 높은 라이브 무대로 구현합니다.",
  "공연 제작에 최적화된 인프라와 전문적인 운영 시스템은\n아티스트와 제작진에게 안정적이고 효율적인 환경을 제공하고, \n관객에게는 무대와 객석의 경계를 넘어 공연에 온전히 몰입하는 경험을 선사합니다.",
  "공연 전후로 이어지는 다양한 문화·편의 시설은 \n공연 관람을 하나의 확장된 경험으로 완성하고, \n도시와 지역, 그리고 공연산업에 새로운 가치를 만들어갑니다.",
  "K-콘텐츠와 글로벌 아티스트, 그리고 전 세계의 팬이 만나는 곳.",
  "라이브 엔터테인먼트의 새로운 기준, 서울아레나입니다.",
].join("\n\n");

/*
  시설 개요 화면은 위 `ABOUT_LEAD` 한 덩어리를 세 조각으로 나눠 쓴다 —
  머리 인용 / 카드 세 장 / 가운데 선언 두 줄. 한 문단씩 그대로 흘리면 읽는 사람이
  어디까지가 한 가지 이야기인지 알 수 없어, 조각마다 제목을 세우고 자리를 갈랐다.
  `ABOUT_LEAD` 는 예전 저장본과의 호환을 위해 남겨 둔다.
*/

/** 머리 인용 — 화면 맨 위, 제목 바로 아래 */
export const ABOUT_QUOTE = "음악으로 사람과 세상을 연결하는\n대한민국 최초의 공연 전문 아레나";

export interface AboutCardCopy {
  title: string;
  desc: string;
}

/** 카드 세 장 — 제목은 위, 설명은 카드 아래쪽에 붙는다 */
export const ABOUT_CARDS: AboutCardCopy[] = [
  {
    title: "공연을 위해 설계된\n아레나와 중형공연장",
    desc: "아티스트의 창의적인 아이디어를\n완성도 높은 라이브 무대로 구현합니다.",
  },
  {
    title: "공연 제작에 최적화된 인프라와\n전문적인 운영 시스템",
    desc: "아티스트와 제작진에게 안정적이고 효율적인 환경을 제공하고, 관객에게는 무대와 객석의 경계를 넘어 공연에 온전히 몰입하는 경험을 선사합니다.",
  },
  {
    title: "공연 전후로 이어지는\n다양한 문화·편의 시설",
    desc: "공연 관람을 하나의 확장된 경험으로 완성하고, 도시와 지역, 그리고 공연산업에 새로운 가치를 만들어갑니다.",
  },
];

/** 가운데 선언 — 카드 다음, 사진 앞. 한 덩어리씩 가운데 정렬 */
export const ABOUT_STATEMENTS = [
  "K-콘텐츠와 글로벌 아티스트,\n그리고 전 세계의 팬이 만나는 곳.",
  "라이브 엔터테인먼트의 새로운 기준,\n서울아레나입니다.",
];

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
    eyebrow: "20,000명 이상 수용",
    image: "/images/arena.jpg",
    desc: "대규모 라이브 퍼포먼스를 위해 설계된 서울아레나의 중심 공간입니다. \n다양한 무대 구성과 관객 배치를 수용하는 유연한 공간 설계, 대형 투어 프로덕션에 대응하는 전문 제작 인프라를 기반으로 \n아티스트와 제작진의 아이디어를 보다 자유롭게 구현합니다. \n무대의 스케일과 에너지를 객석 전체로 확장해, 수만 명의 관객이 하나의 순간을 함께 경험하는 강렬한 라이브 공연을 완성합니다.",
  },
  {
    title: "중형공연장",
    eyebrow: "3,000명 이상 수용",
    image: "/images/live-hall.jpg",
    desc: "아티스트와 관객이 더욱 가까이 만나는 서울아레나의 또 하나의 라이브 공연 공간입니다. \n유연한 공강 구성과 전문 제작 인프라를 바탕으로 다양한 장르와 형태의 공연을 자유롭게 구현하고, 보다 밀도 높고 몰입감 있는 라이브 경험을 제공합니다. \n단독 공연부터 아레나와 연계한 프로그램까지, 콘텐츠의 가능성을 다양한 스케일로 확장합니다. \n아티스트와 관객의 거리는 더 가까이, 라이브의 경험은 더욱 깊게.",
  },
];

/** 시설개요 탭의 FEATURES — 번호가 붙는 5줄 */
export const COMPLEX_FEATURES: FeatureItem[] = [
  { title: "아티스트의 상상을 완성도 높은 무대로 구현하는 전문 공연 인프라", lines: [] },
  { title: "글로벌 투어와 대형 프로덕션을 안정적으로 수용하는 제작·운영 환경", lines: [] },
  { title: "공연의 규모와 연출에 따라 무대와 객석을 유연하게 구성하는 공간", lines: [] },
  { title: "공연 전후의 시간을 머무름과 발견의 경험으로 확장하는 팬 중심 공간", lines: [] },
  { title: "세계의 아티스트와 관객을 서울로 연결하고, 지역과 함께 성장하는 문화 거점", lines: [] },
];

export const COMPLEX_FEATURES_LEAD =
  "서로 다른 기능과 흐름이 만나, 하나의 완성된 경험으로 이어집니다.";

/* ----------------------------------------------- 서울아레나 › 시설 특징 --- */

/* [2026-09-02] dev 운영본으로 교체했다. 이전에는 이 자리를 우리가 채워 두었었다. */
export const WHY_LEAD = [
  "서울아레나는 공연의 크기보다, 그 공연이 가장 잘 구현되는 방식에 집중합니다.",
  "글로벌 투어와 대형 프로덕션을 위한 아레나, \n아티스트와 관객의 밀도 높은 교감을 위한 중형공연장.",
  "서로 다른 두 공간은\n콘텐츠의 규모와 장르, 연출 방식에 따라\n가장 적합한 제작 환경과 관객 경험을 제공합니다.",
  "각 공간은 독립적으로 완성도 높은 공연을 구현하는 동시에,\n필요에 따라 유기적으로 연결되어\n하나의 콘텐츠가 가진 가능성을 더욱 넓혀갑니다.",
].join("\n\n");

/**
 * 시설 특징 FEATURES — `/seoularena` 의 「시설 특징」 탭.
 * dev 운영본을 그대로 옮겼다. 항목마다 아레나·중형공연장을 한 줄씩 대비시킨다.
 * (시설 제원 `/features` 는 더 이상 이 목록을 쓰지 않는다 — 층별 구성은
 * `ARENA_FLOOR_SEATING` 이 맡는다.)
 */
export const STAGE_FEATURES: FeatureItem[] = [
  {
    title: "공연에 따라 유연하게 선택하는 두 개의 전문 공연장",
    lines: [
      "아레나｜무대와 객석 구성에 따라 1만명부터 2만명 이상 다양한 규모의 공연 수용",
      "중형공연장｜좌석형 약 2,000~2,500명, 스탠딩형 최대 약 3,500명 수용",
    ],
  },
  {
    title: "대형 프로덕션의 반입을 고려한 효율적인 동선",
    lines: [
      "아레나｜대형 화물차량이 공연장 플로어까지 직전 진입 가능한 동선과 604㎡ 규모의 실내 하역장",
      "중형공연장｜5.7m × 4.2m 규모의 대형 반입구와 적재하중 8톤·5톤의 화물용 엘리베이터 2기",
    ],
  },
  {
    title: "대규모 연출을 지원하는 리깅 시스템",
    lines: [
      "아레나｜35m 높이의 상부 공간과 180톤 하중을 지원하는 승하강 마더트러스 시스템",
      "중형공연장｜15m 높이의 상부 공간과 세트 배튼 24개, 체인 호이스트 20개 활용한 다양한 무대 구성",
    ],
  },
  {
    title: "무대 자체를 연출 요소로 활용하는 스테이지 시스템",
    lines: [
      "아레나｜전 방향 이동·회전이 가능한 스마트 스테이지와 플로어 중앙 센터 리프트",
      "중형공연장｜높이와 단차를 조절할 수 있는 적재하중 14.4톤의 스테이지 리프트 3기",
    ],
  },
  {
    title: "공연에 따라 유연하게 변화하는 객석 공간",
    lines: [
      "아레나｜최대 49m × 79.9m의 플로어와 1·3층 수납식 객석 2,004석을 활용한 무대·객석 구성",
      "중형공연장｜915.97㎡ 플로어와 2층 고정석 446석을 기반으로 좌석형·스탠딩형 등 다양한 객석 구성",
    ],
  },
  {
    title: "공연의 연출 범위를 넓히는 제작 인프라",
    lines: [
      "아레나｜글로벌 투어에 대응하는 딜레이 스피커 72대, 전 객석 계단에 설치되어 공연 연출과 연동되는 LED 시스템",
      "중형공연장｜다양한 공연 형식과 무대 구성에 대응할 수 있는 제작 설비와 전문 기술 지원 시스템",
    ],
  },
  {
    title: "각 공연장이 독립적으로 완결되는 제작·운영 구조",
    lines: [
      "아레나｜대기실·연습실을 포함한 30개 이상의 부속 공간과 대규모 프로덕션에 대응하는 제작·운영 시설",
      "중형공연장｜별도의 반입 동선과 화물용 엘리베이터, 무대설비 및 공연용 전력을 갖춘 독립 제작·운영 구조",
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

/* [2026-09-02] dev 운영본. 아레나 키포인트와 달리 이쪽은 수치가 아니라 분류다. */
export const LIVE_HALL_OVERVIEW: OverviewCard[] = [
  { label: "공연장 형태", value: "프로시니엄 공연장" },
  { label: "공연 유형", value: "콘서트 · 팬미팅 · 쇼케이스 · 기업행사" },
  { label: "객석 운영", value: "좌석형 · 스탠딩형 가변 구성" },
  { label: "무대 구성", value: "엔드 스테이지" },
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
 * 중형공연장 ADDITIONAL FACILITIES — 아레나 스펙 카드와 같은 디자인.
 *
 * **한 시설이 카드 한 장이다.** 카테고리(아티스트 공간 · 운영 · BOH 공간 · 관객 공간)로
 * 묶어 한 장에 목록을 담았더니 카드마다 줄 수가 제각각이라 격자가 무너졌고, 정작 읽어야
 * 하는 시설 이름이 목록 속 한 줄로 작아졌다. 카드는 [카테고리(라벨) / 시설명 / 부연] 이다.
 * 값이 한글이므로 서체는 국문 헤딩으로 잡힌다(`valueHeadingClass`).
 */
export const LIVE_HALL_SPEC_GROUPS: SpecCardGroupFact[] = [];

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
    title: "부대시설",
    items: [
      { label: "VIP 라운지", desc: "VIP 및 관계자 전용 휴게 공간" },
      { label: "스카이박스", desc: "공연 관람과 휴식을 위한 프라이빗 관람 공간" },
      { label: "메인 로비", desc: "입·퇴장과 안내 기능을 갖춘 관객 맞이 공간" },
      { label: "관객 라운지", desc: "관객 및 행사 참석자를 위한 휴게 공간" },
      { label: "프레스룸", desc: "기자간담회·인터뷰·미디어 운영을 위한 가변형 공간" },
      { label: "아티스트 대기실", desc: "출연진의 분장과 공연 준비를 위한 대기 공간" },
      { label: "프로덕션 오피스", desc: "제작·운영 스태프를 위한 업무 공간" },
      { label: "샤워실", desc: "총 18개소 / 공용 12개소·대기실 내부 6개소" },
      { label: "의무실", desc: "최대 3개소 운영이 가능한 응급 지원 공간" },
      { label: "야외광장", desc: "야외 이벤트·팬 행사 등에 활용 가능한 옥외 공용 공간" },
      { label: "하역장", desc: "대형 세트와 공연장비 반입·반출을 위한 전용 공간" },
      { label: "대형·중형버스 주차", desc: "대형버스 최대 7대·중형버스 최대 5대" },
    ],
  },
];

export const LIVE_HALL_FACILITY_GROUPS: FacilityGroupFact[] = [
  {
    title: "부대시설",
    items: [
      { label: "퀵체인지룸", desc: "무대 뒷편 직전 대기와 휴식이 가능한 대기 공간" },
      { label: "아티스트 대기실", desc: "출연진의 분장과 공연 준비를 위한 대기 공간" },
      { label: "의무실", desc: "2개소 운영이 가능한 응급 지원 공간" },
      { label: "하역장", desc: "공연 세트와 장비의 반입·반출을 위한 전용 공간" },
      { label: "화물용 엘리베이터", desc: "8톤급·5톤급 화물용 엘리베이터 각 1기" },
    ],
  },
];
