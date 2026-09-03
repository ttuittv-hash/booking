import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getScreenTextContent, listNoticesPaged, normalizePage } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { TagBadge, isPinnedTag } from "@/components/TagBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  Band,
  ButtonLink,
  EmptyState,
  PageHead,
  Prose,
  Row,
  RowList,
} from "@/components/ui/kit";
import { Pagination } from "@/components/Pagination";
import type { Notice } from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "공지사항",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function NoticeRows({ notices, pinned = false }: { notices: Notice[]; pinned?: boolean }) {
  return (
    <RowList className="mt-8">
      {notices.map((notice) => (
        <Row
          key={notice.id}
          href={`/notices/${notice.id}`}
          lead={
            <span className="flex items-center gap-2">
              {pinned && <span aria-hidden className="h-2 w-2 shrink-0 bg-accent" />}
              <time dateTime={notice.createdAt}>{formatDate(notice.createdAt)}</time>
            </span>
          }
          title={notice.title}
          meta={<TagBadge tag={notice.tag} spacing={false} />}
        />
      ))}
    </RowList>
  );
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/notices");
  const currentUser = await getCurrentUser();

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const [{ items: notices, total, totalPages }, screenText] = await Promise.all([
    listNoticesPaged(page),
    getScreenTextContent(),
  ]);

  // 표시 레벨 정렬만 한다 — 데이터(정렬: 최신순)는 그대로 두고 대관 공고 계열 태그를
  // 상단 고정 그룹으로 끌어올린다. Notion 기획 › 공지사항 "진행 중 대관 공고 우선 노출".
  const pinned = notices.filter((n) => isPinnedTag(n.tag));
  const rest = notices.filter((n) => !isPinnedTag(n.tag));

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/notices" currentUser={currentUser} />
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "공지사항" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="NOTICES"
            ko="공지사항"
            lead={<Prose text={screenText.noticesLead} />}
          />
        </Band>

        {notices.length === 0 ? (
          <Band tone="white" size="md">
            <EmptyState
              title="등록된 공지가 없습니다"
              desc={screenText.noticesEmptyDesc}
              action={
                <ButtonLink href="/guide" variant="secondary">
                  대관 절차 보기
                </ButtonLink>
              }
            />
          </Band>
        ) : (
          <>
            {pinned.length > 0 && (
              <Band tone="white" size="md">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="h-3 w-3 bg-accent" />
                  <h2 className="type-kr-heading text-h5-m sm:text-h5">진행 중인 대관 공고</h2>
                </div>
                <NoticeRows notices={pinned} pinned />
              </Band>
            )}

            {/* [삭제 2026-09-03] 「전체 공지」 위 가로줄은 두지 않는다 — 위 섹션과 지면색이
                갈리는 것으로 이미 구분되고, 줄까지 그으면 경계가 두 겹으로 쌓인다. */}
            <Band tone="light" size="md">
              {rest.length > 0 && (
                <>
                  <h2 className="type-kr-heading text-h5-m sm:text-h5">전체 공지</h2>
                  <NoticeRows notices={rest} />
                </>
              )}
              {/* 페이지네이션은 고정 공고를 포함한 한 페이지 전체(total/totalPages)를 기준으로 한다 */}
              <Pagination page={page} totalPages={totalPages} total={total} basePath="/notices" />
            </Band>
          </>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
