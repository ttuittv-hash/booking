import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ButtonLink, EYEBROW_CAPS } from "@/components/ui/kit";
import { NOTICE_LINK } from "@/components/ui/nav-items";

export const metadata: Metadata = { title: "페이지를 찾을 수 없습니다 | 서울아레나" };

/**
 * 404 — 우리 스타일의 안내 화면 (2026-09-04).
 * 상단바·푸터는 그대로 두고, 가운데에 디스플레이 서체로 크게 "404", 노란 포인트 바, 한글 제목·안내,
 * 갈 곳(홈·대관 공지) 버튼을 둔다. 로그인 상태면 상단바도 그 상태로 그려진다.
 */
export default async function NotFound() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <PublicHeader active="" currentUser={user} />
      <main className="flex flex-1 items-center bg-background py-20 sm:py-28">
        <div className="container-site">
          <div className="mx-auto max-w-2xl text-center">
            {/* 머리말은 사이트 공용 아이브로 — 이 화면만 다른 서체(monospace)를 쓸 이유가 없다 */}
            <p className={EYEBROW_CAPS}>ERROR 404 · PAGE NOT FOUND</p>
            <p className="type-display mt-4 text-d2-m leading-none text-foreground sm:text-d2">404</p>
            <h1 className="type-kr-heading mt-6 text-h3-m sm:text-h3">페이지를 찾을 수 없습니다</h1>
            <p className="mx-auto mt-4 max-w-md break-keep text-m leading-7 text-muted">
              주소가 바뀌었거나 삭제된 페이지입니다.
              <br />
              입력한 주소를 다시 확인해 주세요.
            </p>
            <div className="mt-lead-action flex flex-wrap justify-center gap-inline">
              <ButtonLink href="/" variant="primary">
                홈으로
              </ButtonLink>
              <ButtonLink href={NOTICE_LINK.href}>{NOTICE_LINK.label} 보기</ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
