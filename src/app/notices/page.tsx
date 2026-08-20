import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listNoticesPaged, normalizePage } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { TagBadge, isPinnedTag } from "@/components/TagBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  EmptyState,
  PageHeading,
  Row,
  RowList,
} from "@/components/ui/kit";
import { Pagination } from "@/components/Pagination";
import type { Notice } from "@/lib/pricing/types";

export const metadata: Metadata = {
  title: "공지사항 | 서울아레나",
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
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: notices, total, totalPages } = await listNoticesPaged(page);

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
          <PageHeading
            title="공지사항"
            lead="대관 접수 일정과 변경 사항, 시설·요금 안내를 이곳에 게시합니다. 대관 일정의 기준은 이 페이지의 공고입니다. 다른 화면에 표시된 일정과 다르게 보일 경우 이 페이지의 최신 공고를 기준으로 판단해 주세요."
          />
        </Band>

        {notices.length === 0 ? (
          <Band tone="white" size="md">
            <EmptyState
              title="등록된 공지가 없습니다"
              desc="대관 공고와 운영 안내가 등록되면 이곳에 표시됩니다."
              action={
                <ButtonLink href="/guide" variant="secondary">
                  대관 안내 보기
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
                <p className="measure mt-4 break-keep text-s text-muted">
                  접수 기간이 지난 공고는 전체 목록으로 내려갑니다. 접수 일정이 바뀌면 해당 공고를
                  갱신해 안내합니다.
                </p>
                <NoticeRows notices={pinned} pinned />
              </Band>
            )}

            <Band tone="light" size="md" divide={pinned.length === 0}>
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

        <CTABand
          title="찾는 답이 공지에 없나요?"
          lead="자주 묻는 질문을 먼저 확인해 주세요. 접수 일정이나 요금처럼 여러 대관사에 공통으로 해당하는 내용은 공지사항과 FAQ에 먼저 반영합니다."
          actions={
            <>
              <ButtonLink href="/faq" variant="primary">
                자주 묻는 질문
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/mypage/inquiries" variant="secondary">
                1:1 문의
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
