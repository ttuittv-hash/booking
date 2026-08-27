import { AuthShell } from "@/components/ui/AuthShell";
import { RegisterWizard, type RegisterInvite } from "@/components/register/RegisterWizard";
import { findCompanyById, findValidInvitation } from "@/lib/db";
import { hashInviteToken } from "@/lib/invitation";

// 초대 수락 (기획서 A11).
//
// [개정 2026-08-27] 초대 링크의 랜딩을 **회원가입 화면 그대로**로 되돌렸다. 전용 수락
// 화면(InviteAcceptForm)은 이름·아이디·비밀번호만 받아, 초대로 들어온 사람에게는 약관
// 동의 이력도 재직증명서도 남지 않았다 — 같은 회사 담당자인데 가입 경로에 따라 보관하는
// 자료가 달라졌다. 이제 일반 가입과 같은 위저드를 쓰고, 초대장이 정하는 것(회사·이메일·
// 이름)만 미리 채워 잠근다. 계정 생성은 /api/auth/register 가 inviteToken 을 받아 처리한다.
//
// [2026-08-26] 초대 발급 시 지정한 이름(invitee_name)이 있으면 그 이름으로 가입된다 —
// 링크가 다른 사람 손에 들어가도 엉뚱한 이름으로 가입되지 않게 서버가 덮어쓴다("노라
// 이름으로 초대한 링크를 테드한테 보내도 가입이 됩니다").
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invitation = token ? await findValidInvitation(hashInviteToken(token)) : undefined;

  if (!invitation) {
    return (
      <AuthShell
        variant="card"
        active="register"
        title="담당자 초대"
        lead="초대 링크를 확인할 수 없습니다."
      >
        <p data-testid="invite-error" className="text-s leading-6 text-danger">
          초대 링크가 만료되었거나 이미 사용되었습니다. 대표 담당자에게 재발송을 요청해 주세요.
        </p>
      </AuthShell>
    );
  }

  // 회사 정보를 미리 채워 잠근다 — [등록된 회사정보 불러오기]로 고른 것과 같은 상태다.
  const company = await findCompanyById(invitation.companyId);
  const invite: RegisterInvite = {
    token: token ?? "",
    companyName: invitation.companyName,
    email: invitation.email,
    inviteeName: invitation.inviteeName ?? null,
    company: company
      ? {
          id: company.id,
          name: company.name,
          companyType: company.companyType ?? null,
          businessRegistrationNumber: company.businessRegistrationNumber,
          representativeName: company.representativeName,
          companyPhone: company.companyPhone,
          companyFax: company.companyFax,
          corporateNumber: company.corporateNumber,
          postalCode: company.postalCode,
          address: company.address,
        }
      : null,
  };

  return (
    <AuthShell
      variant="card"
      active="register"
      title="회원가입"
      lead={`${invitation.companyName}의 초대로 가입합니다. 약관 동의와 본인인증을 거쳐 정보를 입력해 주세요.`}
      width="lg"
    >
      <RegisterWizard invite={invite} />
    </AuthShell>
  );
}
