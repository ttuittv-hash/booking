"use client";

import { useState } from "react";
import { btnClass } from "@/components/ui/kit";

/**
 * [신규 2026-09-19] "PDF 저장, 문서 저장 둘 다 있어야 해" — 기존 "인쇄" 버튼은 브라우저
 * 인쇄 대화상자를 거쳐야 PDF로 남는다(그것대로 유지). 이 버튼은 그 대화상자 없이 인쇄용
 * 신청서(/print/[id])를 즉시 HTML 문서 파일로 내려받는다 — 나중에 파일 자체를 이메일
 * 첨부하거나 보관해야 할 때를 위한 별도 경로다.
 *
 * <base href="현재 origin"> 을 head 맨 앞에 끼워 넣는다 — 안 넣으면 문서 안의 스타일시트·
 * 이미지가 전부 절대경로("/_next/static/...")라, 로컬 파일로 열었을 때 file:// 기준으로
 * 깨진 링크가 되어 스타일 없는 맨 텍스트만 보인다. base 태그가 있으면 나중에 열 때도
 * (네트워크가 있는 한) 실제 서버에서 리소스를 다시 받아와 화면 그대로 보인다.
 */
export function SaveDocumentButton({
  quoteId,
  // [추가 2026-09-18] 기본값은 그대로 요약본이지만, 「신청 내역」에서는 그 화면 자체를
  // 저장한다(nora "요약본도 정보가 부족하다 / 신청내역 전체 저장이 안 된다").
  path,
}: {
  quoteId: string;
  path?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(path ?? `/print/${quoteId}`);
      if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
      const html = await res.text();
      // 화면에서만 의미가 있는 것(백오피스 네비·버튼)은 저장본에서 뺀다 — 인쇄에서는
      // print:hidden 이 하는 일을, 파일로 열 때는 이 규칙이 한다(같은 요소에 표시해 둔다).
      const withBase = html.replace(
        /<head>/i,
        `<head><base href="${window.location.origin}/"><style>[data-doc-hide]{display:none !important}</style>`,
      );
      const blob = new Blob([withBase], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `대관신청서_${quoteId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("문서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void save()}
      disabled={busy}
      className={btnClass("secondary", "md")}
    >
      {busy ? "저장 중..." : "문서 저장"}
    </button>
  );
}
