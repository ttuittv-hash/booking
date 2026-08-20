import type { HomeContent } from "./types";

/**
 * 홈 기본 콘텐츠.
 * 카피 기준: 카카오 브랜드 가이드라인 0.1
 *   · 3.4 브랜드 선언문 BUSINESS › HOST IT. (본문 전문을 내러티브로 사용)
 *   · 3.1 Tone of Voice — Clear / Confident / Engaging
 *   · 1.2 Brand essence: Business — LIVE MOMENTS, LIVE PLATFORM
 * 히어로 디스플레이는 Notion "(웹사이트) 대관·비즈니스 사이트 구조 기획" 후보안.
 */
export const DEFAULT_HOME_CONTENT: HomeContent = {
  heroImage: null,
  heroTitle: "BRING THE VISION,\nWE BUILD THE STAGE",
  heroSubtitle: "한계 없는 인프라 위에서\n당신만의 무대를 지휘하세요.",
  heroPrimaryLabel: "대관 신청",
  heroPrimaryHref: "/apply",
  heroSecondaryLabel: "서울아레나 알아보기",
  heroSecondaryHref: "/seoularena",
  /*
    설계 선언 — Notion `(웹사이트) 대관·비즈니스 사이트 구조 기획 › HOST IT (HOME)`.
    진입은 시설 스펙의 나열이 아니라 그 스펙이 어떤 전략에서 갖춰졌는가의 선언이다.
    **숫자는 YOUR STAGE 에서, 그 숫자의 이유는 여기에서.** 그래서 본문에 수치를 넣지 않는다.
  */
  narrativeLabel: "Manifesto",
  narrativeTitle: "LIMITLESS SPACE,\nABSOLUTE CONTROL",
  narrativeLead:
    "서울아레나는 공연을 담기 위해 처음부터 공연장으로 설계된 시설입니다. 플로어 위 35m 높이의 테크니컬 그리드가 180톤의 활하중을 받아 내고, 40ft 컨테이너가 9.9m × 4.5m 반입구로 그대로 들어와 604㎡의 실내 하역 공간에서 짐을 풉니다. 무대를 어디까지 키울 수 있는지, 짐을 어떻게 넣고 뺄지 먼저 정해 두었기 때문에 연출은 공간을 설득하는 대신 공간을 쓰는 일로 시작합니다.",
  narrativeStatements: [
    {
      title: "EVERY SEAT IS THE STAGE",
      desc: "객석은 무대를 바라보는 자리가 아니라 무대의 일부입니다. 2층·3층·5층 계단에 심은 1,267개의 STAIR LED는 DMX와 Artnet으로 조명·영상 큐에 직접 물려 객석 전체를 연출면으로 씁니다. 이 조명은 비상시 대피 유도등을 겸하며 비상발전 전원에 연결되어 있습니다. 6개 포인트에 12기씩 배치한 딜레이 스피커 72대는 최대 150dB를 내며, 무대에서 먼 좌석까지 같은 밀도의 소리를 보냅니다.",
    },
    {
      title: "NO LIMIT ON THE SHOW",
      desc: "연출 규모의 상한은 상부가 무엇을 얼마나 매달 수 있는지로 결정됩니다. 마더트러스 5기의 활하중 합계는 180톤이고(A·B 각 50톤, C 50톤, L·R 각 15톤), 그리드는 플로어에서 35m 위에 있습니다. 플로어는 메인 3톤/㎡, 서브 1.5톤/㎡를 견디며, 수납식 객석을 접으면 49m × 79.9m까지 열립니다. 무대를 줄여 연출을 맞추는 대신, 연출에 맞춰 무대를 잡으실 수 있습니다.",
    },
    {
      title: "BUILD LESS, SHOW MORE",
      desc: "준비에 드는 시간은 대부분 짐을 넣고 옮기는 데 쓰입니다. 반입구는 9.9m × 4.5m로 40ft 컨테이너가 그대로 진입하고, 32m × 18m × 6m 규모의 604㎡ 하역 공간은 실내에 있어 기상에 영향을 받지 않습니다. 화물 차량은 플로어까지 직진입할 수 있으며 25톤 크레인을 쓸 수 있습니다. 무인 자율주행으로 움직이는 스마트 스테이지 2대는 대당 최대 5톤을 싣고 전방향으로 회전·주행하며, 렌탈 제품과 연결해 확장할 수 있습니다.",
    },
    {
      title: "BEYOND THE ROOM",
      desc: "공연은 객석 문 앞에서 시작되지 않습니다. 서울아레나 단지는 아레나, 중형공연장, 복합문화컨벤션, 판매시설 네 개 시설로 구성되며, 아레나 3,835㎡와 중형공연장 1,081㎡의 야외광장을 함께 운영합니다. 아레나 공연에 중형공연장을 연계하거나, 광장을 프로모션·팬 이벤트 공간으로 함께 쓰는 구성이 가능합니다.",
    },
  ],
  narrativeClosing: "",
};
