import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getDocumentsContent,
  getFeaturesContent,
  getGuidePageContent,
  getHomeContent,
  getPrivacyContent,
  getRatesContent,
  getRulesContent,
  getScreenTextContent,
  getSeoulArenaContent,
  getTermsContent,
  listFaqs,
  listNotices,
} from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { ContentManager } from "@/components/admin/ContentManager";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const [
    notices,
    faqs,
    homeContent,
    seoulArenaContent,
    featuresContent,
    guideContent,
    ratesContent,
    rulesContent,
    documentsContent,
    screenTextContent,
    termsContent,
    privacyContent,
  ] = await Promise.all([
    listNotices(),
    listFaqs(),
    getHomeContent(),
    getSeoulArenaContent(),
    getFeaturesContent(),
    getGuidePageContent(),
    getRatesContent(),
    getRulesContent(),
    getDocumentsContent(),
    getScreenTextContent(),
    getTermsContent(),
    getPrivacyContent(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/content" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>콘텐츠 관리</h1>
          <p className={PAGE_LEAD}>
            공지사항·FAQ와 공개 화면(홈 · 서울아레나 · 시설 제원 · 대관 안내 · 대관료 · 대관 규약 ·
            대관 자료)의 내용을 여기서 관리합니다. 공지사항·FAQ·대관 신청·오시는 길처럼 본문이
            게시물이나 폼인 화면의 문구는 `화면 문구` 탭에 있습니다. 여러 줄 입력칸에서는 Enter 로
            줄을 바꾸고 빈 줄로 문단을 나누면 화면에도 그대로 나갑니다. 저장하면 해당 화면에 바로
            반영됩니다.
          </p>
        </header>

        <ContentManager
          notices={notices}
          faqs={faqs}
          homeContent={homeContent}
          seoulArenaContent={seoulArenaContent}
          featuresContent={featuresContent}
          guideContent={guideContent}
          ratesContent={ratesContent}
          rulesContent={rulesContent}
          documentsContent={documentsContent}
          screenTextContent={screenTextContent}
          termsContent={termsContent}
          privacyContent={privacyContent}
        />
      </main>
    </div>
  );
}
