import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageNav } from "@/components/MyPageNav";
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

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        {user.role === "ADMIN" ? (
          <Link href="/admin" className="text-[12.5px] font-medium text-accent hover:underline">
            ← 운영자 백오피스
          </Link>
        ) : (
          <MyPageNav active="/mypage/profile" />
        )}

        <h1 className="mt-4 text-[22px] font-semibold">회원정보 수정</h1>

        <ProfileForm user={user} />

        {user.role !== "ADMIN" && (
          <div className="mt-10 border-t border-border pt-6">
            <Link href="/mypage/withdraw" className="text-[12.5px] text-muted hover:text-red-600">
              회원 탈퇴
            </Link>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
