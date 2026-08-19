import { AuthShell } from "@/components/ui/AuthShell";
import { RegisterWizard } from "@/components/register/RegisterWizard";

// 회원가입 — 5스텝 위저드(기획서 A2~A8).
// 화면 구성은 RegisterWizard 가 전부 담당한다.
export default function RegisterPage() {
  return (
    <AuthShell
      variant="card"
      active="register"
      title="회원가입"
      lead="서울아레나 대관시스템 회원가입입니다."
      width="md"
    >
      <RegisterWizard />
    </AuthShell>
  );
}
