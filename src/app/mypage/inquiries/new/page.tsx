import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listQuotes } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { NewInquiryForm } from "@/components/NewInquiryForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "문의 작성",
};

export default async function NewInquiryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  // 관련 신청번호는 로그인 계정이 제출한 신청 목록에서 고르게 한다.
  // 직접 입력은 목록이 비어 있을 때의 예비 수단으로만 둔다.
  const quotes = await listQuotes(
    user.companyId ? { companyId: user.companyId } : { applicantId: user.id },
  );

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/inquiries" currentUser={user} />
      <Breadcrumb
        items={[{ label: "1:1 문의", href: "/mypage/inquiries" }, { label: "문의 작성" }]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          {/* [수정 2026-09-04] 폼과 같은 폭으로 페이지 가운데에 — 넓은 화면에서 왼쪽에 치우치지 않게 */}
          <div className="mx-auto max-w-2xl">
  <PageHead
              as="h2"
              en="NEW INQUIRY"
              ko="문의 작성"
              lead="문의 유형을 선택해 주시면 담당 부서가 확인 후 답변드립니다."
            />
          </div>
        </Band>

        <Band tone="white" size="sm">
          <div className="mx-auto max-w-2xl">
            <NewInquiryForm
              myQuoteIds={quotes.map((q) => q.id)}
              notifyEmail={user.email}
              defaultName={user.name}
              defaultPhone={user.phone ?? ""}
            />
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
