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
    "서울아레나는 원하는 공연을 그대로 실현할 수 있도록 설계된 공간입니다.",
  narrativeStatements: [
    {
      title: "EVERY SEAT IS THE STAGE",
      desc: "어느 좌석에서도 공연의 몰입이 이어지도록, 객석 전체를 하나의 무대로 설계합니다.",
    },
    {
      title: "NO LIMIT ON THE SHOW",
      desc:
        "공간의 조건이 연출의 한계가 되지 않도록, 어떤 무대와 프로덕션도 자유롭게 펼칠 수 " +
        "있는 기반을 만듭니다.",
    },
    {
      title: "BUILD LESS, SHOW MORE",
      desc: "준비와 설치의 부담은 줄이고, 더 많은 시간과 에너지를 무대에 집중할 수 있게 합니다.",
    },
    {
      title: "BEYOND THE ROOM",
      desc: "하나의 라이브가 공연장을 넘어 더 많은 공간과 관객, 경험으로 이어지게 합니다.",
    },
  ],
  narrativeClosing: "",
};
