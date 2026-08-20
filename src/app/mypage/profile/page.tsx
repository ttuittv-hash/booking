import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "회원정보 수정 | 서울아레나",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/profile" currentUser={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {user.role === "ADMIN" ? (
          <div className="max-w-xl">
            <Link href="/admin" className="text-[12.5px] font-medium text-accent hover:underline">
              ← 운영자 백오피스
            </Link>
            <h1 className="mt-4 text-[22px] font-semibold">회원정보 수정</h1>
            <ProfileForm user={user} />
          </div>
        ) : (
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
            <MyPageSidebar active="/mypage/profile" />
            <div className="min-w-0 max-w-xl flex-1">
              <h1 className="text-[22px] font-semibold">회원정보 수정</h1>
              <ProfileForm user={user} />
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
