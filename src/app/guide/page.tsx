import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getGuidePageContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  Band,
  PageHead,
  ProcessSteps,
  Prose,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 절차 | 서울아레나",
};

/**
 * BOOK IT › 대관 절차 — 한 장짜리 화면이다.
 *
 * 탭(안내 / 절차)은 두지 않는다. 두 탭이 담던 것이 "안내 문단"과
 * "절차 8단계" 하나씩이어서, 탭을 누르게 만드는 대신 위아래로 이어 붙였다.
 * 요금 체계 설명(RATE STRUCTURE)은 금액을 소유한 대관료 화면과 내용이 겹쳐
 * 삭제하고, 그 자리에 대관 절차를 놓는다.
 *
 * 절차 위에 `HOW IT WORKS / 대관 절차` 머리글을 다시 두지 않는다 — 페이지 제목이
 * 이미 「대관 절차」라 같은 말이 두 번 나온다. 화면은 제목 + 안내 문단 → 절차
 * 8단계 → 옐로 CTA 세 덩어리다.
 */
export default async function GuidePage() {
  // 기획서 A15 — 비로그인 차단, 로그인하면 승인 전에도 열람 가능.
  // 규칙은 accessPolicy.ts 한 곳에만 둔다(예전의 isPendingApplicant 게이트는 매트릭스와 반대였다).
  await requireAccess("/guide");
  const [currentUser, content] = await Promise.all([getCurrentUser(), getGuidePageContent()]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="HOW TO BOOK"
            ko="대관 절차"
            lead={<Prose text={content.intro} />}
          />
        </Band>

        <Band tone="white">
          <ProcessSteps steps={content.process} />
        </Band>

        {/* [개정 2026-09-02] 페이지 말미의 CTA 밴드를 없앴다. 절차 설명 안의 문구가
            대관료·규약·공지사항으로 바로 이어지므로, 아래에서 한 곳만 다시 가리키는
            버튼은 그 흐름을 좁힌다. */}
      </main>

      <SiteFooter />
    </div>
  );
}
