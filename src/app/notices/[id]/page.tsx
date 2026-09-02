import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { DATA_DIR } from "@/lib/dataDir";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getNoticeById, getNoticeCalendarWindow } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { splitNoticeBodyAtCalendarMarker } from "@/lib/content/noticeCalendarMarker";
import {
  initialCalendarMonth,
  kstNowMonth,
  noticeCalendarMonthBounds,
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
  /*
    [개정 2026-09-02] 첨부해 주신 보고서(2027 대관 계획 PDF)의 조판을 옮겼다.
    그 문서에서 뽑은 실제 값: 제목 24/20pt · 절 제목 14pt(위에 영문 눈썹 9pt) ·
    본문 9~9.5pt · 표 8~8.5pt · 각주 7pt. 괘선은 0.53~0.75pt 한 겹(#DDD)뿐이고,
    쓰는 색면은 **지면(#F2F0EF) 위의 흰 표 면(#FFF)** 하나다.
    (본문 9pt 는 A4 기준이라 화면에서는 16px 로 옮기고, 위계 비율만 그대로 가져온다.)

    그래서 이 화면의 규칙은 네 줄이다.
      · 구조는 헤어라인으로만 만든다 — 그림자도 라운딩도 없다.
      · 절 제목은 [영문 눈썹 + 국문 제목] 두 줄이고, 위의 가로선에 얹힌다.
      · 표는 지면 위에 흰 면으로 얹고, 세로선을 긋지 않는다. 머리행만 굵은 선으로.
      · 표 바로 아래 한 줄은 각주다 — 한 단 더 작고 옅게.
  */
  "whitespace-pre-line break-keep text-[1rem] leading-[1.8] tracking-[-0.005em] text-muted-strong",

  "[&_p]:my-5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_p:empty]:hidden",

  /*
    [개정 2026-09-02] 원본 문서(Pages)의 절 머리를 그대로 옮긴다 — 작은 영문 눈썹
    (01 OVERVIEW, 9pt 상당) 아래에 국문 제목(14pt 상당)이 오는 두 줄 구조다.
    `<h2><span>01 OVERVIEW</span>공고 개요</h2>` 처럼 쓰면 이 규칙이 걸린다.
  */
  "[&_h2>span:first-child]:mb-1.5 [&_h2>span:first-child]:block [&_h2>span:first-child]:text-xs [&_h2>span:first-child]:font-bold [&_h2>span:first-child]:uppercase [&_h2>span:first-child]:tracking-[0.14em] [&_h2>span:first-child]:text-muted [&_h2>span:first-child]:[font-family:Archivo,sans-serif]",

  // 소제목 — 위에 헤어라인을 깔고 그 위에 얹는다(보고서의 절 구분)
  "[&_h2]:type-kr-heading [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:border-t [&_h2]:border-foreground [&_h2]:pt-5 [&_h2]:text-h6-m [&_h2]:tracking-[-0.02em] [&_h2]:text-foreground sm:[&_h2]:text-h6",
  "[&_h2:first-child]:mt-0 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0",
  // 그 아래 단계는 선 없이 굵기만으로 — 선을 두 겹 그으면 위계가 뭉갠다
  "[&_h3]:type-kr-heading [&_h3]:mt-9 [&_h3]:mb-2.5 [&_h3]:text-s [&_h3]:font-bold [&_h3]:tracking-[-0.01em] [&_h3]:text-foreground",
  "[&_h3:first-child]:mt-0",

  "[&_strong]:font-bold [&_strong]:text-foreground",
  "[&_em]:italic",
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:decoration-1 [&_a]:underline-offset-[0.3em] [&_a]:transition-colors hover:[&_a]:decoration-foreground",

  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mt-2 [&_li]:pl-1.5 [&_li]:marker:text-muted",
  "[&_li>ul]:my-2 [&_li>ol]:my-2",

  "[&_blockquote]:my-7 [&_blockquote]:border-l [&_blockquote]:border-foreground/30 [&_blockquote]:pl-5 [&_blockquote]:text-muted",
  "[&_hr]:my-12 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border",

  "[&_img]:my-10 [&_img]:w-full",

  /*
    표 — 원본은 따뜻한 회백색 지면 위에 **흰 면**으로 얹혀 있다(PDF 실측: 지면
    #F2F0EF · 표 면 #FFF · 괘선 #DDD 0.53~0.75pt). 우리 토큰으로는 지면이
    background, 흰 면이 panel, 괘선이 border-soft 다.
  */
  "[&_table]:my-7 [&_table]:w-auto [&_table]:min-w-full [&_table]:border-collapse [&_table]:bg-panel [&_table]:text-s [&_table]:leading-6 [&_table]:tabular-nums",
  "[&_thead]:border-y [&_thead]:border-foreground",
  "[&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-foreground",
  // 머리행이 아니라 **행 이름**으로 쓴 th(왼쪽 첫 칸) — 값 열이 들쭉날쭉하지 않게
  // 폭을 잡아 주고 위로 붙인다. 보고서의 좌측 항목열과 같은 자리다.
  "[&_tbody_th]:w-40 [&_tbody_th]:align-top [&_tbody_th]:text-muted-strong",
  "[&_tbody_tr]:border-b [&_tbody_tr]:border-border-soft",
  "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top",
  // 표 바로 아래 한 줄은 각주다 — 원본처럼 한 단 더 작고 옅게
  "[&_table+p]:mt-3 [&_table+p]:text-xs [&_table+p]:leading-6 [&_table+p]:text-muted",

  "[&_details]:my-7 [&_details]:border-y [&_details]:border-border-soft [&_details]:py-4",
  "[&_summary]:cursor-pointer [&_summary]:font-bold [&_summary]:text-foreground",
  "[&_[data-type=detailsContent]]:mt-3",
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

  // 캘린더가 보여 줄 달의 범위(2026-09-02). 이번 회차에 신청받는 달만 넘겨 보게 한다 —
  // 접수와 무관한 달까지 넘겨 볼 수 있으면 그 달도 신청할 수 있다고 읽힌다.
  /*
    첨부가 실제로 있는지 본다 (2026-09-02).

    주소만 있고 파일이 없으면 화면에는 깨진 상자(엑박)만 남는다 — 환경을 옮기거나
    디스크가 비면 실제로 그렇게 됐다. 파일이 없으면 첨부 자리를 아예 내지 않는다.
  */
  const attachmentFile = /^\/api\/notices\/attachment\/([0-9a-f-]{36}\.[a-z0-9]{1,10})$/.exec(
    notice.attachmentUrl ?? "",
  )?.[1];
  const attachmentExists = attachmentFile
    ? await fs
        .stat(path.join(DATA_DIR, "uploads", "notice-attachments", attachmentFile))
        .then(() => true)
        .catch(() => false)
    : false;

  const calendarBounds = noticeCalendarMonthBounds(calendarWindow);
  const calendarSlot = (
    <BookingCalendarLauncher
      initialMonth={initialCalendarMonth(calendarWindow, kstNowMonth(new Date()))}
      startMonth={calendarBounds.start}
      endMonth={calendarBounds.end}
    />
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
                /* 보고서 표지처럼 — 제목 아래 굵은 선 하나로 머리와 본문을 가른다.
                   말머리·날짜는 그 선 위에 얹는 최소한의 서지 정보다(2026-09-02). */
                <span className="flex flex-wrap items-center gap-3 border-t border-foreground pt-4 text-xs text-muted">
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

            {notice.attachmentUrl && attachmentExists && (
              <div className="mt-10 border-t border-border/25 pt-10">
                <h2 className="type-kr-heading mb-4 text-h6-m sm:text-h6">첨부파일</h2>
                {/* [신규 2026-09-02] PDF 는 화면에서 그대로 펼친다 — 공고문을 PDF 로
                    올렸을 때 내려받아야만 볼 수 있으면 공지를 열어도 내용이 없다.
                    브라우저 뷰어가 없으면(구형·일부 모바일) 아래 내려받기로 간다. */}
                {(notice.attachmentName ?? notice.attachmentUrl).toLowerCase().endsWith(".pdf") && (
                  <object
                    data={`${notice.attachmentUrl}?inline=1&name=${encodeURIComponent(notice.attachmentName ?? "첨부파일.pdf")}`}
                    type="application/pdf"
                    className="mb-4 h-[80vh] w-full border border-border/25"
                    aria-label={notice.attachmentName ?? "첨부 PDF"}
                  >
                    <p className="px-5 py-4 text-s text-muted">
                      이 브라우저에서는 PDF 미리보기를 열 수 없습니다. 아래에서 내려받아
                      확인해 주세요.
                    </p>
                  </object>
                )}
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
