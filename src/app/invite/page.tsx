import { AuthShell } from "@/components/ui/AuthShell";
import { InviteAcceptForm } from "@/components/account/InviteAcceptForm";
import { findValidInvitation } from "@/lib/db";
import { hashInviteToken } from "@/lib/invitation";

// 초대 수락 (기획서 A11).
// 계정은 아직 없다 — 본인이 인증하고 비밀번호를 직접 정하는 순간 만들어진다.
//
// [신규 2026-08-26] 초대 발급 시 지정한 이름(invitee_name)이 있으면 미리 보여주고
// 잠근다 — 링크가 다른 사람 손에 들어가도 엉뚱한 이름으로 가입되지 않게 한다("노라
// 이름으로 초대한 링크를 테드한테 보내도 가입이 됩니다"). 최종 판정은 서버(accept
// 라우트)가 하지만, 화면에서도 미리 알려줘야 사람이 이상함을 눈치챌 수 있다.
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invitation = token ? await findValidInvitation(hashInviteToken(token)) : undefined;
  return (
    <AuthShell
      variant="card"
      active="register"
      title="담당자 초대"
      lead={
        invitation
          ? `${invitation.companyName} · 본인인증 후 사용하실 아이디와 비밀번호를 설정해 주세요.`
          : "본인인증 후 사용하실 아이디와 비밀번호를 설정해 주세요."
      }
    >
      <InviteAcceptForm
        token={token ?? ""}
        inviteeName={invitation?.inviteeName ?? null}
        companyName={invitation?.companyName ?? null}
      />
    </AuthShell>
  );
}
