import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, Label } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "회원정보 수정 | 서울아레나",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/profile" currentUser={user} />
      <Breadcrumb
        items={[
          user.role === "ADMIN"
            ? { label: "운영자 백오피스", href: "/admin" }
            : { label: "내 신청 내역", href: "/mypage" },
          { label: "회원정보 수정" },
        ]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <Label className="mb-5 text-muted">My Account</Label>
          <h1 className="type-kr-heading text-h3-m sm:text-h3">회원정보 수정</h1>
          <p className="mt-5 text-s text-muted">
            담당자명·휴대폰 번호와 비밀번호를 직접 변경할 수 있습니다.
          </p>
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-xl">
            <ProfileForm user={user} />
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
