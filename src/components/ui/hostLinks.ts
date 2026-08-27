"use client";

// 호스트 간 링크 — bo.(운영자) ↔ partner.(신청자) 는 같은 앱이지만 프록시가 경로를 가른다.
// 렌더 중 window 를 읽으면 서버 마크업과 어긋나 하이드레이션이 속성을 버리므로
// useSyncExternalStore 로 클라이언트 값과 서버 기본값을 분리한다(PublicHeader 의 백오피스 링크와 같은 방식).

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** 운영자 화면(bo.)에서 "메인으로" — 신청자 사이트(partner.) 루트. 프록시 없는 환경은 "/". */
export function useMainSiteHref(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const { protocol, host } = window.location;
      const m = /^bo\.(.+)$/.exec(host);
      return m ? `${protocol}//partner.${m[1]}/` : "/";
    },
    () => "/",
  );
}
