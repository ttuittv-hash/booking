"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
  트래픽 지표 수집 비콘 (2026-08-27) — 리포트 화면의 페이지뷰 · UV · 대관신청 버튼 클릭수.

  루트 레이아웃에 한 번만 붙는다. 화면 어디에도 그려지지 않는다.

  대관신청 버튼은 호출부가 여럿이라(GNB "Book It", 홈 히어로 CTA, 옐로 CTA 밴드,
  마이페이지 버튼 — 게다가 홈 CTA 는 어드민에서 링크를 고칠 수 있다) 버튼마다 핸들러를
  다는 대신 document 에 위임 리스너 하나를 둔다. /apply 로 가는 앵커면 무엇이든 잡히고,
  새 CTA 가 늘어도 손댈 것이 없다.

  수집 실패는 조용히 삼킨다 — 지표 때문에 화면이 멈추면 안 된다.
*/

function send(type: "PAGE_VIEW" | "APPLY_CLICK", path: string) {
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, path }),
    // 클릭 직후 페이지가 넘어가도 요청이 끊기지 않게 한다.
    keepalive: true,
  }).catch(() => {});
}

export function AnalyticsBeacon() {
  const pathname = usePathname();
  // React 18 의 개발용 이중 마운트와 같은 경로 재렌더에서 조회수가 두 번 세지는 걸 막는다.
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    send("PAGE_VIEW", pathname);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // 새 탭·다운로드 등 기본 동작이 아닌 클릭은 방문으로 보지 않는다.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      // 절대 URL·상대 경로가 섞여 들어오므로 브라우저에 해석을 맡긴다.
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== "/apply" && !url.pathname.startsWith("/apply/")) return;
      send("APPLY_CLICK", url.pathname);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
