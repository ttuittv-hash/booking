import { AuthShell } from "@/components/ui/AuthShell";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";

// 비밀번호 찾기 (기획서 A13). 아이디 입력 → 본인인증 → 새 비밀번호 직접 입력.
export default function ResetPasswordPage() {
  return (
    <AuthShell
      variant="card"
      active="login"
      title="비밀번호 찾기"
      lead="가입하신 아이디를 입력해 주시기 바랍니다."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
