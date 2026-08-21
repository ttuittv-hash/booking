import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { WithdrawForm } from "@/components/WithdrawForm";

export const metadata: Metadata = {
  title: "회원 탈퇴 | 서울아레나",
};

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <MyPageShell
      user={user}
      active="/mypage/withdraw"
      en="WITHDRAW"
      ko="회원 탈퇴"
      lead="탈퇴 전 아래 안내를 확인해 주세요."
    >
      <div className="measure">
        <WithdrawForm />
      </div>
    </MyPageShell>
  );
}
