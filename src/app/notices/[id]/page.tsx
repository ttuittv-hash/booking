import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getNoticeById } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-8">
        <Link href="/notices" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 공지사항 목록
        </Link>

        <h1 className="mt-4 text-[26px] font-semibold tracking-tight sm:text-[30px]">{notice.title}</h1>
        <p className="mt-2 text-[12px] text-muted">
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

        <p className="mt-6 whitespace-pre-wrap text-[14.5px] leading-8 text-muted">{notice.body}</p>
      </main>
    </div>
  );
}
