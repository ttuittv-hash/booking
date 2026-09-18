"use client";

import { btnClass } from "@/components/ui/kit";

/**
 * [확장 2026-09-18] 인쇄용 신청서(/print/[id]) 전용이던 버튼을 「신청 내역」 화면에서도
 * 쓴다(nora "신청내역 전체 저장"). 그 화면에는 「신청 상세보기」·「문서 저장」이 나란히
 * 서 있어 옐로(primary)면 혼자 튀므로 색과 문구를 호출처가 정하게 열었다.
 */
export function PrintButton({
  label = "인쇄 / PDF로 저장",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "secondary";
} = {}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      // 옐로 면 위 텍스트는 항상 검정 — primary 버튼 토큰을 그대로 쓴다.
      // 자기 자신은 인쇄물에 남으면 안 되고, 문서 저장(HTML)에서도 빠져야 한다.
      className={`${btnClass(variant, "md")} print:hidden`}
      data-doc-hide
    >
      {label}
    </button>
  );
}
