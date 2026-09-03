import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, ButtonLink } from "@/components/ui/kit";
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

      {/*
        [개정 2026-09-03] 좌 브랜드 면 + 우 안내 면으로 갈라 두었던 것을 **가운데 카드
        하나**로 바꿨다. 이 화면에서 할 일은 사유를 읽고 다음 걸음을 고르는 것 하나뿐인데,
        화면이 둘로 갈리면 시선이 어디서 시작하는지 애매했다. 로그인 화면(AuthShell
        `variant="card"`)과 같은 규격 — 가운데 정렬 · 아웃라인 카드 · 전폭 버튼.
      */}
      <main className="container-site flex flex-1 items-center justify-center py-16 sm:py-20">
        <div className="w-full max-w-md">
          <div className="rounded-surface border border-border p-8 sm:p-10">
            <div className="flex justify-center">
              <Badge tone={isRejected ? "danger" : "warn"}>
                {isRejected ? "승인 거절" : "승인 대기"}
              </Badge>
            </div>
            <h1 className="type-kr-heading mt-5 break-keep text-center text-h3-m sm:text-h3">
              {notice.title}
            </h1>
            <p className="mt-4 break-keep text-center text-s leading-7 text-muted">{notice.desc}</p>

            {/* [신규 2026-09-02] 반려 사유를 화면에 남긴다.
                예전에는 알림톡 본문으로만 나가고 어디에도 저장되지 않아, 알림톡을
                지우면 왜 반려됐는지 다시 볼 방법이 없었다.
                [개정 2026-09-03] 빨강 면 + 좌측 굵은 선이던 것을 **흰 배경 · 검정 아웃라인**
                카드로 바꾼다 — 읽어야 하는 글이지 경고가 아니고, 빨강 바탕 위 빨강 글씨는
                긴 사유일수록 읽기 어려웠다. */}
            {isRejected && currentUser.approvalRejectReason ? (
              <div data-testid="reject-reason" className="mt-8 rounded-surface border border-border bg-panel p-5">
                <p className="text-xs font-bold text-muted">반려 사유</p>
                <p className="mt-2 whitespace-pre-wrap break-keep text-s leading-6">
                  {currentUser.approvalRejectReason}
                </p>
              </div>
            ) : null}

            {/* 버튼은 로그인 화면과 같은 md 높이 · 전폭으로 통일한다 — 크기가 제각각이면
                무엇이 다음 걸음인지 읽히지 않는다. 위에서부터 할 일 순서다. */}
            {isRejected ? (
              <>
                <p className="mt-8 break-keep text-s leading-7 text-muted">
                  반려 사유에 해당하는 내용을 회원정보에서 고친 뒤 재심사를 요청하시면
                  다시 심사합니다. 더 이상 이용하지 않으시려면 회원 탈퇴를 진행해 주세요.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <ButtonLink
                    href="/mypage/profile"
                    variant="secondary"
                    size="md"
                    className="w-full"
                  >
                    회원정보 수정
                  </ButtonLink>
                  <ReapplyButton />
                  {/* [수정 2026-09-02] FAQ 가 승인 완료 전용이 되면서 여기서 누르면
                      이 화면으로 되돌아왔다. 승인 전에 실제로 열리는 1:1 문의로 보낸다. */}
                  <ButtonLink
                    href="/mypage/inquiries"
                    variant="tertiary"
                    size="md"
                    className="w-full"
                  >
                    1:1 문의
                  </ButtonLink>
                  <ButtonLink
                    href="/mypage/withdraw"
                    variant="tertiary"
                    size="md"
                    className="w-full"
                  >
                    회원 탈퇴
                  </ButtonLink>
                </div>
              </>
            ) : (
              /* [개정 2026-09-02] 대관 절차가 승인 완료 전용이 되면서 [대관 절차 보기]는
                 여기로 되돌아오는 링크가 됐다. 승인 전에 실제로 열리는 곳으로 보낸다. */
              <div className="mt-8 flex flex-col gap-3">
                <ButtonLink href="/seoularena" variant="secondary" size="md" className="w-full">
                  서울아레나 둘러보기
                </ButtonLink>
                <ButtonLink
                  href="/mypage/inquiries"
                  variant="tertiary"
                  size="md"
                  className="w-full"
                >
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
