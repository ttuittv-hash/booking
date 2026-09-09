import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isCompanyMaster } from "@/lib/db";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { MembersManager } from "@/components/account/MembersManager";

// 담당자 관리 — 마스터 전용 메뉴(기획서 A10).
export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmypage%2Fmembers");
  if (!user.companyId) redirect("/mypage");
  // 마스터만 열 수 있다. 일반 담당자에게는 메뉴 자체가 보이지 않는다.
  if (!isCompanyMaster(user)) redirect("/mypage");

  return (
    <MyPageShell
      user={user}
      active="/mypage/members"
      en="MEMBERS"
      ko="담당자 관리"
      lead={`${user.companyName} · 대표 담당자로서 소속 담당자를 관리합니다. 가입 승인은 서울아레나 운영진이 처리합니다.`}
    >
      <MembersManager currentUserId={user.id} />
    </MyPageShell>
  );
}
