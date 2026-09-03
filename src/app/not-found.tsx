import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, ButtonLink, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = { title: "페이지를 찾을 수 없습니다 | 서울아레나" };

/**
 * 404 — 우리 스타일의 안내 화면 (2026-09-04).
 * Next 기본 흰 화면 대신 상단바·푸터를 그대로 두고, 갈 곳(홈·공지사항)을 바로 준다.
 * 로그인 상태면 상단바도 그 상태로 그려진다.
 */
export default async function NotFound() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="" currentUser={user} />
      <main className="flex flex-1 flex-col">
        <Band tone="light" size="md">
          <PageHead
            en="404"
            ko="페이지를 찾을 수 없습니다"
            lead="주소가 바뀌었거나 삭제된 페이지입니다. 입력한 주소를 다시 확인해 주세요."
            actions={
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/" variant="primary">
                  홈으로
                </ButtonLink>
                <ButtonLink href="/notices">공지사항 보기</ButtonLink>
              </div>
            }
          />
        </Band>
      </main>
      <SiteFooter />
    </div>
  );
}
