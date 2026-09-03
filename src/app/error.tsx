"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Band, PageHead } from "@/components/ui/kit";

/**
 * 예기치 않은 오류 화면 (2026-09-04) — 우리 스타일.
 * 클라이언트 컴포넌트라 서버 상단바(로그인 상태 조회)는 못 그린다. 워드마크와 안내, 다시 시도·홈 버튼만 둔다.
 * 오류 내용은 콘솔에만 남기고 화면에는 보이지 않는다(내부 정보 노출 방지).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? "", error);
  }, [error]);

  const BTN = "inline-flex h-12 items-center justify-center px-6 type-display text-s transition-colors";
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Link href="/" className="type-display text-h6-m sm:text-h6">
          SEOUL ARENA
        </Link>
      </header>
      <main className="flex flex-1 flex-col">
        <Band tone="light" size="md">
          <PageHead
            en="Something went wrong"
            ko="일시적인 오류가 발생했습니다"
            lead="잠시 후 다시 시도해 주세요. 계속 반복되면 1:1 문의로 알려 주시면 확인하겠습니다."
            actions={
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => reset()} className={`${BTN} bg-foreground text-background hover:bg-accent`}>
                  다시 시도
                </button>
                <Link href="/" className={`${BTN} border border-foreground hover:text-accent`}>
                  홈으로
                </Link>
              </div>
            }
          />
        </Band>
      </main>
    </div>
  );
}
