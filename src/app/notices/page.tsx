import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listNotices } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "공지사항 | 서울아레나",
};

export default async function NoticesPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const notices = listNotices();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/notices" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">NOTICE</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">공지사항</h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          대관과 관련된 주요 공지사항, 운영정책 변경, 시스템 점검, 대관 일정 및 기타 안내사항을
          확인하실 수 있습니다. 대관 신청 전 반드시 최신 공지사항을 확인하시기 바랍니다.
        </p>

        <div className="mt-10 divide-y divide-border border-t border-border">
          {notices.length === 0 ? (
            <p className="py-8 text-[13.5px] text-muted">등록된 공지사항이 없습니다.</p>
          ) : (
            notices.map((notice) => (
              <article key={notice.id} className="py-7">
                <h2 className="text-[16px] font-semibold">{notice.title}</h2>
                <p className="mt-1.5 text-[11.5px] text-muted">
                  {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-7 text-muted">{notice.body}</p>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
