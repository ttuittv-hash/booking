import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { WithdrawForm } from "@/components/WithdrawForm";

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/withdraw" />

          <div className="min-w-0 max-w-xl flex-1">
            <h1 className="text-[22px] font-semibold">회원 탈퇴</h1>
            <p className="mt-1.5 text-[13.5px] text-muted">탈퇴 전 아래 안내를 확인해주세요.</p>

            <WithdrawForm />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
