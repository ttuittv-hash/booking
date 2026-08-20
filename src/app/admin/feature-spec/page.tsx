import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAllFeatureSpecSheets } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { FeatureSpecManager } from "@/components/admin/FeatureSpecManager";

// [개정 2026-08-20] 이 페이지는 일반 운영자 백오피스 메뉴(AdminNav)에 올리지 않는다 —
// 이 주소를 아는 사람은 누구나 로그인 없이 조회·수정할 수 있다(사용자 요청). 실제 API
// 라우트(GET/PUT)도 더 이상 인증을 요구하지 않는다.
export default async function AdminFeatureSpecPage() {
  const user = await getCurrentUser();
  const sheets = await getAllFeatureSpecSheets();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 h-14 border-b border-border/70 bg-background/80 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full w-full max-w-none items-center gap-x-4 px-4 sm:px-6">
          <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
            기능정의서
          </span>
          <span className="hidden shrink-0 whitespace-nowrap rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted sm:inline-block">
            누구나 편집 가능
          </span>
          {user?.role === "ADMIN" && (
            <div className="ml-auto flex shrink-0 items-center gap-x-4 text-[13px] text-muted">
              <Link href="/admin" className="whitespace-nowrap hover:text-foreground">
                ← 백오피스로
              </Link>
              <LogoutButton className="whitespace-nowrap hover:text-foreground" />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-none flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">기능정의서</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          내부 기획 문서입니다. 운영자 백오피스 메뉴에는 올라가지 않으며, 이 주소를 아는
          사람은 누구나 로그인 없이 조회·수정할 수 있습니다. 수정 내용은 즉시 서버에
          저장되어 이 주소로 들어오는 모든 사람에게 동일하게 보입니다.
        </p>

        <FeatureSpecManager initialSheets={sheets} canEdit={true} />
      </main>
    </div>
  );
}
