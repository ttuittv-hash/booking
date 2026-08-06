import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { NewInquiryForm } from "@/components/NewInquiryForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "문의하기 | 서울아레나",
};

export default async function NewInquiryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      {/* 3뎁스 — 부모(1:1 문의)를 포함해 2개 */}
      <Breadcrumb
        items={[{ label: "1:1 문의", href: "/mypage/inquiries" }, { label: "문의하기" }]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title="문의하기"
            lead="제목과 내용을 남기면 운영자가 확인 후 답변을 등록합니다."
          />
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-2xl">
            <NewInquiryForm />
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
