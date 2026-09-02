import { AuthShell } from "@/components/ui/AuthShell";
import { RegisterWizard } from "@/components/register/RegisterWizard";
import { getScreenTextContent } from "@/lib/db";
import { isPlaceSearchConfigured } from "@/lib/placeSearch";

// 회원가입 — 5스텝 위저드(기획서 A2~A8).
// 화면 구성은 RegisterWizard 가 전부 담당한다.
export default async function RegisterPage() {
  // STEP1 안내 카드 문구는 백오피스(콘텐츠 관리 > 화면 문구)에서 고친다.
  const screenText = await getScreenTextContent();
  return (
    <AuthShell
      variant="card"
      active="register"
      title="회원가입"
      lead="서울아레나 대관시스템 회원가입입니다."
      width="lg"
    >
      {/* 법인명 검색은 키가 있는 환경에서만 노출한다. 눌러야 없다는 걸 아는 버튼은
          고장으로 보인다(2026-09-02 QA). */}
      <RegisterWizard
        intro={screenText.registerIntro}
        placeSearchEnabled={isPlaceSearchConfigured()}
      />
    </AuthShell>
  );
}
