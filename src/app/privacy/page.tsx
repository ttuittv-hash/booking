import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPrivacyContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 서울아레나",
};

/**
 * 약관·정책은 개정이 잦아 본문을 백오피스에서 통째로 갈아 끼운다(`/admin/content`).
 * 화면은 리치텍스트를 `sanitizeRichText()` 로 거른 뒤 렌더한다.
 */
const RICH = [
  "[&_h2]:type-kr-heading [&_h2]:mt-10 [&_h2]:text-h6-m [&_h2]:sm:text-h6 [&_h2]:text-foreground [&_h2]:first:mt-0",
  "[&_p]:mt-3 [&_p]:first:mt-0",
  "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
  "[&_li]:break-keep",
  "[&_strong]:font-bold [&_strong]:text-foreground",
  // 표는 좁은 화면에서 옆으로 넘칠 수 있다 — 페이지가 아니라 표 스스로 가로 스크롤한다.
  "[&_table]:mt-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-s",
  "[&_th]:border-b [&_th]:border-border/40 [&_th]:py-2.5 [&_th]:pr-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:text-muted",
  "[&_td]:border-b [&_td]:border-border/15 [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top",
].join(" ");

export default async function PrivacyPage() {
  const currentUser = await getCurrentUser();
  const content = await getPrivacyContent();
  const bodyHtml = sanitizeRichText(content.bodyHtml);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/privacy" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead en="PRIVACY POLICY" ko="개인정보처리방침" lead={`시행일 ${content.effectiveDate}`} />
        </Band>

        <Band tone="light">
          <div
            className={`measure text-s leading-7 text-muted-strong ${RICH}`}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
