import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { NewInquiryForm } from "@/components/NewInquiryForm";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "1:1 문의",
};

/**
 * 비회원 1:1 문의 (2026-09-02).
 *
 * 가입 전에도 물어볼 곳이 있어야 한다 — 대관 조건을 알아야 가입할지 정하는데, 문의가
 * 로그인 뒤에만 열려 있으면 순서가 거꾸로다. 답변은 문의에 적은 이메일·휴대폰으로
 * 보낸다(계정이 없어 인앱 알림·문의 목록은 없다).
 *
 * 로그인한 사람은 마이페이지 문의로 보낸다 — 거기서는 답변까지 한 자리에서 본다.
 */
export default async function GuestInquiryPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect("/admin/inquiries");
  if (user) redirect("/mypage/inquiries/new");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/inquiry" currentUser={null} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHead
            en="INQUIRY"
            ko="1:1 문의"
            lead="가입 전에도 문의하실 수 있습니다. 남겨 주신 이메일과 카카오 알림톡으로 답변드립니다."
          />
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-2xl">
            <NewInquiryForm
              guest
              myQuoteIds={[]}
              notifyEmail=""
              defaultName=""
              defaultPhone=""
            />
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
