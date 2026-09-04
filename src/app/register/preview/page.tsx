import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/ui/AuthShell";
import { RegisterWizard } from "@/components/register/RegisterWizard";
import { btnClass } from "@/components/ui/kit";
import { getScreenTextContent } from "@/lib/db";
import { isPlaceSearchConfigured } from "@/lib/placeSearch";

// 회원가입 화면 미리보기 — **개발 환경 전용**.
//
// 본인인증(STEP2)은 외부 서비스가 있어야 통과하므로, 그 뒤의 두 화면
// (사업자 인증 · 정보 입력 / 가입완료)은 로컬에서 볼 방법이 없었다. 여기서는
// 인증을 마친 것처럼 해당 단계에서 위저드를 시작해 화면만 확인한다.
//
// 실제 가입 흐름이 아니다 — 정보 입력 화면의 [가입 신청]은 평소와 같이 진짜 API 를
// 부르므로, 디자인만 보고 나가는 자리로 쓴다.
export default async function RegisterPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  // 운영에서는 존재하지 않는 경로다.
  if (process.env.NODE_ENV === "production") notFound();

  const { step } = await searchParams;
  const previewStep = step === "4" ? 4 : 3;
  const screenText = await getScreenTextContent();

  return (
    <AuthShell
      variant="card"
      active="register"
      title="회원가입"
      lead="서울아레나 대관시스템 회원가입입니다."
      width="lg"
    >
      <div className="mb-8 flex flex-wrap items-center gap-inline border-b border-border/25 pb-6">
        <span className="text-xs font-bold text-muted">화면 미리보기 (개발 전용)</span>
        <Link
          href="/register/preview?step=3"
          className={btnClass(previewStep === 3 ? "primary" : "secondary", "sm")}
        >
          사업자 인증 · 정보 입력
        </Link>
        <Link
          href="/register/preview?step=4"
          className={btnClass(previewStep === 4 ? "primary" : "secondary", "sm")}
        >
          가입완료
        </Link>
      </div>

      <RegisterWizard
        intro={screenText.registerIntro}
        placeSearchEnabled={isPlaceSearchConfigured()}
        previewStep={previewStep}
      />
    </AuthShell>
  );
}
