import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getNoticeById } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { PublicHeader } from "@/components/PublicHeader";
import { isPinnedTag, TagBadge } from "@/components/TagBadge";
import { isRentalOpen } from "@/lib/release";
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

/* 본문(운영자 리치 에디터 HTML) 타이포 — 전부 디자인 토큰으로. 라운딩 없음. */
const PROSE = [
  "whitespace-pre-wrap text-r leading-8 text-muted-strong",
  "[&_h2]:type-kr-heading [&_h2]:mt-12 [&_h2]:text-h5-m [&_h2]:text-foreground sm:[&_h2]:text-h5",
  "[&_h3]:type-kr-heading [&_h3]:mt-10 [&_h3]:text-h6-m [&_h3]:text-foreground [&_h3]:first:mt-0 sm:[&_h3]:text-h6",
  "[&_p]:my-4 [&_p]:first:mt-0 [&_p]:last:mb-0",
  "[&_strong]:font-bold [&_strong]:text-foreground",
  "[&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a]:text-foreground hover:[&_a]:text-muted",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mt-2",
  "[&_img]:mt-6 [&_img]:max-w-full",
  "[&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-s",
  "[&_th]:border [&_th]:border-border-soft [&_th]:bg-background [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-foreground",
  "[&_td]:border [&_td]:border-border-soft [&_td]:px-3 [&_td]:py-2.5",
].join(" ");

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const { id } = await params;
  const notice = await getNoticeById(id);
  if (!notice) notFound();

  const isRentalPost = isPinnedTag(notice.tag);
  const updated = notice.updatedAt !== notice.createdAt;
  const open = isRentalOpen();

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
                    {formatDateTime(notice.createdAt)} 게시
                  </time>
                  {updated && (
                    <time className="tabular-nums" dateTime={notice.updatedAt}>
                      {formatDateTime(notice.updatedAt)} 갱신
                    </time>
                  )}
                </span>
              }
            />

            {/* 말머리가 `대관공고` 인 경우에만 접수 정보를 본문 위에 고정한다 */}
            {isRentalPost && (
              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t-2 border-border pt-6">
                {(
                  [
                    ["접수 개시", notice.applyStart ?? "추후 공지"],
                    ["접수 마감", notice.applyEnd ?? "추후 공지"],
                    ["대상 공간", notice.targetVenues ?? "본문 참조"],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-bold text-muted">{k}</dt>
                    <dd className="mt-1 text-s font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {updated && (
              <p className="mt-6 border-t border-border/25 pt-3 text-xs leading-5 text-muted">
                이 공고는 {formatDateTime(notice.updatedAt)}에 갱신되었습니다. 변경된 내용은 본문에
                반영되어 있습니다.
              </p>
            )}
          </div>
        </Band>

        {/* 본문 · 첨부 */}
        <Band tone="white" size="md">
          <div className="max-w-3xl">
            {notice.imageUrl && (
              <Media src={notice.imageUrl} alt={notice.title} ratio="auto" className="mb-10" />
            )}

            {/* 운영자 리치 에디터 HTML — 스크립트·이벤트 핸들러를 제거한 뒤 렌더한다 */}
            <div
              className={PROSE}
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(notice.body) }}
            />

            {notice.attachmentUrl && (
              <div className="mt-12 border-t border-border/25 pt-8">
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

            {/* 관련 링크 — 규약과 시설소개자료는 파일을 복제하지 않고 자료실을 가리킨다 */}
            <div className="mt-14 border-t border-border/25 pt-8">
              <h2 className="type-kr-heading mb-5 text-h6-m sm:text-h6">관련 링크</h2>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/guide" variant="secondary">
                  대관 안내
                </ButtonLink>
                <ButtonLink href="/library" variant="secondary">
                  자료실
                </ButtonLink>
                <ButtonLink href="/packages" variant="secondary">
                  대관료
                </ButtonLink>
                <ButtonLink href="/apply" variant="secondary">
                  대관 신청
                </ButtonLink>
              </div>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border/25 pt-8">
              <ButtonLink href={open ? "/apply" : "/register"} variant="primary">
                {open ? "대관 신청하기" : "회원가입"}
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/notices" variant="secondary">
                공지사항 목록
              </ButtonLink>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
