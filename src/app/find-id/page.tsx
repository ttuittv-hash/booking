import { AuthShell } from "@/components/ui/AuthShell";
import { FindIdForm } from "@/components/account/FindIdForm";

// 아이디 찾기 (기획서 A13). 본인인증을 거쳐 마스킹된 아이디를 보여준다.
export default function FindIdPage() {
  return (
    <AuthShell variant="card" active="login" title="아이디 찾기" lead="본인인증 후 아이디를 확인하실 수 있습니다.">
      <FindIdForm />
    </AuthShell>
  );
}
