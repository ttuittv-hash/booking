import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, listInquiries } from "@/lib/db";
import { ArrowRight, Badge } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  NONE,
  PAGE_LEAD,
  PAGE_TITLE,
  ROW_LINK,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD,
  TD_EMPTY,
  TD_ID,
  TD_LINK,
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR_HOVER,
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
      <AdminNav active="/admin/inquiries" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>1:1 문의</h1>
          <p className={PAGE_LEAD}>
            대관사가 남긴 문의를 확인하고 답변합니다. 답변을 등록하면 신청자 화면에 바로 반영됩니다.
          </p>
        </header>

        <div className={`mt-8 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>문의 목록 ({inquiries.length})</p>
              <p className={TABLE_HEAD_DESC}>답변 대기 {openCount}건</p>
            </div>
          </div>
          <div className={TABLE_SCROLL}>
            <table className={`${TABLE} min-w-[640px]`}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>제목</th>
                  <th className={TH}>작성자</th>
                  <th className={TH_NUM}>등록일시</th>
                  <th className={TH}>상태</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={TD_EMPTY}>
                      등록된 문의가 없습니다.
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => {
                    const author = findUserById(inquiry.userId);
                    return (
                      <tr key={inquiry.id} className={TR_HOVER}>
                        <td className={TD_ID}>
                          <Link
                            href={`/admin/inquiries/${inquiry.id}`}
                            className="transition-colors hover:text-muted-strong"
                          >
                            {inquiry.title}
                          </Link>
                        </td>
                        <td className={TD_MUTED}>
                          {author?.name ?? NONE} ({author?.companyName ?? NONE})
                        </td>
                        <td className={`${TD_NUM} text-muted`}>
                          {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
                        </td>
                        <td className={TD}>
                          <Badge tone={STATUS_TONE[inquiry.status] ?? "neutral"}>
                            {STATUS_LABEL[inquiry.status]}
                          </Badge>
                        </td>
                        <td className={TD_LINK}>
                          <Link href={`/admin/inquiries/${inquiry.id}`} className={ROW_LINK}>
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
        </div>
      </main>
    </div>
  );
}
