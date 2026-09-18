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
/**
 * [추가 2026-09-18] "문서로 다운받기 버튼 눌렀을 때 워드나 엑셀 등으로 받을 수 있게" 요청.
 *
 * 워드는 HTML 로 된 .doc 파일을 그대로 연다 — 별도 라이브러리도, 서버 변환도 필요 없고
 * 같은 HTML 을 MIME 과 확장자만 바꿔 내보내면 된다. 대신 두 가지를 워드에 맞춰 준다:
 *
 *  · <base href> 를 넣지 않는다. 워드는 외부 스타일시트를 어차피 못 가져오는데, base 가
 *    있으면 이미지 경로까지 원격으로 잡아 열 때마다 네트워크를 타고 실패하면 깨진 그림이
 *    남는다. 스타일은 빠지지만 제목·표·본문 구조는 그대로 살아 워드에서 편집할 수 있다.
 *  · 앞에 BOM(﻿)을 붙인다. 워드는 charset 메타보다 BOM 을 먼저 믿어서, 없으면 한글이
 *    깨진 채 열리는 일이 있다.
 */
type DocFormat = "html" | "doc";

const FORMAT_LABEL: Record<DocFormat, string> = { html: "문서 저장", doc: "워드 저장" };

export function SaveDocumentButton({
  quoteId,
  // [추가 2026-09-18] 기본값은 그대로 요약본이지만, 「신청 내역」에서는 그 화면 자체를
  // 저장한다(nora "요약본도 정보가 부족하다 / 신청내역 전체 저장이 안 된다").
  path,
  format = "html",
}: {
  quoteId: string;
  path?: string;
  format?: DocFormat;
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
      const head =
        format === "doc"
          ? `<head><meta charset="utf-8"><style>[data-doc-hide]{display:none !important}</style>`
          : `<head><base href="${window.location.origin}/"><style>[data-doc-hide]{display:none !important}</style>`;
      let body = html.replace(/<head>/i, head);
      if (format === "doc") {
        // 워드는 [data-doc-hide] 같은 속성 선택자의 display:none 을 믿을 수 없게 적용한다 —
        // 화면용 버튼(「PDF 저장」·「신청 상세보기」)과 백오피스 네비가 문서에 그대로 찍힌다.
        // CSS 에 기대지 말고 아예 덜어낸다. HTML 저장본은 브라우저로 여니 CSS 로 충분하다.
        const parsed = new DOMParser().parseFromString(body, "text/html");
        parsed.querySelectorAll("[data-doc-hide]").forEach((el) => el.remove());
        // 서버 렌더 HTML 에는 RSC 직렬화 payload 가 <script> 로 함께 실린다 — 화면 버튼의
        // props("PDF 저장" 같은 문자열)까지 그 안에 문자열로 들어 있어, DOM 에서 버튼을
        // 지워도 파일에는 남는다. 워드가 script 를 그리지는 않아 문서에 보이지는 않지만
        // 파일의 절반 넘게 차지하므로(실측 99KB) 통째로 덜어낸다.
        parsed.querySelectorAll("script").forEach((el) => el.remove());
        body = `<!doctype html>${parsed.documentElement.outerHTML}`;
      }
      const blob =
        format === "doc"
          ? new Blob(["﻿", body], { type: "application/msword;charset=utf-8" })
          : new Blob([body], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `대관신청서_${quoteId}.${format}`;
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
      {busy ? "저장 중..." : FORMAT_LABEL[format]}
    </button>
  );
}
