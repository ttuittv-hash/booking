import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getNoticeById, getNoticeCalendarWindow } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { splitNoticeBodyAtCalendarMarker } from "@/lib/content/noticeCalendarMarker";
import {
  kstNowLocal,
  noticeCalendarClosedMessage,
  noticeCalendarWindowState,
} from "@/lib/content/noticeCalendarWindow";
import { BookingCalendarLauncher } from "@/components/BookingAvailabilityCalendar";
import { Fragment } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { TagBadge } from "@/components/TagBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, Media, PageHeading } from "@/components/ui/kit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const notice = await getNoticeById(id);
  return { title: notice ? `${notice.title} | 서울아레나 공지사항` : "공지사항 | 서울아레나" };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/*
  본문(운영자 리치 에디터 HTML) 타이포 — 전부 디자인 토큰으로. 라운딩 없음.

  [개정 2026-09-02] 읽기 리듬을 다시 잡았다. 문단 여백이 0(`[&_p]:my-0`)이라 본문이
  글자 벽처럼 붙어 나왔고, `whitespace-pre-wrap` 때문에 에디터가 뱉은 HTML 의 들여쓰기
  공백까지 지면에 그대로 찍혔다. 문단 사이를 띄우고, 줄바꿈만 살리는 `pre-line` 으로
  바꾼다. 예전 본문이 줄바꿈용으로 넣어 둔 빈 문단은 이제 여백이 대신하므로 감춘다.
*/
const PROSE = [
  // 본문 기본값 — 글자를 한 단 키우고 줄 간격을 넉넉히. 공지는 훑는 글이 아니라
  // 처음부터 끝까지 읽는 글이라, 좁은 줄 길이(`measure`)와 큰 행간이 읽기를 돕는다.
  "whitespace-pre-line break-keep text-[1.0625rem] leading-[1.85] tracking-[-0.01em] text-muted-strong",

  // 문단 — 한 칸 띄우되 첫/끝 문단은 섹션 여백과 겹치지 않게 붙인다
  "[&_p]:my-6 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_p:empty]:hidden",

  // 제목 — 위는 크게 비우고 아래는 붙여, 제목이 아래 문단에 속해 보이게 한다.
  // 자간을 좁혀 국문 제목이 뭉툭해 보이지 않게 한다.
  "[&_h2]:type-kr-heading [&_h2]:mt-16 [&_h2]:mb-5 [&_h2]:text-h5-m [&_h2]:tracking-[-0.02em] [&_h2]:text-foreground sm:[&_h2]:text-h5",
  "[&_h3]:type-kr-heading [&_h3]:mt-12 [&_h3]:mb-3 [&_h3]:text-h6-m [&_h3]:tracking-[-0.02em] [&_h3]:text-foreground sm:[&_h3]:text-h6",
  "[&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0",

  "[&_strong]:font-bold [&_strong]:text-foreground",
  "[&_em]:italic",
  // 링크 — 밑줄은 옅게 깔고 올렸을 때만 또렷해진다. 본문 흐름을 끊지 않는다.
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:decoration-1 [&_a]:underline-offset-[0.3em] [&_a]:transition-colors hover:[&_a]:decoration-foreground",

  // 목록 — 불릿은 본문보다 옅게 둬서 글자가 먼저 읽히게 한다
  "[&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mt-2.5 [&_li]:pl-1.5 [&_li]:marker:text-muted",
  "[&_li>ul]:my-2.5 [&_li>ol]:my-2.5",

  // 인용 — 선은 가늘게, 글자는 한 단 옅게. 본문과 구분되되 튀지 않는다.
  "[&_blockquote]:my-8 [&_blockquote]:border-l [&_blockquote]:border-foreground/30 [&_blockquote]:pl-6 [&_blockquote]:text-muted",
  "[&_hr]:mx-auto [&_hr]:my-14 [&_hr]:w-16 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border",

  // 이미지 — 위아래로 크게 띄워 한 장씩 숨을 쉬게 한다
  "[&_img]:my-12 [&_img]:w-full",

  // 표 — 세로선을 걷어내고 가로선만 남긴다. 머리행은 굵은 선으로 눌러 준다.
  "[&_table]:my-8 [&_table]:w-auto [&_table]:min-w-full [&_table]:border-collapse [&_table]:text-s",
  "[&_thead]:border-b-2 [&_thead]:border-foreground",
  "[&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:font-bold [&_th]:text-foreground",
  "[&_tbody_tr]:border-b [&_tbody_tr]:border-border-soft",
  "[&_td]:px-3 [&_td]:py-3 [&_td]:align-top",

  "[&_details]:my-8 [&_details]:border-y [&_details]:border-border-soft [&_details]:py-4",
  "[&_summary]:cursor-pointer [&_summary]:font-bold [&_summary]:text-foreground",
  "[&_[data-type=detailsContent]]:mt-4",
].join(" ");

const PROSE_BLOCK = "overflow-x-auto";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/notices/[id]");
  const currentUser = await getCurrentUser();

  const { id } = await params;
  const [notice, calendarWindow] = await Promise.all([getNoticeById(id), getNoticeCalendarWindow()]);
  if (!notice) notFound();

  // 공개 기간 밖이면 캘린더 자리에 안내 문구를 놓는다(2026-09-02). 대관 접수는 회차로
  // 돌기 때문에 접수 기간이 아닐 때 현황 캘린더가 열려 있으면 신청할 수 있다고 읽힌다.
  const calendarState = noticeCalendarWindowState(calendarWindow, kstNowLocal(new Date()));
  const calendarClosedNote = noticeCalendarClosedMessage(calendarWindow, calendarState);
  const calendarSlot =
    calendarState === "OPEN" ? (
      <BookingCalendarLauncher />
    ) : (
      <p className="border-l-2 border-foreground bg-warn-soft px-4 py-3 text-s text-muted-strong">
        {calendarClosedNote}
      </p>
    );

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/notices" currentUser={currentUser} />
      {/* 3뎁스 — 부모(공지사항)를 포함해 2개 */}
      <Breadcrumb items={[{ label: "공지사항", href: "/notices" }, { label: "상세" }]} />

      <main className="flex flex-1 flex-col">
        {/* 제목 · 메타 — 본문 폭 유지 */}
        <Band tone="light" size="md">
          <div className="max-w-3xl">
            <PageHeading
              size="md"
              title={notice.title}
              lead={
                <span className="flex flex-wrap items-center gap-3 border-t border-border/25 pt-5 text-xs text-muted">
                  <TagBadge tag={notice.tag} spacing={false} />
                  <time className="tabular-nums" dateTime={notice.createdAt}>
                    {formatDateTime(notice.createdAt)}
                  </time>
                </span>
              }
            />
            {notice.showBookingCalendar && (
              <div className="mt-5">{calendarSlot}</div>
            )}
          </div>
        </Band>

        {/* 본문 · 첨부 */}
        <Band tone="white" size="md">
          <div className="max-w-3xl">
            {notice.imageUrl && (
              <Media src={notice.imageUrl} alt={notice.title} ratio="auto" className="mb-10" />
            )}

            {/* 운영자 리치 에디터 HTML — 스크립트·이벤트 핸들러를 제거한 뒤 렌더한다.
                "+ 대관 캘린더" 버튼으로 넣은 마커는 실시간 데이터를 불러오는 컴포넌트라
                정적 HTML에 섞을 수 없어, 마커 기준으로 잘라 그 사이에 실제 컴포넌트를 끼운다. */}
            {(() => {
              const segments = splitNoticeBodyAtCalendarMarker(sanitizeRichText(notice.body));
              return segments.map((segment, i) => (
                <Fragment key={i}>
                  {segment.trim() && (
                    <div className={PROSE_BLOCK}>
                      <div className={PROSE} dangerouslySetInnerHTML={{ __html: segment }} />
                    </div>
                  )}
                  {i < segments.length - 1 && (
                    <div className="my-6">{calendarSlot}</div>
                  )}
                </Fragment>
              ));
            })()}

            {notice.attachmentUrl && (
              <div className="mt-10 border-t border-border/25 pt-10">
                <h2 className="type-kr-heading mb-4 text-h6-m sm:text-h6">첨부파일</h2>
                <a
                  href={`${notice.attachmentUrl}?name=${encodeURIComponent(notice.attachmentName ?? "첨부파일")}`}
                  className="group flex items-center justify-between gap-6 border border-border/25 px-5 py-4 transition-colors hover:border-foreground"
                >
                  <span className="min-w-0 truncate text-s font-bold">
                    {notice.attachmentName ?? "첨부파일"}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-muted transition-colors group-hover:text-foreground">
                    내려받기
                  </span>
                </a>
              </div>
            )}

            <div className="mt-10 border-t border-border/25 pt-10">
              <ButtonLink href="/notices" variant="secondary">
                공지사항 목록
                <ArrowRight />
              </ButtonLink>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
