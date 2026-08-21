import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getDocumentsContent } from "@/lib/db";
import type { DocumentBlock } from "@/lib/content/pageContent";
import type { DocItem } from "@/components/ui/kit";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import {
  Band,
  DocumentList,
  PageHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 자료 | 서울아레나",
};

/** CMS 블록 → 표시용 아이템. 파일 주소가 비면 안내 문구가 버튼을 대신한다. */
function toDocItem(d: DocumentBlock): DocItem {
  return {
    title: d.title,
    desc: d.desc || undefined,
    meta: d.meta.map((m) => [m.label, m.value] as [string, string]),
    href: d.href || undefined,
    pendingNote: d.pendingNote || undefined,
  };
}

export default async function DocumentsPage() {
  const [currentUser, content] = await Promise.all([getCurrentUser(), getDocumentsContent()]);
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/documents" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          ariaLabel="공간 선택"
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel:
              t.value === "arena" ? (
                <Band tone="light" size="lg">
                  <PageHead en="ARENA DOCUMENTS" ko="아레나 대관 자료" lead={content.lead} />
                  <div className="mt-10">
                    <DocumentList items={content.arena.map(toDocItem)} />
                  </div>
                </Band>
              ) : (
                <Band tone="light" size="lg">
                  <PageHead
                    en="LIVE HALL DOCUMENTS"
                    ko="중형공연장 대관 자료"
                    lead={content.lead}
                  />
                  <div className="mt-10">
                    <DocumentList items={content.liveHall.map(toDocItem)} />
                  </div>
                </Band>
              ),
          }))}
        />

      </main>

      <SiteFooter />
    </div>
  );
}
