import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getNoticeById } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { TagBadge } from "@/components/TagBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const notice = getNoticeById(id);
  return { title: notice ? `${notice.title} | 서울아레나 공지사항` : "공지사항 | 서울아레나" };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const { id } = await params;
  const notice = getNoticeById(id);
  if (!notice) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/notices" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-8">
        <Link href="/notices" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 공지사항 목록
        </Link>

        <h1 className="mt-5 text-[26px] font-semibold tracking-tight sm:text-[30px]">
          <TagBadge tag={notice.tag} />
          {notice.title}
        </h1>
        <p className="mt-2.5 text-[12px] text-muted">
          {new Date(notice.createdAt).toLocaleString("ko-KR")}
        </p>

        {notice.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notice.imageUrl}
            alt=""
            className="mt-6 w-full rounded-sm border border-border object-cover"
          />
        )}

        {notice.attachmentUrl && (
          <a
            href={`${notice.attachmentUrl}?name=${encodeURIComponent(notice.attachmentName ?? "첨부파일")}`}
            className="mt-6 flex items-center gap-2 rounded-sm border border-border bg-panel/60 px-4 py-3 text-[13px] font-medium text-accent hover:border-accent"
          >
            ⬇ {notice.attachmentName ?? "첨부파일"} 다운로드
          </a>
        )}

        <div
          className="mt-6 whitespace-pre-wrap border-t border-border pt-8 text-[14.5px] leading-8 text-muted
            [&_h3]:mt-7 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:first:mt-0
            [&_img]:mt-3 [&_img]:max-w-full [&_img]:rounded-sm
            [&_li]:mt-1.5 [&_p]:my-3 [&_p]:first:mt-0 [&_strong]:text-foreground
            [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5
            [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13.5px]
            [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
            [&_th]:border [&_th]:border-border [&_th]:bg-panel [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground"
          dangerouslySetInnerHTML={{ __html: notice.body }}
        />
      </main>
    </div>
  );
}
