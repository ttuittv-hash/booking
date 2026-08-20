import Link from "next/link";
import { getCurrentUser, isMasterAdmin } from "@/lib/auth";
import { getAllFeatureSpecSheets } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { FeatureSpecManager } from "@/components/admin/FeatureSpecManager";

// 이 페이지는 일반 운영자 백오피스 메뉴(AdminNav)에 올리지 않는다 — 이 주소를 아는
// 사람은 누구나 조회할 수 있지만(비로그인 포함), 수정·저장은 여전히 마스터 관리자
// 로그인이 있어야 한다(API 라우트 requireMasterAdmin()이 실제 권한 경계).
export default async function AdminFeatureSpecPage() {
  const user = await getCurrentUser();
  const canEdit = isMasterAdmin(user);

  const sheets = await getAllFeatureSpecSheets();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 h-14 border-b border-border/70 bg-background/80 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full w-full max-w-none items-center gap-x-4 px-4 sm:px-6">
          <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
            기능정의서
          </span>
          <span className="hidden shrink-0 whitespace-nowrap rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted sm:inline-block">
            {canEdit ? "마스터 관리자 전용" : "보기 전용"}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-x-4 text-[13px] text-muted">
            {canEdit ? (
              <>
                <Link href="/admin" className="whitespace-nowrap hover:text-foreground">
                  ← 백오피스로
                </Link>
                <LogoutButton className="whitespace-nowrap hover:text-foreground" />
              </>
            ) : (
              <Link href="/admin/login" className="whitespace-nowrap hover:text-foreground">
                관리자 로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-none flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">기능정의서</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          {canEdit
            ? "내부 기획 문서입니다. 운영자 백오피스 메뉴에는 올라가지 않으며, 이 주소를 아는 사람은 누구나 조회할 수 있습니다. 수정 내용은 즉시 서버에 저장되어 다른 마스터 관리자에게도 동일하게 보입니다."
            : "내부 기획 문서입니다. 조회는 누구나 가능하며, 수정은 마스터 관리자 로그인이 필요합니다."}
        </p>

        <FeatureSpecManager initialSheets={sheets} canEdit={canEdit} />
      </main>
    </div>
  );
}
