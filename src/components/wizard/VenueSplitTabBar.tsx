"use client";

import { toggleClass } from "@/components/ui/kit";

// STEP 3-1(신청자 정보) · STEP 3-2(관객) · STEP 3-3(공공성) 세 화면 모두에서 동일하게 쓰는
// 공통/아레나/중형 탭 바 — 동시 대관에서 "각각 다르게 입력"으로 전환하면 공통 탭이 사라지고
// 아레나/중형 2탭으로 바뀐다(2026-08-19, 기본정보 탭 구조 요청). 세 화면이 각자 다른 시점에
// 분리를 시작할 수 있으므로, 실제 분리 여부(selection.midHallPerformanceInfo)는 QuoteSelection에
// 전역으로 두고 이 컴포넌트는 표시만 담당한다.
export type VenueSplitTab = "COMMON" | "ARENA" | "MIDHALL";

export function VenueSplitTabBar({
  midHallDifferent,
  activeTab,
  onSelectTab,
  onSplit,
  onMerge,
}: {
  midHallDifferent: boolean;
  activeTab: VenueSplitTab;
  onSelectTab: (tab: "ARENA" | "MIDHALL") => void;
  onSplit: () => void;
  onMerge: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/25">
      <div className="flex gap-1">
        {!midHallDifferent && (
          <span className="flex h-10 items-center border-b-2 border-foreground px-4 text-s font-bold text-foreground">공통</span>
        )}
        {midHallDifferent && (
          <>
            <button
              type="button"
              onClick={() => onSelectTab("ARENA")}
              className={[
                "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
                activeTab === "ARENA"
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              아레나
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("MIDHALL")}
              className={[
                "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
                activeTab === "MIDHALL"
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              중형
            </button>
          </>
        )}
      </div>
      {midHallDifferent ? (
        <button
          type="button"
          onClick={onMerge}
          className="mb-2 shrink-0 text-xs font-bold text-muted hover:text-foreground"
        >
          ↺ 공통으로 합치기
        </button>
      ) : (
        <button
          type="button"
          onClick={onSplit}
          className={`${toggleClass(false)} mb-2 shrink-0`}
        >
          ＋ 공간별로 다르게 입력
        </button>
      )}
    </div>
  );
}
