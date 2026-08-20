import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getRulesContent } from "@/lib/db";
import { parseRules } from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArticleLayout } from "@/components/ui/ArticleLayout";
import { Band, Note, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 규약 | 서울아레나",
};

/**
 * BOOK IT › 대관 규약 — 규약 전문을 웹에 싣는다.
 * 레이아웃은 Figma `2607 서울아레나 웹사이트 Full › Wireframe › Content / 1`
 * (좌 스티키 목차 + 우 본문).
 */
export default async function RulesPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/rules");
  const [currentUser, content] = await Promise.all([getCurrentUser(), getRulesContent()]);

  const chapters = parseRules(content.body);
  const articleCount = chapters.reduce((n, c) => n + c.articles.length, 0);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/rules" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="BOOKING AGREEMENT"
            ko="대관 규약"
            lead={`${content.title} 전문입니다. 대관을 신청하시면 이 규약에 동의하신 것으로 보며, 신청서 제출 단계에서 동의를 확인합니다.`}
          />
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3">
            {(
              [
                ["버전", content.version],
                ["시행일", content.effectiveDate],
                ["구성", `${chapters.length}개 장 · ${articleCount}개 조`],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold text-muted">{k}</dt>
                <dd className="mt-1 text-s font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <Note className="measure mt-8">
            개정된 내용은 홈페이지 공지 또는 별도 통지 중 빠른 시점 이후 신규 체결되는
            대관계약부터 적용합니다. 이미 체결된 대관계약에는 계약 체결 시점의 규약을 적용합니다.
          </Note>
        </Band>

        <Band tone="white">
          <ArticleLayout
            searchLabel="규약 내 검색"
            searchPlaceholder="예: 위약금, 반입, 정산"
            sections={chapters.map((ch) => ({
              id: ch.id,
              title: ch.title,
              articles: ch.articles,
            }))}
          />
        </Band>

      </main>

      <SiteFooter />
    </div>
  );
}
