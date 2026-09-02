import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getRulesContent } from "@/lib/db";
import { isRulesBotConfigured } from "@/lib/rulesBot";
import { parseRules } from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArticleLayout } from "@/components/ui/ArticleLayout";
import { RulesBot } from "@/components/rules/RulesBot";
import { Band, ButtonLink, DownloadIcon, Note, PageHead, Prose } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 규약",
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
            lead={<Prose text={content.intro} />}
          />
          {/*
            버전·시행일·구성과 그 아래 개정 안내는 **지면의 절반**(12칼럼 중 6)에서 끝난다.
            `measure`(768px 고정)로 잡아 두었더니 이 블록만 컬럼 경계에서 벗어나 끝나서,
            아래 규약 본문(목차 3 : 본문 9)과 세로선이 맞지 않았다. 아래 두 페이지와
            같은 그리드 위에 올린다.
          */}
          <div className="grid-site mt-10">
            <div className="lg:col-span-6">
              <dl className="flex flex-wrap gap-x-10 gap-y-3">
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
              {(content.revisionNote ?? "").trim() && (
                <Note className="mt-8">
                  <Prose text={content.revisionNote} gap="mt-3" />
                </Note>
              )}

              {/* [신규 2026-09-02] 규약 파일 내려받기. 웹 본문이 정본이고 이 파일은 사본이라,
                  올려 두지 않은 동안에는 버튼 자체를 띄우지 않는다 — 눌러야 없다는 걸 아는
                  버튼은 고장으로 보인다. */}
              {/* 주소는 우리 업로드 라우트가 발급한 것만 링크로 만든다 — 콘텐츠에 임의
                  URL 이 들어가면 규약 화면이 외부 링크를 내보내는 통로가 된다. */}
              {content.fileUrl.startsWith("/api/content/document/") ? (
                <div className="mt-8">
                  <ButtonLink
                    href={`${content.fileUrl}${content.fileName ? `?name=${encodeURIComponent(content.fileName)}` : ""}`}
                    variant="secondary"
                  >
                    <DownloadIcon />
                    대관 규약 내려받기
                  </ButtonLink>
                  {content.fileName ? (
                    <p className="mt-2 text-xs text-muted">{content.fileName}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Band>

        {/* 문답을 전문 위에 둔다 — 규약을 처음부터 읽을 사람은 적고, 대개 한 가지를
            확인하러 온다. 키가 없는 환경(로컬·미설정)에서는 아예 그리지 않는다. */}
        {isRulesBotConfigured() && (
          <Band tone="white">
            <div className="measure">
              <RulesBot />
            </div>
          </Band>
        )}

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
