import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listNotices } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { TagBadge, isPinnedTag } from "@/components/TagBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, ButtonLink, EmptyState, Label, Row, RowList } from "@/components/ui/kit";
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

export default async function NoticesPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const notices = listNotices();

  // 표시 레벨 정렬만 한다 — 데이터(정렬: 최신순)는 그대로 두고 대관 공고 계열 태그를
  // 상단 고정 그룹으로 끌어올린다. Notion 기획 › 공지사항 "진행 중 대관 공고 우선 노출".
  const pinned = notices.filter((n) => isPinnedTag(n.tag));
  const rest = notices.filter((n) => !isPinnedTag(n.tag));

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/notices" currentUser={currentUser} />
      <Breadcrumb items={[{ label: "Know It" }, { label: "Notice" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <Label className="mb-6 text-muted">Know It</Label>
          <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Notice</h1>
          <p className="mt-8 max-w-3xl text-m text-muted">
            대관 공고, 운영정책 변경, 시스템 점검 안내를 여기서 확인하세요. 신청 전 최신 공지를 먼저
            확인하시기 바랍니다.
          </p>
        </Band>

        {notices.length === 0 ? (
          <Band tone="white" size="md">
            <EmptyState
              title="등록된 공지사항이 없습니다"
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
                  <Label className="text-muted">Now Open · 진행 중 대관 공고</Label>
                </div>
                <NoticeRows notices={pinned} pinned />
              </Band>
            )}

            {rest.length > 0 && (
              <Band tone="light" size="md" divide={pinned.length === 0}>
                <Label className="text-muted">All Notices</Label>
                <NoticeRows notices={rest} />
              </Band>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
