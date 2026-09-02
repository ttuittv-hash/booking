import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, ButtonLink, PageHeading } from "@/components/ui/kit";
import { ReapplyButton } from "@/components/account/ReapplyButton";

export const metadata: Metadata = {
  title: "가입 승인 대기",
};

const NOTICE: Record<"PENDING" | "REJECTED", { title: string; desc: string }> = {
  PENDING: {
    title: "가입 승인 대기 중입니다",
    desc: "일반인은 자유 가입할 수 없으며, 운영자 승인이 완료되어야 대관 패키지 안내와 견적 산출·신청을 이용하실 수 있습니다. 승인 결과는 알림으로 안내해 드립니다.",
  },
  REJECTED: {
    title: "가입이 승인되지 않았습니다",
    desc: "아래 사유를 확인하시고, 회원정보를 수정한 뒤 재심사를 요청하실 수 있습니다.",
  },
};

export default async function PendingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  // [개정 2026-08-29] 승인이 끝난 사람은 홈으로 보낸다.
  //
  // 예전에는 /apply(대관 신청 상세)로 곧장 보냈다. 승인 대기 화면을 띄워 둔 채 기다리다
  // 승인이 나서 새로고침하면, 승인됐다는 말도 없이 신청서 작성 화면이 열려 당황스러웠다.
  // 홈으로 보내면 무엇이 열렸는지 보고 스스로 다음 걸음을 고를 수 있다.
  //
  // ?welcome=approved 는 홈에서 "가입이 승인되었습니다" 한 줄을 띄우는 표시다 —
  // 이 표시가 없으면 화면만 조용히 바뀌어 승인된 줄 모른다.
  if (currentUser.role !== "APPLICANT") redirect("/");
  if (currentUser.approvalStatus === "APPROVED") redirect("/?welcome=approved");

  const notice = NOTICE[currentUser.approvalStatus];
  const isRejected = currentUser.approvalStatus === "REJECTED";

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="" currentUser={currentUser} />
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "가입 승인 대기" }]} />

      <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* 브랜드 면 — Band 가 톤별로 토큰을 뒤집으므로 색을 직접 지정하지 않는다 */}
        <Band tone="dark" size="lg" className="flex flex-col justify-end">
          <span aria-hidden className="block h-1 w-16 bg-accent" />
          <p className="type-display mt-6 text-h3-m sm:text-h3">
            Review
            <br />
            in progress
          </p>
          <p className="mt-6 max-w-sm text-s text-muted">
            승인이 완료되면 대관 패키지 안내와 예상 견적을 바로 확인할 수 있습니다.
          </p>
        </Band>

        {/* 안내 면 */}
        <div className="flex items-center px-6 py-16 lg:px-16 lg:py-20">
          <div className="w-full max-w-md">
            <Badge tone={isRejected ? "danger" : "warn"}>
              {isRejected ? "승인 거절" : "승인 대기"}
            </Badge>
            <div className="mt-5">
              <PageHeading size="md" title={notice.title} lead={notice.desc} />
            </div>

            {/* [신규 2026-09-02] 반려 사유를 화면에 남긴다.
                예전에는 알림톡 본문으로만 나가고 어디에도 저장되지 않아, 알림톡을
                지우면 왜 반려됐는지 다시 볼 방법이 없었다. */}
            {isRejected && currentUser.approvalRejectReason ? (
              <div
                data-testid="reject-reason"
                className="mt-8 border-l-2 border-danger bg-danger-soft px-4 py-3.5"
              >
                <p className="text-xs font-bold text-danger">반려 사유</p>
                <p className="mt-2 whitespace-pre-wrap break-keep text-s leading-6 text-danger">
                  {currentUser.approvalRejectReason}
                </p>
              </div>
            ) : null}

            {isRejected ? (
              <div className="mt-10 border-t border-border/25 pt-8">
                <p className="break-keep text-s leading-7 text-muted">
                  반려 사유에 해당하는 내용을 회원정보에서 고친 뒤 재심사를 요청하시면
                  다시 심사합니다. 더 이상 이용하지 않으시려면 회원 탈퇴를 진행해 주세요.
                </p>
                <div className="mt-6 flex flex-wrap items-start gap-3">
                  <ButtonLink href="/mypage/profile" variant="secondary">
                    회원정보 수정
                  </ButtonLink>
                  <ReapplyButton />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {/* [수정 2026-09-02] FAQ 가 승인 완료 전용이 되면서 여기서 누르면
                      이 화면으로 되돌아왔다. 승인 전에 실제로 열리는 1:1 문의로 보낸다. */}
                  <ButtonLink href="/mypage/inquiries" variant="tertiary">
                    1:1 문의
                  </ButtonLink>
                  <ButtonLink href="/mypage/withdraw" variant="tertiary">
                    회원 탈퇴
                  </ButtonLink>
                </div>
              </div>
            ) : (
              /* [개정 2026-09-02] 대관 절차가 승인 완료 전용이 되면서 [대관 절차 보기]는
                 여기로 되돌아오는 링크가 됐다. 승인 전에 실제로 열리는 곳으로 보낸다. */
              <div className="mt-10 flex flex-wrap gap-3 border-t border-border/25 pt-8">
                <ButtonLink href="/seoularena" variant="secondary">
                  서울아레나 둘러보기
                </ButtonLink>
                <ButtonLink href="/mypage/inquiries" variant="tertiary">
                  1:1 문의
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
