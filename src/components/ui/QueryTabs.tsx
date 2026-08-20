"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode } from "react";

/* ============================================================================
   URL 쿼리를 정본으로 삼는 탭.

   IA 문서 「탭 규칙」을 그대로 구현한다.
     · 탭 축은 페이지당 하나. 탭 안에 탭을 두지 않는다
     · 딥링크 — 선택 상태를 URL 쿼리에 반영한다 (`/venue/specs?venue=live-hall`)
       탭 상태는 클라이언트 상태가 아니라 URL 파라미터를 정본으로 둔다.
       두 곳에 상태가 생기면 뒤로가기와 공유 링크에서 어긋난다
     · 전환 시 스크롤은 페이지 최상단이 아니라 탭 헤더 위치로 되돌린다
     · 인쇄·PDF 저장 시에는 두 탭의 내용을 모두 출력한다.
       기술 검토 단계에서 페이지를 PDF 로 저장해 내부 공유하는 일이 잦은데,
       활성 탭만 나오면 절반이 빈 문서가 된다
   ========================================================================= */

export interface QueryTabItem {
  value: string;
  label: string;
  /** 인쇄본에서 이 패널 위에 붙는 제목. 화면에서는 보이지 않는다 */
  printLabel?: string;
  panel: ReactNode;
}

export function QueryTabs({
  param,
  items,
  className = "",
}: {
  /** URL 쿼리 키. 공간 축은 `venue`, 자료 종류 축은 `doc` */
  param: string;
  items: QueryTabItem[];
  className?: string;
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
    // scroll:false 로 두고 탭 헤더 위치로 직접 되돌린다.
    // 최상단으로 튀면 긴 페이지에서 탭을 오갈 때마다 다시 내려와야 한다.
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    headerRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return (
    <div className={className}>
      <div ref={headerRef} className="scroll-mt-24">
        <div
          role="tablist"
          aria-label="공간 선택"
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
            /* 인쇄 시에는 비활성 탭도 모두 출력한다 */
            className={on ? "" : "hidden print:!block"}
          >
            {!on && (
              <h2 className="type-kr-heading hidden pt-10 text-h4-m print:block sm:text-h4">
                {it.printLabel ?? it.label}
              </h2>
            )}
            {it.panel}
          </div>
        );
      })}
    </div>
  );
}
