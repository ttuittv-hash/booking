import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ApplicantHeader } from "@/components/ApplicantHeader";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "회원정보 수정 | 서울아레나",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <ApplicantHeader
        label="← 내 신청 내역"
        backHref={user.role === "ADMIN" ? "/admin" : "/mypage"}
        role={user.role}
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">회원정보 수정</h1>
        <p className="mt-2 text-[13.5px] text-muted">{user.email}</p>

        <ProfileForm user={user} />
      </main>
    </div>
  );
}
