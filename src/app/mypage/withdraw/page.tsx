import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { WithdrawForm } from "@/components/WithdrawForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, PageHeading } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "회원 탈퇴 | 서울아레나",
};

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/process" currentUser={user} />
      {/* 3뎁스 — 부모(회원정보 수정)를 포함해 2개 */}
      <Breadcrumb
        items={[{ label: "회원정보 수정", href: "/mypage/profile" }, { label: "회원 탈퇴" }]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title="회원 탈퇴"
            lead="탈퇴 전 아래 안내를 확인해주세요."
            actions={<Badge tone="danger">되돌릴 수 없음</Badge>}
          />
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-xl">
            <WithdrawForm />
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
