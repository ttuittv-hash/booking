import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getNoticeById, getNoticeCalendarWindow, getScreenTextContent } from "@/lib/db";
import { scheduleLegend } from "@/lib/content/scheduleLegend";
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
  "whitespace-pre-line break-keep text-r leading-[1.8] tracking-[-0.005em] text-muted-strong",

  "[&_p]:my-5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_p:empty]:hidden",

  /*
    [신규 2026-09-04] 공고문 인트로용 큰 영문 헤드라인 — 홈 히어로(page.tsx)와 같은
    `type-display` + d-스케일 조합을 그대로 가져온다(별도 폰트·크기를 새로 만들지 않는다).
    운영자가 HTML 소스 모드에서 <h1>영문 문구</h1> 로 쓰면 걸린다. 아래 노란 바는 실제
    엘리먼트가 아니라 CSS ::after 로 그린다 — sanitizer 가 style 에서 background-color 는
    허용해도 height 는 막아서, 얇은 바를 콘텐츠 쪽에서 만들 방법이 없기 때문이다.
  */
  "[&_h1]:type-display [&_h1]:mt-0 [&_h1]:mb-6 [&_h1]:text-h1-m [&_h1]:leading-[0.95] [&_h1]:text-foreground sm:[&_h1]:text-h1",
  "[&_h1]:after:mt-6 [&_h1]:after:block [&_h1]:after:h-1 [&_h1]:after:w-16 [&_h1]:after:bg-accent [&_h1]:after:content-['']",

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
    표 — 원본 문서를 그대로 옮긴다 (2026-09-02, PDF 페이지를 직접 렌더해 확인).

      · 머리행: **검정 면 + 흰 글자** (헤어라인이 아니라 꽉 찬 띠다)
      · 본문 칸: 회백색 지면(#F2F0EF) 위의 흰 면
      · 왼쪽 항목열: 옅은 회색 면 + 오른쪽 세로 괘선 — 값 열과 눈으로 갈린다
      · 나머지 괘선: #DDD 한 겹. 표 바깥 테두리는 없다
  */
  /* [수정 2026-09-04] 원본 공고문(PDF)은 표마다 폭이 다르지 않다 — 칸 수와 무관하게
     본문 칼럼 폭을 항상 꽉 채운다. `w-auto`(2026-09-03 보정)였을 때는 2단 표와 5단
     표의 가로폭이 서로 달라 지면이 들쭉날쭉해 보였다 — 원본처럼 꽉 채우는 것으로 되돌린다. */
  "[&_table]:my-7 [&_table]:w-full [&_table]:border-collapse [&_table]:bg-panel [&_table]:text-s [&_table]:leading-6 [&_table]:tabular-nums",
  /* [신규 2026-09-03] 편집기에서 열 폭을 끌어 맞춘 표는 그 폭대로 그린다.
     폭이 지정된 칸이 하나라도 있을 때만 고정 레이아웃으로 바꾼다 — 폭을 안 건드린
     기존 표까지 균등 분할로 만들면 지금 잘 나오는 표가 틀어진다. */
  "[&_table:has(td[style*=width],th[style*=width])]:table-fixed",
  "[&_thead]:bg-foreground",
  "[&_thead_th]:bg-foreground [&_thead_th]:text-background",
  "[&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold",
  // 행 이름으로 쓴 th(왼쪽 첫 칸) — 원본의 회색 항목열
  "[&_tbody_th]:w-44 [&_tbody_th]:border-r [&_tbody_th]:border-border-soft [&_tbody_th]:bg-panel-strong [&_tbody_th]:align-top [&_tbody_th]:text-foreground",
  "[&_tbody_tr]:border-b [&_tbody_tr]:border-border-soft",
  "[&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
  // 값 열 사이 세로 괘선 — 요금표처럼 열이 여럿인 표에서 숫자가 섞이지 않게
  "[&_td+td]:border-l [&_td+td]:border-border-soft",
  // 정가에 그은 취소선(원본의 할인 표기)
  "[&_s]:text-muted [&_s]:decoration-muted",
  // 표 바로 아래 한 줄은 각주다 — 원본처럼 한 단 더 작고 옅게
  "[&_table+p]:mt-3 [&_table+p]:text-xs [&_table+p]:leading-6 [&_table+p]:text-muted",

  "[&_details]:my-7 [&_details]:border-y [&_details]:border-border-soft [&_details]:py-4",
  "[&_summary]:cursor-pointer [&_summary]:font-bold [&_summary]:text-foreground",
  "[&_[data-type=detailsContent]]:mt-3",
].join(" ");

const PROSE_BLOCK = "overflow-x-auto";

/**
 * 공지 본문 칼럼 — 지면 **가운데, 12칼럼 중 6칼럼(2/4)** (2026-09-03).
 *
 * `max-w-3xl`(768px) 로 왼쪽에 붙여 두었더니 넓은 화면에서 본문이 한쪽으로 쏠리고,
 * 폭도 지면 그리드와 무관해 다른 화면과 세로선이 맞지 않았다. 공고처럼 길게 읽는 글은
 * 지면 한가운데 놓고 읽기 좋은 폭으로 좁히는 편이 낫다.
 * 제목·메타 블록에도 같은 칼럼을 써서 머리와 본문이 같은 축에 선다.
 */
const NOTICE_COLUMN = "mx-auto w-full lg:w-1/2";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  // [수정 2026-09-04] 라우트 패턴("/notices/[id]")을 넘기면 로그인 복귀 주소(next)에 그 문자열이 박혀
  // 로그인 뒤 "/notices/[id]" 로 갔다. 실제 주소를 넘긴다(접근 규칙은 /notices 접두어로 같이 매칭된다).
  const { id } = await params;
  await requireAccess(`/notices/${encodeURIComponent(id)}`);
  const currentUser = await getCurrentUser();
  const [notice, calendarWindow, screenText] = await Promise.all([
    getNoticeById(id),
    getNoticeCalendarWindow(),
    getScreenTextContent(),
  ]);
  if (!notice) notFound();

  // 캘린더가 보여 줄 달의 범위(2026-09-02). 이번 회차에 신청받는 달만 넘겨 보게 한다 —
  // 접수와 무관한 달까지 넘겨 볼 수 있으면 그 달도 신청할 수 있다고 읽힌다.
  const calendarBounds = noticeCalendarMonthBounds(calendarWindow);
  const calendarSlot = (
    <BookingCalendarLauncher
      initialMonth={initialCalendarMonth(calendarWindow, kstNowMonth(new Date()))}
      startMonth={calendarBounds.start}
      endMonth={calendarBounds.end}
      endDay={calendarBounds.endDay}
      legend={scheduleLegend(screenText.wizardStrings)}
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
          <div className={NOTICE_COLUMN}>
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
          <div className={NOTICE_COLUMN}>
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
