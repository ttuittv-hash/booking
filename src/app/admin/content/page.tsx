import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGuideContent, getHomeContent, getVenueContent, listFaqs, listNotices } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { ContentManager } from "@/components/admin/ContentManager";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const notices = listNotices();
  const faqs = listFaqs();
  const homeContent = getHomeContent();
  const venueContent = getVenueContent();
  const guideContent = getGuideContent();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/content" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">콘텐츠 관리</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          공지사항·FAQ와 &ldquo;서울아레나 소개&rdquo;, &ldquo;대관 안내&rdquo; 페이지 내용을 여기서 관리합니다.
          저장하면 해당 화면에 바로 반영됩니다.
        </p>

        <ContentManager
          notices={notices}
          faqs={faqs}
          homeContent={homeContent}
          venueContent={venueContent}
          guideContent={guideContent}
        />
      </main>
    </div>
  );
}
