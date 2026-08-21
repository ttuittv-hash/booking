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
  heroImage: "/images/hero.jpg",
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

    리드는 빈 줄(`\n\n`)로 문단을 나누고, `**…**` 로 감싼 부분은 굵게 나온다
    (`components/home/Manifesto.tsx`). 각 선언의 마무리 문장을 굵게 잡는 용도다.
  */
  narrativeLabel: "Manifesto",
  narrativeTitle: "LIMITLESS SPACE,\nABSOLUTE CONTROL",
  narrativeLead:
    "서울아레나는 공연을 위해 처음부터 설계된 공간입니다.\n\n" +
    "무대 위에서 구현하고 싶은 것, 투어 장비를 들여오는 방식, 셋업부터 철수까지의 흐름을 " +
    "먼저 생각했습니다. 대형 프로덕션을 수용하는 리깅과 전력, 빠른 반입을 위한 동선, " +
    "공연에 최적화된 무대와 객석까지. 공간의 조건에 연출을 맞추는 대신, " +
    "**원하는 공연을 그대로 실현할 수 있는 환경**을 만듭니다.",
  narrativeStatements: [
    {
      title: "EVERY SEAT IS THE STAGE",
      desc:
        "좋은 공연은 어디에 앉느냐에 따라 달라지지 않아야 합니다. 서울아레나는 무대와 객석의 " +
        "거리부터 사운드, 시야, 조명까지 하나의 공연 경험으로 설계했습니다. 객석 깊숙한 곳까지 " +
        "균일하게 전달되는 사운드와 공연에 함께 반응하는 인터랙티브 조명을 통해, 관객이 있는 " +
        "모든 곳을 연출의 영역으로 확장합니다. **객석의 끝까지, 무대의 경험이 이어집니다.**",
    },
    {
      title: "NO LIMIT ON THE SHOW",
      desc:
        "공연장의 조건이 연출의 상한선이 되지 않도록 했습니다. 대형 세트와 리깅, 높은 전력 " +
        "수요부터 엔드·센터·360°까지 다양한 무대 구성에 대응할 수 있는 공연 전문 인프라를 " +
        "갖췄습니다. 이미 만들어진 공간에 공연을 끼워 맞추는 것이 아니라, " +
        "**공연이 원하는 방식으로 공간을 사용할 수 있습니다.**",
    },
    {
      title: "BUILD LESS, SHOW MORE",
      desc:
        "더 많이 설치하는 것보다, 더 빠르고 효율적으로 만드는 것이 중요합니다. 대형 투어 장비가 " +
        "그대로 들어오는 반입 환경과 실내 하역 공간, 자동화된 리깅과 무대 시스템을 통해 반복적인 " +
        "설치와 철거를 줄였습니다. 제작 과정의 부담은 공간이 덜어내고, 프로덕션은 공연 자체에 " +
        "더 집중할 수 있도록. **준비는 줄이고, 무대에 더 많은 것을 보여주세요.**",
    },
    {
      title: "BEYOND THE ROOM",
      desc:
        "라이브의 가능성은 객석 안에서 끝나지 않습니다. 서울아레나는 아레나와 중형공연장, 광장과 " +
        "다양한 부대공간을 하나의 공연 경험으로 연결하고, 중계와 디지털 인프라를 통해 현장의 " +
        "순간을 공간 밖으로 확장합니다. 하나의 공연이 팬 이벤트가 되고, 동시 중계가 되고, " +
        "더 큰 라이브 경험으로 이어질 수 있도록. **무대의 경계를 공연장 밖까지 넓힙니다.**",
    },
  ],
  narrativeClosing: "",
};
