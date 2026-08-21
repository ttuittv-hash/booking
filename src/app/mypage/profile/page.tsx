import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { Band, PageHead } from "@/components/ui/kit";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "나의 정보 수정 | 서울아레나",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const company = user.companyId ? ((await findCompanyById(user.companyId)) ?? null) : null;

  // 운영자에게는 마이페이지 메뉴가 의미 없다 — 백오피스로 돌아가는 링크만 둔다.
  if (user.role === "ADMIN") {
    return (
      <div className="flex flex-1 flex-col">
        <PublicHeader active="/mypage/profile" currentUser={user} />
        <main className="flex flex-1 flex-col">
          <Band tone="light" size="lg">
            <PageHead en="MY PROFILE" ko="나의 정보 수정" />
            <div className="mt-6">
              <Link
                href="/admin"
                className="text-s font-bold underline underline-offset-4 hover:text-accent"
              >
                ← 운영자 백오피스
              </Link>
            </div>
          </Band>
          <Band tone="light">
            <div className="measure">
              <ProfileForm user={user} company={company} />
            </div>
          </Band>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <MyPageShell
      user={user}
      active="/mypage/profile"
      en="MY PROFILE"
      ko="나의 정보 수정"
      lead="가입 시 등록한 회원·기업 정보를 확인하고 수정하실 수 있습니다."
    >
      <ProfileForm user={user} company={company} />
    </MyPageShell>
  );
}
