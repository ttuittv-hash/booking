import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, isCompanyMaster, listCompanyMembers } from "@/lib/db";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { MemberApprovalPanel } from "@/components/account/MemberApprovalPanel";

// 합류 신청 상세 — 대표 담당자 전용 (2026-08-28 신설).
//
// 담당자 관리 목록에서 승인/반려만 누를 수 있던 걸 상세 화면으로 뺐다. 두 가지를 위해서다:
//   ① 합류 신청 알림을 누르면 "그 사람"의 화면으로 바로 오게 하기 위해(예전에는 목록으로만 갔다)
//   ② 대표 담당자도 재직증명서를 보고 판단할 수 있게 하기 위해(예전에는 운영자 화면에만 있었다)
export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmypage%2Fmembers");
  if (!user.companyId) redirect("/mypage");
  if (!isCompanyMaster(user)) redirect("/mypage");

  const { id } = await params;
  // 소속 목록에서 찾는다 — 남의 회사 계정을 id 만 알면 열어 보는 일이 없어야 한다.
  const members = await listCompanyMembers(user.companyId);
  if (!members.some((m) => m.id === id)) redirect("/mypage/members");
  const target = await findUserById(id);
  if (!target) redirect("/mypage/members");

  return (
    <MyPageShell
      user={user}
      active="/mypage/members"
      en="MEMBER"
      ko="합류 신청 상세"
      lead={`${target.name}님의 신청 내용입니다. 승인하면 바로 소속 담당자로 활동할 수 있습니다.`}
    >
      <div className="mt-6">
        <Link
          href="/mypage/members"
          className="text-xs text-muted transition-colors hover:text-foreground"
        >
          ← 담당자 관리로
        </Link>
      </div>
      <MemberApprovalPanel
        member={{
          id: target.id,
          name: target.name,
          email: target.email,
          phone: target.phone,
          companyRole: target.companyRole,
          approvalStatus: target.approvalStatus,
          createdAt: target.createdAt,
          employmentCertUrl: target.employmentCertUrl,
          employmentCertName: target.employmentCertName,
          businessCertUrl: target.businessCertUrl,
          businessCertName: target.businessCertName,
        }}
        isSelf={target.id === user.id}
      />
    </MyPageShell>
  );
}
