import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listInquiriesPaged, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";

export const metadata: Metadata = {
  title: "1:1 문의 | 서울아레나",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기",
  ANSWERED: "답변 완료",
};

export default async function MyInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: inquiries, total, totalPages } = await listInquiriesPaged({ userId: user.id }, page);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/inquiries" />

          <div className="min-w-0 max-w-3xl flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[22px] font-semibold">1:1 문의</h1>
              <Link
                href="/mypage/inquiries/new"
                className="rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                문의하기
              </Link>
            </div>

            <div className="mt-6 overflow-hidden rounded border border-border">
              {inquiries.length === 0 ? (
                <p className="p-6 text-[13.5px] text-muted">등록된 문의가 없습니다.</p>
              ) : (
                <ul>
                  {inquiries.map((inquiry) => (
                    <li key={inquiry.id} className="border-b border-border last:border-b-0">
                      <Link
                        href={`/mypage/inquiries/${inquiry.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-panel/60"
                      >
                        <div>
                          <div className="text-[14px] font-medium">{inquiry.title}</div>
                          <div className="mt-1 text-[12px] text-muted">
                            {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-sm px-2.5 py-1 text-[11px] font-medium ${
                            inquiry.status === "ANSWERED"
                              ? "bg-good-soft text-good"
                              : "bg-panel-strong text-muted"
                          }`}
                        >
                          {STATUS_LABEL[inquiry.status]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} basePath="/mypage/inquiries" />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
