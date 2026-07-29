import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listFaqs, listNotices } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { ContentManager } from "@/components/admin/ContentManager";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const notices = listNotices();
  const faqs = listFaqs();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/content" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">공지사항 / FAQ 관리</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          여기서 등록·수정한 내용은 대관사가 보는 &ldquo;공지사항&rdquo;, &ldquo;FAQ&rdquo; 메뉴에 바로 반영됩니다.
        </p>

        <ContentManager notices={notices} faqs={faqs} />
      </main>
    </div>
  );
}
