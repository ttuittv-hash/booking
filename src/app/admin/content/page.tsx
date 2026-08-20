import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGuideContent, getHomeContent, listFaqs, listNotices } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { ContentManager } from "@/components/admin/ContentManager";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const notices = await listNotices();
  const faqs = await listFaqs();
  const homeContent = await getHomeContent();
  const guideContent = await getGuideContent();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/content" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>콘텐츠 관리</h1>
          <p className={PAGE_LEAD}>
            공지사항·FAQ와 홈·대관 안내 페이지 내용을 여기서 관리합니다. 저장하면 해당 화면에 바로 반영됩니다.
            시설 정보(YOUR STAGE 4개 페이지)의 수치는 코드 정본으로 옮겨 이 화면에서 편집하지 않습니다.
          </p>
        </header>

        <ContentManager
          notices={notices}
          faqs={faqs}
          homeContent={homeContent}
          guideContent={guideContent}
        />
      </main>
    </div>
  );
}
