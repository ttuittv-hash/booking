"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode } from "react";

/* ============================================================================
   URL 쿼리를 정본으로 삼는 탭.

     · 딥링크 — 선택 상태를 URL 쿼리에 반영한다 (`/features?venue=live-hall`).
       탭 상태를 클라이언트 상태로만 두면 뒤로가기와 공유 링크에서 어긋난다.
     · 전환 시 스크롤은 페이지 최상단이 아니라 탭 헤더 위치로 되돌린다.
     · 인쇄·PDF 저장 시에는 모든 탭 내용을 출력한다. 기술 검토 단계에서 페이지를
       PDF 로 저장해 내부 공유하는 일이 잦은데, 활성 탭만 나오면 절반이 빈 문서가 된다.
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
}: {
  /** URL 쿼리 키 — 공간 축은 `venue`, 내용 축은 `tab`, 자료 축은 `doc` */
  param: string;
  items: QueryTabItem[];
  ariaLabel?: string;
  className?: string;
  /**
   * 탭 바에만 거는 클래스. 패널이 풀블리드 섹션(사진 전면 등)을 담을 때
   * `container-site` 를 여기에 줘서 탭 바만 마진 안으로 들여놓는다.
   */
  tablistClassName?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const headerRef = useRef<HTMLDivElement>(null);

  const raw = search.get(param);
  const active = items.some((i) => i.value === raw) ? (raw as string) : items[0].value;

  function select(value: string) {
    const next = new URLSearchParams(search.toString());
    if (value === items[0].value) next.delete(param);
    else next.set(param, value);
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    headerRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return (
    <div className={className}>
      <div ref={headerRef} className={`scroll-mt-24 ${tablistClassName}`}>
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="flex gap-8 border-b border-border/25 print:hidden"
        >
          {items.map((it) => {
            const on = it.value === active;
            return (
              <button
                key={it.value}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${param}-${it.value}`}
                id={`tab-${param}-${it.value}`}
                onClick={() => select(it.value)}
                className={`-mb-px border-b-2 px-1 pb-4 pt-2 text-s font-bold transition-colors ${
                  on
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.map((it) => {
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
      })}
    </div>
  );
}
