"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/* ============================================================================
   URL 쿼리를 정본으로 삼는 탭.

     · 딥링크 — 선택 상태를 URL 쿼리에 반영한다 (`/features?venue=live-hall`).
       탭 상태를 클라이언트 상태로만 두면 뒤로가기와 공유 링크에서 어긋난다.
     · 전환 시 스크롤을 **페이지 맨 위로** 되돌린다. 탭 헤더 위치로만 올리면
       머리글(제목·리드)이 화면 위로 잘린 채 새 탭이 시작된다.
     · 인쇄·PDF 저장 시에는 모든 탭 내용을 출력한다. 기술 검토 단계에서 페이지를
       PDF 로 저장해 내부 공유하는 일이 잦은데, 활성 탭만 나오면 절반이 빈 문서가 된다.

   모양은 두 가지다.

     pill (기본)  Figma 2608 › `page tabs` — 검정 알약 안에 흰 알약.
                  화면 가운데에 떠 있고 상단바 바로 아래에 스티키로 붙는다.
                  라벨은 상단바 메뉴와 같은 14 — Figma 원안(20)은 페이지 제목보다
                  커 보여서 위계가 뒤집힌다.
     line         밑줄 탭. 페이지 안에서 한 섹션의 하위 축을 가를 때만 쓴다
                  (대관 진행 내역의 티켓 오픈 / 시설 회의 / 정산).
   ========================================================================= */

export interface QueryTabItem {
  value: string;
  label: string;
  panel: ReactNode;
}

export function QueryTabs({
  param,
  items,
  ariaLabel = "탭 선택",
  className = "",
  tablistClassName = "",
  variant = "pill",
}: {
  /** URL 쿼리 키 — 공간 축은 `venue`, 내용 축은 `tab`, 진행 단계는 `stage` */
  param: string;
  items: QueryTabItem[];
  ariaLabel?: string;
  className?: string;
  /** 탭 바에만 거는 클래스 */
  tablistClassName?: string;
  variant?: "pill" | "line";
}) {
  const router = useRouter();
  const search = useSearchParams();

  const raw = search.get(param);
  const active = items.some((i) => i.value === raw) ? (raw as string) : items[0].value;

  function select(value: string) {
    const next = new URLSearchParams(search.toString());
    // 항상 파라미터를 적는다. 예전에는 첫 탭이면 지웠는데, 그러면 탭을 오갈 때
    // /features ↔ /features?venue=live-hall 로 주소 모양이 들쭉날쭉했다.
    // 파라미터 없이 들어온 첫 진입만 기본 탭으로 볼 뿐, 클릭 뒤에는 항상 명시한다.
    next.set(param, value);
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const panels = items.map((it) => {
    const on = it.value === active;
    return (
      <div
        key={it.value}
        role="tabpanel"
        id={`panel-${param}-${it.value}`}
        aria-labelledby={`tab-${param}-${it.value}`}
        hidden={!on}
        className={on ? "" : "hidden print:!block"}
      >
        {it.panel}
      </div>
    );
  });

  function tabProps(value: string) {
    return {
      type: "button" as const,
      role: "tab" as const,
      "aria-selected": value === active,
      "aria-controls": `panel-${param}-${value}`,
      id: `tab-${param}-${value}`,
      onClick: () => select(value),
    };
  }

  if (variant === "line") {
    return (
      <div className={className}>
        <div className={`scroll-mt-[calc(var(--header-h)+1rem)] ${tablistClassName}`}>
          {/*
            [개정 2026-09-10] 선은 지면 전체 폭에 그리고, 탭 줄만 내용 폭(`w-max`)으로
            둔다 — 탭이 화면을 넘으면 이 영역이 가로 스크롤을 맡는다. 스크롤바는 숨긴다.
          */}
          <div className="overflow-x-auto border-b border-border/25 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div role="tablist" aria-label={ariaLabel} className="flex w-max gap-8 print:hidden">
            {items.map((it) => (
              <button
                key={it.value}
                {...tabProps(it.value)}
                /* 라인 탭도 버튼과 같은 단으로 높이를 고정한다 — pb/pt 로 만들면
                   글꼴 줄높이에 따라 화면마다 달라진다 */
                className={`-mb-px flex h-12 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-s font-bold transition-colors ${
                  it.value === active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
          </div>
        </div>
        {panels}
      </div>
    );
  }

  /* pill — 가운데 떠 있는 스티키 알약. 바 전체는 클릭을 막지 않고 알약만 받는다. */
  return (
    <div className={className}>
      <div
        className={`sticky top-[var(--header-h)] z-30 py-4 print:hidden ${tablistClassName}`}
        style={{ pointerEvents: "none" }}
      >
        {/*
          [개정 2026-09-10] **알약에는 잘림도 스크롤도 두지 않는다.** `max-w-full` +
          `overflow-x-auto` 를 알약에 걸던 동안 마지막 탭 글자가 둥근 끝에서 잘렸다
          ("올인원 대관료"). 스크롤은 **바깥 영역**이 맡는다 — 지면 폭을 다 쓰고
          시작·끝에 공통 여백(`--margin-x`)을 둔다. 알약은 모든 문구를 담는 고유
          너비(`w-max`)를 유지하고, 자리가 남으면 `mx-auto` 로 가운데 선다.
        */}
        <div
          className="overflow-x-auto px-[var(--margin-x)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ pointerEvents: "auto" }}
        >
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="mx-auto flex w-max items-center gap-0 rounded-full bg-n-darkest p-1 shadow-md"
        >
          {items.map((it) => (
            <button
              key={it.value}
              {...tabProps(it.value)}
              // 라벨 크기는 상단바 메뉴(14)와 같게 둔다 — 탭이 페이지 제목보다 커 보이면 안 된다
              // 모바일에서는 44px 을 확보한다 — 32px 알약은 손가락으로 누르기 작다. sm 부터 디자인 규격.
              // 높이는 모바일 40 · sm 이상 32. 좌우 패딩은 16 이다.
              className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-s font-bold transition-colors sm:h-8 ${
                it.value === active
                  ? "bg-n-white text-n-darkest"
                  : "text-n-white/70 hover:text-n-white"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
        </div>
      </div>
      {panels}
    </div>
  );
}
