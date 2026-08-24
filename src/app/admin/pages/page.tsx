import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listPages } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { PagesManager } from "@/components/admin/PagesManager";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminPagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const pages = await listPages();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/pages" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>페이지 관리</h1>
          <p className={PAGE_LEAD}>
            &ldquo;서울아레나 소개&rdquo;, &ldquo;대관 절차&rdquo;의 하위 페이지를 추가·수정·삭제하고
            순서를 조정합니다. 저장하면 즉시 대관사가 보는 화면에 반영됩니다.
          </p>
        </header>

        <PagesManager pages={pages} />
      </main>
    </div>
  );
}
