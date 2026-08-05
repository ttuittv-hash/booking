"use client";

import { btnClass } from "@/components/ui/kit";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      // 옐로 면 위 텍스트는 항상 검정 — primary 버튼 토큰을 그대로 쓴다.
      className={`${btnClass("primary", "md")} print:hidden`}
    >
      인쇄 / PDF로 저장
    </button>
  );
}
