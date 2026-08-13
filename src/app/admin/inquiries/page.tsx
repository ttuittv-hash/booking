import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listInquiriesPaged, listUsersByIds, normalizePage } from "@/lib/db";
import { Pagination } from "@/components/Pagination";
import { AdminNav } from "@/components/admin/AdminNav";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기",
  ANSWERED: "답변 완료",
};

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { page: pageParam } = await searchParams;
  const page = normalizePage(pageParam);
  const { items: inquiries, total, totalPages } = await listInquiriesPaged({}, page);
  const authorIds = [...new Set(inquiries.map((i) => i.userId))];
  const authorById = new Map((await listUsersByIds(authorIds)).map((u) => [u.id, u]));

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/inquiries" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">1:1 문의</h1>
        <p className="mt-2 text-[13.5px] text-muted">
          답변 대기 {inquiries.filter((i) => i.status === "OPEN").length}건
        </p>

        <div className="mt-6 overflow-hidden rounded border border-border">
          {inquiries.length === 0 ? (
            <p className="p-6 text-[13.5px] text-muted">등록된 문의가 없습니다.</p>
          ) : (
            <ul>
              {inquiries.map((inquiry) => {
                const author = authorById.get(inquiry.userId);
                return (
                  <li key={inquiry.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-panel/60"
                    >
                      <div>
                        <div className="text-[14px] font-medium">{inquiry.title}</div>
                        <div className="mt-1 text-[12px] text-muted">
                          {author?.name ?? "-"} ({author?.companyName ?? "-"}) ·{" "}
                          {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-sm px-2.5 py-1 text-[11px] font-medium ${
                          inquiry.status === "ANSWERED"
                            ? "bg-good-soft text-good"
                            : "bg-warn-soft text-warn"
                        }`}
                      >
                        {STATUS_LABEL[inquiry.status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} basePath="/admin/inquiries" />
      </main>
    </div>
  );
}
