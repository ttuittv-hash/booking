import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isMasterAdmin } from "@/lib/auth";
import { getAllFeatureSpecSheets } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { FeatureSpecManager } from "@/components/admin/FeatureSpecManager";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

// 이 페이지는 일반 운영자 백오피스 메뉴(AdminNav)에 올리지 않는다 — 개발자·마스터
// 관리자만 이 주소를 직접 알고 들어오는 별도 화면으로 둔다.
export default async function AdminFeatureSpecPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");
  if (!isMasterAdmin(user)) redirect("/admin");

  const sheets = await getAllFeatureSpecSheets();

  return (
    <div className="flex flex-1 flex-col">
      {/* 백오피스 AdminNav 와 같은 높이·리듬의 헤어라인 바 (메뉴만 없다).
          표가 화면 폭만큼 넓어야 하므로 가로폭 제한은 두지 않는다 (max-w-none). */}
      <header className="sticky top-0 z-20 h-14 border-b border-border/20 bg-background/95 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full w-full max-w-none items-center gap-x-4 px-4 sm:px-6">
          <Link
            href="/"
            className="type-display shrink-0 whitespace-nowrap text-h6-m leading-none"
            aria-label="Seoul Arena 홈"
          >
            Seoul Arena
          </Link>
          <span className="hidden shrink-0 whitespace-nowrap border border-border-soft px-2 py-1 text-xs leading-none text-muted sm:inline-block">
            마스터 관리자 전용
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-x-4 text-xs text-muted">
            <Link href="/admin" className="whitespace-nowrap font-bold hover:text-foreground">
              백오피스로
            </Link>
            <LogoutButton className="whitespace-nowrap font-bold hover:text-foreground" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-none flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>기능정의서</h1>
          <p className={PAGE_LEAD}>
            내부 기획 문서입니다. 운영자 백오피스 메뉴에는 올라가지 않으며, 이 주소를 아는
            개발자·마스터 관리자만 접근할 수 있습니다. 수정 내용은 즉시 서버에 저장되어 다른
            마스터 관리자에게도 동일하게 보입니다.
          </p>
        </header>

        <FeatureSpecManager initialSheets={sheets} />
      </main>
    </div>
  );
}
