import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getDocumentsContent } from "@/lib/db";
import type { DocumentBlock, DocumentsContent } from "@/lib/content/pageContent";
import type { DocItem } from "@/components/ui/kit";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TABS, VENUE_TAB_PARAM } from "@/components/ui/nav-items";
import { Band, DocumentList, PageHead, Prose } from "@/components/ui/kit";

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

function DocPanel({
  en,
  ko,
  items,
  content,
}: {
  en: string;
  ko: string;
  items: DocumentBlock[];
  content: DocumentsContent;
}) {
  return (
    <Band tone="light" size="lg">
      <PageHead en={en} ko={ko} lead={<Prose text={content.lead} />} />
      <div className="mt-10">
        <DocumentList items={items.map(toDocItem)} emptyNote={content.emptyNote} />
      </div>
    </Band>
  );
}

/**
 * BOOK IT › 대관 자료 — 탭: 시설소개 / 아레나 / 중형공연장.
 *
 * 시설소개자료는 두 공간을 함께 담은 하나의 문서이므로 공간 탭마다 같은 파일을
 * 걸지 않고 `시설소개` 탭이 소유한다. 기본 탭도 자료가 실제로 있는 이 탭이다.
 */
const DOC_TABS = [{ value: "facility", label: "시설소개" }, ...VENUE_TABS] as const;

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
          ariaLabel="자료 구분"
          items={DOC_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel:
              t.value === "facility" ? (
                <DocPanel
                  en="VENUE OVERVIEW"
                  ko="시설소개 자료"
                  items={content.facility}
                  content={content}
                />
              ) : t.value === "arena" ? (
                <DocPanel
                  en="ARENA DOCUMENTS"
                  ko="아레나 대관 자료"
                  items={content.arena}
                  content={content}
                />
              ) : (
                <DocPanel
                  en="LIVE HALL DOCUMENTS"
                  ko="중형공연장 대관 자료"
                  items={content.liveHall}
                  content={content}
                />
              ),
          }))}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
