"use client";

import { useEffect } from "react";
import Link from "next/link";
import { btnClass, EYEBROW_CAPS } from "@/components/ui/kit";

/**
 * 예기치 않은 오류 화면 (2026-09-04) — 404 와 같은 결.
 * 클라이언트 컴포넌트라 서버 상단바(로그인 상태 조회)는 못 그린다. 워드마크와 가운데 안내,
 * 다시 시도·홈 버튼만 둔다. 오류 내용은 콘솔에만 남기고 화면에는 보이지 않는다(내부 정보 노출 방지).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Link href="/" className="type-display text-h6-m sm:text-h6">
          SEOUL ARENA
        </Link>
      </header>
      <main className="flex flex-1 items-center py-20 sm:py-28">
        <div className="container-site">
          <div className="mx-auto max-w-2xl text-center">
            {/* 머리말은 사이트 공용 아이브로 — 이 화면만 다른 서체(monospace)를 쓸 이유가 없다 */}
            <p className={EYEBROW_CAPS}>ERROR · SOMETHING WENT WRONG</p>
            <p className="type-display mt-4 text-d2-m leading-none sm:text-d2">OOPS</p>
            <h1 className="type-kr-heading mt-6 text-h3-m sm:text-h3">일시적인 오류가 발생했습니다</h1>
            <p className="mx-auto mt-4 max-w-md break-keep text-m leading-7 text-muted">
              잠시 후 다시 시도해 주세요.
              <br />
              계속 반복되면 1:1 문의로 알려 주시면 확인하겠습니다.
            </p>
            {/* 버튼은 사이트 공용 규격 — 호버하면 옐로 면이 된다 */}
            <div className="mt-lead-action flex flex-wrap justify-center gap-inline">
              <button type="button" onClick={() => reset()} className={btnClass("primary", "lg")}>
                다시 시도
              </button>
              <Link href="/" className={btnClass("secondary", "lg")}>
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
