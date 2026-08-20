import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";

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
            : { label: "대관 신청 현황", href: "/mypage/process" },
          { label: "회원정보 수정" },
        ]}
      />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title="회원정보 수정"
            lead="담당자명·휴대폰 번호와 비밀번호를 직접 변경할 수 있습니다."
          />
        </Band>

        <Band tone="white" size="sm">
          <div className="max-w-xl">
            <ProfileForm user={user} />

            {user.role !== "ADMIN" && (
              <div className="mt-14 border-t border-border/25 pt-6">
                <Link
                  href="/mypage/withdraw"
                  className="text-xs text-muted underline decoration-border-soft underline-offset-4 transition-colors hover:text-danger hover:decoration-danger"
                >
                  회원 탈퇴
                </Link>
              </div>
            )}
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
