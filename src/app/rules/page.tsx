import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import {
  RULES_EFFECTIVE_DATE,
  RULES_TITLE,
  RULES_VERSION,
  RULE_CHAPTERS,
} from "@/lib/content/rulesFacts";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Article, ArticleLayout } from "@/components/ui/ArticleLayout";
import { ArrowRight, Band, ButtonLink, CTABand, Note, PageHead } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 규약 | 서울아레나",
};

/**
 * BOOK IT › 대관 규약 — 규약 전문을 웹에 싣는다.
 * 레이아웃은 Figma `2607 서울아레나 웹사이트 Full › Wireframe › Content / 1`
 * (좌 스티키 목차 + 우 본문).
 */
export default async function RulesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/rules" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="BOOKING AGREEMENT"
            ko="대관 규약"
            lead={`${RULES_TITLE} 전문입니다. 대관을 신청하시면 이 규약에 동의하신 것으로 보며, 신청서 제출 단계에서 동의를 확인합니다.`}
          />
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3">
            {(
              [
                ["버전", RULES_VERSION],
                ["시행일", RULES_EFFECTIVE_DATE],
                ["구성", `${RULE_CHAPTERS.length}개 장 · ${RULE_CHAPTERS.reduce((n, c) => n + c.articles.length, 0)}개 조`],
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
            sections={RULE_CHAPTERS.map((ch) => ({
              id: ch.id,
              title: ch.title,
              body: ch.articles.map((a) => (
                <Article key={a.title} title={a.title} paragraphs={a.paragraphs} />
              )),
            }))}
          />
        </Band>

        <CTABand
          title="규약을 확인하셨다면 대관 신청으로 이동하세요."
          actions={
            <>
              <ButtonLink href="/apply" variant="primary">
                대관 신청
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/documents" variant="secondary">
                대관 자료
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
