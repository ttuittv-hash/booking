import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { WithdrawForm } from "@/components/WithdrawForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Badge, Band, Label } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "회원 탈퇴 | 서울아레나",
};

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      <Breadcrumb
        items={[
          { label: "내 신청 내역", href: "/mypage" },
          { label: "회원정보 수정", href: "/mypage/profile" },
          { label: "회원 탈퇴" },
        ]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <Label className="mb-5 text-muted">My Account</Label>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="type-kr-heading text-h3-m sm:text-h3 text-danger">회원 탈퇴</h1>
            <Badge tone="danger">되돌릴 수 없음</Badge>
          </div>
          <p className="mt-5 text-s text-muted">탈퇴 전 아래 안내를 확인해주세요.</p>
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
