import { AuthShell } from "@/components/ui/AuthShell";
import { InviteAcceptForm } from "@/components/account/InviteAcceptForm";

// 초대 수락 (기획서 A11).
// 계정은 아직 없다 — 본인이 인증하고 비밀번호를 직접 정하는 순간 만들어진다.
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell
      variant="card"
      active="register"
      title="담당자 초대"
      lead="본인인증 후 사용하실 아이디와 비밀번호를 설정해 주세요."
    >
      <InviteAcceptForm token={token ?? ""} />
    </AuthShell>
  );
}
