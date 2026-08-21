import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, ButtonLink, PageHeading } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "가입 승인 대기 | 서울아레나",
};

const NOTICE: Record<"PENDING" | "REJECTED", { title: string; desc: string }> = {
  PENDING: {
    title: "가입 승인 대기 중입니다",
    desc: "일반인은 자유 가입할 수 없으며, 운영자 승인이 완료되어야 대관 패키지 안내와 견적 산출·신청을 이용하실 수 있습니다. 승인 결과는 알림으로 안내해 드립니다.",
  },
  REJECTED: {
    title: "가입이 승인되지 않았습니다",
    desc: "자세한 사항은 운영자에게 문의해주세요.",
  },
};

export default async function PendingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "APPLICANT" || currentUser.approvalStatus === "APPROVED") redirect("/apply");

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

            <div className="mt-10 flex flex-wrap gap-3 border-t border-border/25 pt-8">
              <ButtonLink href="/guide" variant="secondary">
                대관 안내 보기
              </ButtonLink>
              <ButtonLink href="/faq" variant="tertiary">
                대관 문의
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
