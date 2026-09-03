import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ButtonLink } from "@/components/ui/kit";

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
            <p className="font-mono text-xs tracking-[0.12em] text-muted">ERROR 404 · PAGE NOT FOUND</p>
            <p className="type-display mt-4 text-[6rem] leading-none tracking-[-0.05em] text-foreground sm:text-[9rem]">
              404
            </p>
            <div className="mx-auto mt-6 h-1 w-16 bg-accent" aria-hidden="true" />
            <h1 className="type-kr-heading mt-6 text-h3-m sm:text-h3">페이지를 찾을 수 없습니다</h1>
            <p className="mx-auto mt-4 max-w-md break-keep text-m leading-7 text-muted">
              주소가 바뀌었거나 삭제된 페이지입니다.
              <br />
              입력한 주소를 다시 확인해 주세요.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/" variant="primary">
                홈으로
              </ButtonLink>
              <ButtonLink href="/notices">대관 공지 보기</ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
