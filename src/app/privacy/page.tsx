import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPrivacyContent } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 서울아레나",
};

const RICH_TEXT_CLS =
  "[&_h2]:mt-8 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_strong]:text-foreground [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12.5px] [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-panel-strong [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left";

export default async function PrivacyPage() {
  const currentUser = await getCurrentUser();
  const content = await getPrivacyContent();
  const bodyHtml = sanitizeRichText(content.bodyHtml);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/privacy" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">PRIVACY</p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight sm:text-[32px]">개인정보처리방침</h1>
        <p className="mt-4 text-[12.5px] text-muted">시행일: {content.effectiveDate}</p>

        <div
          className={`mt-10 text-[13.5px] leading-7 text-muted ${RICH_TEXT_CLS}`}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </main>

      <PublicFooter />
    </div>
  );
}
