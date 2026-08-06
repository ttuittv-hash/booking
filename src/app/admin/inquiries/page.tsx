import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, listInquiries } from "@/lib/db";
import { ArrowRight, Badge, Label } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  PAGE_LEAD,
  PAGE_TITLE,
  TABLE,
  TABLE_WRAP,
  TD,
  TH,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "답변 대기",
  ANSWERED: "답변 완료",
};

/** 상태 색은 kit 의 tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<string, "warn" | "good"> = {
  OPEN: "warn",
  ANSWERED: "good",
};

export default async function AdminInquiriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const inquiries = listInquiries();
  const openCount = inquiries.filter((i) => i.status === "OPEN").length;

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/inquiries" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <Label className="mb-3 text-muted">Inquiries</Label>
          <h1 className={PAGE_TITLE}>1:1 문의</h1>
          <p className={PAGE_LEAD}>답변 대기 {openCount}건</p>
        </header>

        <div className={`mt-8 ${TABLE_WRAP}`}>
          <table className={`${TABLE} min-w-[640px]`}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>제목</th>
                <th className={TH}>작성자</th>
                <th className={TH}>등록일시</th>
                <th className={TH}>상태</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {inquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-s text-muted">
                    등록된 문의가 없습니다.
                  </td>
                </tr>
              ) : (
                inquiries.map((inquiry) => {
                  const author = findUserById(inquiry.userId);
                  return (
                    <tr
                      key={inquiry.id}
                      className={`${TR} transition-colors hover:bg-foreground/[0.03]`}
                    >
                      <td className={`${TD} font-bold`}>
                        <Link
                          href={`/admin/inquiries/${inquiry.id}`}
                          className="transition-colors hover:text-muted-strong"
                        >
                          {inquiry.title}
                        </Link>
                      </td>
                      <td className={`${TD} text-muted`}>
                        {author?.name ?? "-"} ({author?.companyName ?? "-"})
                      </td>
                      <td className={`${TD} tabular-nums text-muted`}>
                        {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className={TD}>
                        <Badge tone={STATUS_TONE[inquiry.status] ?? "neutral"}>
                          {STATUS_LABEL[inquiry.status]}
                        </Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <Link
                          href={`/admin/inquiries/${inquiry.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-muted-strong"
                        >
                          상세
                          <ArrowRight />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
