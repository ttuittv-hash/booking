import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, getRatesContent, getScreenTextContent } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { PackagesForm } from "@/components/admin/PackagesForm";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminPackagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const [rateTable, ratesContent, screenText] = await Promise.all([
    getCurrentRateTable(),
    getRatesContent(),
    // 공간 탭 이름은 운영자가 문구 관리에서 바꾼 값을 쓴다 — 위저드와 같은 말이어야 한다.
    getScreenTextContent(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/packages" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/25 pb-6">
          <h1 className={PAGE_TITLE}>패키지 관리</h1>
          <p className={PAGE_LEAD}>
            패키지 이름·기본 대관료·객석 규모·매체 등급·기본 포함 항목을 한 화면에서 편집하고, 새
            패키지도 추가할 수 있습니다. 부대시설 단가와 공통 요율은 &ldquo;요금표 관리&rdquo;에서
            수정하세요.
          </p>
        </header>

        <PackagesForm
          rateTable={rateTable}
          ratesContent={ratesContent}
          wizardStrings={screenText.wizardStrings}
        />
      </main>
    </div>
  );
}
