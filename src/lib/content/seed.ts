import type { GuideContent, HomeContent, VenueContent } from "./types";

export const DEFAULT_HOME_CONTENT: HomeContent = {
  heroImage: null,
  heroEyebrow: "HOST IT.",
  heroTitle: "Your Vision.\nOur Stage.",
  heroSubtitle:
    "서울아레나는 K-컬처와 기술을 융합해, 경험하지 못한 새로운 경험을 창조하는 공연 문화 플랫폼입니다.\n세계 최고 수준의 음향·리깅·무대 시스템이 당신의 비전을 가장 온전하게 담아냅니다.",
  heroPrimaryLabel: "Apply Now",
  heroPrimaryHref: "/apply",
  heroSecondaryLabel: "About Seoul Arena",
  heroSecondaryHref: "/venue",
  missionLabel: "MISSION",
  mission:
    "지역 주민과 전 세계 관객 모두가 혁신적이고 몰입적인 문화 체험을 할 수 있도록, K-컬처와 첨단 기술을 융합한 복합 예술 공간을 제공합니다.",
  visionLabel: "VISION",
  vision:
    "K-팝을 비롯한 한국의 대중문화와 미래형 기술로 세계와 소통하며, 지역 사회를 활성화하고 글로벌 무대에서 새로운 문화를 선도하는 공간으로 성장해 나갑니다.",
  featuresLabel: "STRATEGY",
  featuresTitle: "서울아레나의 방향성",
  features: [
    {
      title: "K-컬처 × 첨단기술",
      desc: "한국의 대중문화와 AR·VR·AI를 결합한 몰입형 문화 공간입니다.",
      href: "/venue#stage-features",
      image: null,
    },
    {
      title: "글로벌 문화 허브",
      desc: "전 세계 관광객과 팬을 잇는 글로벌 문화 명소로 도약합니다.",
      href: "/venue",
      image: null,
    },
    {
      title: "몰입형 시청각 인프라",
      desc: "글로벌 스탠다드 이상의 사운드와 무대 연출 환경을 갖췄습니다.",
      href: "/venue#specs",
      image: null,
    },
    {
      title: "지역사회와의 상생",
      desc: "도봉·노원 지역과 함께 성장하는 문화 허브가 됩니다.",
      href: "/venue",
      image: null,
    },
  ],
  processLabel: "APPLICATION PROCESS",
  processTitle: "신청 절차 안내",
  processSteps: [
    {
      no: "01",
      title: "규모에 맞는 패키지 선택",
      desc: "예상 관객 규모를 입력하면 가장 적합한 패키지가 자동으로 추천됩니다.",
    },
    {
      no: "02",
      title: "구성과 예상 대관료 확인",
      desc: "패키지 포함 사항과 추가 옵션을 반영한 예상 대관료를 한눈에 확인합니다.",
    },
    {
      no: "03",
      title: "신청서 제출",
      desc: "입력한 내용으로 대관 신청서를 접수합니다.",
    },
    {
      no: "04",
      title: "심사",
      desc: "운영자가 일정·공연 내용·시설 적합성 등을 종합적으로 검토합니다.",
    },
    {
      no: "05",
      title: "결과 안내",
      desc: "승인·보류·거절 결과를 알림으로 안내해 드립니다.",
    },
  ],
};

export const DEFAULT_VENUE_CONTENT: VenueContent = {
  intro:
    "서울아레나는 대한민국 최초의 K-POP 전문 아레나입니다. 공연 제작과 관객 경험을 중심으로 설계된 메인 아레나와 중형공연장, 컨벤션 시설을 하나의 복합 문화공간으로 운영하며, 공연·전시·컨벤션·기업행사 등 다양한 형태의 이벤트를 개최할 수 있습니다. 국내외 공연기획사와 아티스트에게 안정적인 공연 환경을, 관객에게는 수준 높은 문화 경험을 제공하는 것을 목표로 합니다.",
  overviewIntro:
    "서울아레나는 메인 아레나·중형공연장·컨벤션으로 구성된 복합 공연문화시설입니다. 공연의 규모와 목적에 따라 다양한 공간을 선택하여 운영할 수 있으며, 각 시설은 독립적인 운영은 물론 행사 특성에 따라 연계 사용도 가능합니다.",
  halls: [
    {
      no: "01",
      title: "메인 아레나",
      titleEn: "Arena",
      stat: "최대 약 20,000명 수용",
      desc: "국내외 대형 콘서트와 라이브 공연을 위한 전문 공연장. 공연 연출에 따라 다양한 좌석 배치와 무대 구성이 가능하며, 최신 무대·음향·조명·반입반출 시스템을 갖춰 투어 공연은 물론 대규모 시상식, 방송 행사, 기업 이벤트까지 폭넓게 운영합니다.",
      image: null,
    },
    {
      no: "02",
      title: "중형공연장",
      titleEn: "Medium Hall",
      stat: "약 2,000석 규모",
      desc: "콘서트, 뮤지컬, 팬미팅, 쇼케이스, 기업행사 등 중형 규모 콘텐츠에 적합한 공연장. 관객과 아티스트 간 높은 몰입감을 제공하는 공간으로, 공연 특성에 맞는 유연한 운영이 가능합니다.",
      image: null,
    },
    {
      no: "03",
      title: "컨벤션 시설",
      titleEn: "Convention",
      stat: "MICE 복합 운영",
      desc: "회의, 전시, 세미나, 브랜드 행사, 기업 프로모션 등 다양한 MICE 행사를 운영할 수 있는 공간. 공연과 연계한 기자간담회, VIP 리셉션, 팬 이벤트 등 복합 프로그램 운영에도 활용할 수 있습니다.",
      image: null,
    },
  ],
  features: [
    "메인 아레나·중형공연장·컨벤션으로 구성된 복합 문화시설",
    "공연 규모와 행사 목적에 따른 다양한 공간 선택 가능",
    "공연 및 행사 간 연계 운영 가능",
    "공연 제작과 관객 동선을 고려한 시설 구성",
    "최신 공연 운영 환경을 고려한 전문 공연 인프라",
  ],
  specsIntro:
    "공연 규모와 목적에 따라 적합한 공연장을 선택하여 운영할 수 있습니다. 상세 기술자료는 Technical Package를 통해 확인하실 수 있습니다.",
  specs: [
    {
      name: "메인 아레나",
      rows: [
        ["공연장 형태", "실내 아레나"],
        ["최대 수용인원", "약 20,000석"],
        ["공연 가능 형태", "콘서트, 시상식, 팬미팅, 방송행사, 기업행사 등"],
        ["좌석 운영", "공연 형태에 따라 가변 운영"],
        ["무대 구성", "공연 연출에 따른 다양한 무대 구성 가능"],
        ["반입·반출", "대형 공연 제작을 위한 전용 Loading Dock 및 반입·반출 시스템 운영"],
        ["운영 공간", "FOH 및 BOH 운영시설 제공"],
      ],
      image: null,
    },
    {
      name: "중형공연장",
      rows: [
        ["공연장 형태", "실내 공연장"],
        ["최대 수용인원", "약 2,000석"],
        ["공연 가능 형태", "콘서트, 팬미팅, 쇼케이스, 뮤지컬, 기업행사 등"],
        ["좌석 운영", "공연 특성에 따라 운영 가능"],
        ["무대 구성", "다양한 공연 형태에 대응 가능한 무대 운영"],
        ["운영 공간", "FOH 및 BOH 운영시설 제공"],
      ],
      image: null,
    },
  ],
  specHighlights: [
    {
      badges: ["ARTIST", "AUDIENCE", "PRODUCER"],
      highlightBadge: "AUDIENCE",
      title: "음악 공연 전문 인프라",
      subtitle: "전 좌석 최고 품질의 사운드와 시야 확보, 한계없는 공연 연출 구현",
      cards: [
        {
          title: "글로벌 TOP 수준 음향 설계",
          desc: "내부 마감재·구조 설계·음향 시뮬레이션으로 잔향과 에코를 최소화(잔향시간 2.8초, 글로벌 평균 3.2초 대비 우수)했으며, 전체 관객석에 고른 음향 분포도를 확보했습니다.",
          image: null,
        },
        {
          title: "객석 시야거리 최단 개선",
          desc: "'C' Value 평균값 208.94로 어느 위치에서도 무대 시야가 확보되며, End-Stage 기준 무대·객석 후미 간 거리 최대 90m(고척스카이돔 150m, 인스파이어 아레나 75m)로 친밀한 공간감을 구현했습니다.",
          image: null,
        },
        {
          title: "IT 기술 접목 인프라",
          desc: "AR, VR, AI 기반 공연 연출 가능",
          image: null,
        },
        {
          title: "글로벌 최초 객석 인터렉티브 조명",
          desc: "",
          image: null,
        },
        {
          title: "가변형 무대 시스템",
          desc: "스마트 자동 이송/리프팅",
          image: null,
        },
      ],
    },
    {
      badges: ["ARTIST", "AUDIENCE", "PRODUCER"],
      highlightBadge: "PRODUCER",
      title: "제작 효율화",
      subtitle: "최첨단 제작 인프라 도입, 초대형 규모 및 최첨단 기술 접목 가능",
      cards: [
        {
          title: "최첨단 리깅 인프라",
          desc: "플로어 전 영역을 커버하는 마더트러스 기반 자동하강(윈치·호이스트) 시스템으로 대형 구조물 설치 시간을 반나절 이상 단축합니다.",
          image: null,
        },
        {
          title: "초대형 세트 반입 가능",
          desc: "플로어 직진입형 Truck Dock(9.9m x 4.5m, 40ft 컨테이너 진입 가능)과 604㎡ 규모 실내 하역 공간으로 기상 영향 없이 안정적으로 상하차·적재할 수 있습니다.",
          image: null,
        },
        {
          title: "180톤 이상 국내 최대 상부 하중",
          desc: '플라잉·회전·다중 세트 등 고난도 연출 무제한 확장성 (사례) 태민 "Metamorph" 360° 회전 무대',
          image: null,
        },
        {
          title: "부대 제작·운영 편의 시설",
          desc: "대기실·연습실 포함 총 40개실 이상의 운영 부속 공간과 프레스룸·녹음실·회의실·스탭식당 등 공연 준비부터 운영까지 전 단계를 지원하는 시설을 갖췄습니다.",
          image: null,
        },
        {
          title: "압도적 전력 인프라",
          desc: "대규모 공연·특수효과를 위한 안정적 전력 공급",
          image: null,
        },
      ],
    },
    {
      badges: ["ARTIST", "AUDIENCE", "PRODUCER"],
      highlightBadge: "ARTIST",
      title: "연출 다각화 인프라",
      subtitle: "무대·연출·관객 경험을 유기적으로 연결하는 통합 연출 플랫폼",
      cards: [
        {
          title: "이동식 스마트 스테이지",
          desc: "자동 이송 무대 시스템을 통해 아티스트가 관객과 직접 소통하는 연출을 구현합니다.",
          image: null,
        },
        {
          title: "센터 리프트",
          desc: "무대 중앙 등퇴장 연출을 지원하며, 대기실과 인접한 지하 동선으로 이동 전환을 최소화합니다.",
          image: null,
        },
        {
          title: "객석 연동형 LED",
          desc: "실시간 인터랙티브 객석 LED와 응원봉 연동으로 공연장 전체를 하나의 비주얼 캔버스로 확장합니다.",
          image: null,
        },
        {
          title: "온·오프라인 통합 송출",
          desc: "멀티캠·라이브 편집이 가능한 방송급 신호 체계로 고화질 중계와 글로벌 실시간 스트리밍을 지원합니다.",
          image: null,
        },
      ],
    },
    {
      badges: ["ARTIST", "AUDIENCE", "PRODUCER"],
      highlightBadge: "PRODUCER",
      title: "다양한 형태 및 규모의 공간 활용",
      subtitle: "다양한 프로그램을 동시에 안정적으로 운영할 수 있는 실내·외 복합 스테이지/이벤트 공간 구조",
      cards: [
        {
          title: "아레나",
          desc: "메인 스테이지, 다중 무대 등 대규모 공연 이벤트를 수용할 수 있는 공간입니다.",
          image: null,
        },
        {
          title: "중형공연장",
          desc: "서브 스테이지, 음악 컨퍼런스 등 소~중규모 공연 이벤트를 수용할 수 있는 공간입니다.",
          image: null,
        },
        {
          title: "상업시설·야외광장",
          desc: "스폰서/이벤트 부스, MD판매, 팝업, 전시 등 관객 참여형 이벤트를 수용할 수 있는 공간입니다.",
          image: null,
        },
      ],
    },
    {
      badges: ["ARTIST", "AUDIENCE", "PRODUCER"],
      highlightBadge: "PRODUCER",
      title: "연출·제작·현장운영·미디어 인프라",
      subtitle: "콘텐츠별 특성에 맞춰 대규모 연출·다중 중계·운영 프로세스를 리스크 없이 수행하는 기술, 운영 인프라",
      cards: [
        {
          title: "대형 프로덕션 기술 지원",
          desc: "다중 무대·대형세트·리프트 전환 등 어워드급 연출을 실현할 수 있는 무대 기술을 지원합니다.",
          image: null,
        },
        {
          title: "중계 인프라",
          desc: "무대와 인접한 중계 시스템(접근성), 신호 직접 연결 구조(안정성), 다양한 포맷과 호환되는 표준화 인프라(범용성)를 갖췄습니다.",
          image: null,
        },
        {
          title: "연출 확장 플랫폼",
          desc: "대형 플라잉·특수 연출을 자유롭게 구현할 수 있는 기술 플랫폼입니다.",
          image: null,
        },
        {
          title: "모듈형 백스테이지 허브",
          desc: "대기실·연습실을 모듈형으로 구성해 필요 시 분리·확장하고, 식당·사무실·프레스룸 등과 연계해 페스티벌 운영을 극대화합니다.",
          image: null,
        },
      ],
    },
  ],
  providedFacilities: [
    "공연 무대 시스템",
    "공연 조명 시스템",
    "공연 음향 시스템",
    "Rigging 및 기계설비",
    "Loading Dock",
    "Freight Elevator",
    "Production Office",
    "Dressing Room",
    "Green Room",
    "FOH Control Position",
    "전력 및 통신 인프라",
    "운영지원 공간",
  ],
  arenaAmenities: [
    { name: "프로덕션 오피스 (Production Office)", desc: "공연 제작 및 운영 스태프 업무공간", image: null },
    { name: "VIP 라운지", desc: "VIP·관계자 전용 휴게 공간 (수량·규모 추후 확정 예정)", image: null },
    { name: "스카이박스 (Sky Box)", desc: "프리미엄 관람석 겸 프라이빗 라운지 (좌석 수 추후 확정 예정)", image: null },
    { name: "라운지", desc: "관객·참석자를 위한 휴게 공간 (규모 추후 확정 예정)", image: null },
    { name: "광장", desc: "야외 이벤트·팬 행사 등에 활용 가능한 옥외 공용 공간", image: null },
    { name: "로비", desc: "출입구 연계 메인 로비 및 안내 공간", image: null },
    {
      name: "프레스룸",
      desc: "기자간담회·인터뷰 등에 활용하며, 애프터파티 공간으로도 가변 운영이 가능합니다.",
      image: null,
    },
    { name: "대기실 (Dressing Room)", desc: "출연진 분장 및 대기 공간 (수량: 추후 확정 예정)", image: null },
    { name: "그린룸 (Green Room)", desc: "출연진 휴게 공간 (수량: 추후 확정 예정)", image: null },
    { name: "샤워실 (Shower Room)", desc: "총 18개소 (공용 12개소, 대기실 내부 6개소)", image: null },
    { name: "의무실 (Medical Room)", desc: "최대 3개소 운영 가능", image: null },
    { name: "하역장 (Loading Dock)", desc: "대형 공연장비 반입·반출 전용", image: null },
    { name: "화물용 엘리베이터 (Freight Elevator)", desc: "공연 장비 운반 전용", image: null },
    { name: "FOH 컨트롤 포지션", desc: "음향·조명·영상 운영 공간", image: null },
    { name: "관계자 주차 (Production Parking)", desc: "최대 200대 제공 (패키지별 상이)", image: null },
    { name: "대형·중형버스 주차", desc: "대형버스 최대 7대 / 중형버스 최대 5대", image: null },
    { name: "휠체어석", desc: "20석 (동반석 20석 별도)", image: null },
    { name: "화장실 및 장애인 화장실", desc: "전층 운영", image: null },
    { name: "운영지원 공간 (BOH Support Area)", desc: "", image: null },
  ],
  mediumHallAmenities: [
    { name: "프로덕션 오피스 (Production Office)", desc: "", image: null },
    { name: "대기실 (Dressing Room)", desc: "수량 추후 확정 예정", image: null },
    { name: "그린룸 (Green Room)", desc: "수량 추후 확정 예정", image: null },
    { name: "의무실 (Medical Room)", desc: "2개소", image: null },
    { name: "하역장 (Loading Dock)", desc: "공연 장비 반입·반출 전용", image: null },
    { name: "화물용 엘리베이터 (Freight Elevator)", desc: "", image: null },
    { name: "FOH 컨트롤 포지션", desc: "", image: null },
    { name: "관계자 주차 (Production Parking)", desc: "제공 대수 추후 확정 예정", image: null },
    { name: "휠체어석", desc: "총 20석 (1층 6석, 2층 14석 / 동반석 별도)", image: null },
    { name: "화장실 및 장애인 화장실", desc: "전층 운영", image: null },
    { name: "운영지원 공간 (BOH Support Area)", desc: "", image: null },
  ],
  amenityGallery: [],
  keyMaps: [],
};

export const DEFAULT_GUIDE_CONTENT: GuideContent = {
  intro:
    "서울아레나의 대관은 대관 신청부터 계약, 공연 준비, 공연 운영, 사후 정산까지 단계별 절차에 따라 진행됩니다. 원활한 공연 준비를 위해 각 단계별 제출서류 및 진행 일정을 반드시 확인하시기 바랍니다.",
  steps: [
    { no: "01", title: "회원가입 및 로그인", desc: "대관 신청을 위해서는 대관시스템 회원가입 및 로그인이 필요합니다. 신청자(대관사) 계정은 운영자 승인 후 이용할 수 있습니다." },
    { no: "02", title: "대관안내 확인", desc: "대관규약, 대관료, 대관 가능 일정 및 관련 안내사항을 확인합니다." },
    { no: "03", title: "대관 신청", desc: "공연 정보와 희망 대관일정을 입력하고 필요한 서류를 첨부하여 온라인으로 신청합니다." },
    { no: "04", title: "대관 심사", desc: "신청된 공연의 일정, 공연 내용, 시설 적합성 등을 종합적으로 검토하여 대관 가능 여부를 심사합니다. 필요한 경우 추가 자료 제출을 요청할 수 있습니다." },
    { no: "05", title: "승인 및 계약", desc: "대관 승인이 완료되면 계약을 체결하고 계약금 납부를 진행합니다. 계약이 완료되어야 대관이 확정됩니다." },
    { no: "06", title: "공연 준비", desc: "공연계획서, 기술자료, 운영계획, 홍보물, 안전관리계획 등 공연 운영에 필요한 자료를 제출하고 관계 부서와 협의를 진행합니다." },
    { no: "07", title: "공연 운영", desc: "공연장 반입, 설치, 리허설, 공연 진행 및 철수까지 공연 운영이 진행됩니다." },
    { no: "08", title: "사후 정산", desc: "추가 사용료 및 부대시설 이용료 등을 포함하여 최종 정산을 진행하며, 정산 완료 후 대관 절차가 종료됩니다." },
  ],
  notices: [
    "공연 일정 및 제출기한은 계약 조건에 따라 달라질 수 있습니다.",
    "제출서류가 미비한 경우 심사 또는 공연 준비 일정이 지연될 수 있습니다.",
    "공연 준비 단계에서는 공연사업팀 및 관계 부서와의 협의가 필요합니다.",
    "세부 일정은 대관 담당자의 안내에 따라 진행됩니다.",
  ],
  packageIntro:
    "서울아레나의 대관료는 객석 규모별 패키지 단위의 정찰제로 운영됩니다. 각 패키지에는 기본 대관료와 함께 대기실·프로덕션 장비 등 기본 포함 항목이 정해져 있으며, 필요한 부대시설은 항목별로 선택하여 추가할 수 있습니다.",
  packageBullets: [
    "객석 규모에 따라 4단계 패키지 중 선택하며, 패키지별 기본 대관료는 화~일 1주 기준 고정가로 운영됩니다.",
    "대기실·연습실 등 공간과 프로덕션 장비 일부는 패키지에 기본 포함되며, 초과 사용분만 추가 과금됩니다.",
    "세팅/공연 일수 조정, 청소비, 홍보 매체 등은 신청 화면에서 실시간으로 반영되어 예상 대관료를 바로 확인할 수 있습니다.",
  ],
  rulesIntro:
    "서울아레나의 대관은 「서울아레나 대관규약」에 따라 운영됩니다. 대관을 신청하는 모든 대관사는 대관규약의 내용을 충분히 숙지하고 이에 동의한 것으로 간주됩니다. 계약 체결 이후에도 대관규약은 계약의 일부로 적용되므로, 공연 준비 및 운영 전 반드시 확인하시기 바랍니다.",
};
