import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, findUserById, listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { Quote } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 완료",
};

const APPROVAL_LABEL = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
} as const;

export default async function AdminApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/apply");

  const { id } = await params;
  const target = findUserById(id);
  if (!target || target.role !== "APPLICANT") notFound();

  const company = target.companyId ? findCompanyById(target.companyId) : null;
  const quotes = target.companyId ? listQuotes({ companyId: target.companyId }) : listQuotes({ applicantId: target.id });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/admin/applicants" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 회원 관리
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold">{target.name}</h1>
            <p className="mt-1 text-[13.5px] text-muted">{target.email}</p>
          </div>
          <span
            className={[
              "rounded px-2.5 py-1 text-[11.5px] font-medium",
              target.approvalStatus === "APPROVED"
                ? "bg-good-soft text-good"
                : target.approvalStatus === "PENDING"
                  ? "bg-warn-soft text-warn"
                  : "bg-panel-strong text-muted",
            ].join(" ")}
          >
            {APPROVAL_LABEL[target.approvalStatus]}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded border border-border bg-background p-6 sm:grid-cols-2">
          <div>
            <div className="text-[11px] text-muted">이메일</div>
            <div className="mt-1 text-[13.5px] font-medium">{target.email}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">휴대폰 번호</div>
            <div className="mt-1 text-[13.5px] font-medium">{target.phone || "-"}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">회사/기획사</div>
            <div className="mt-1 text-[13.5px] font-medium">{target.companyName || "-"}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">사업자등록번호</div>
            <div className="mt-1 text-[13.5px] font-medium">{company?.businessRegistrationNumber || "-"}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">가입일</div>
            <div className="mt-1 text-[13.5px] font-medium">
              {new Date(target.createdAt).toLocaleString("ko-KR")}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted">계정 ID</div>
            <div className="mt-1 text-[13.5px] font-medium">{target.id}</div>
          </div>
        </div>

        <h2 className="mt-10 text-[14px] font-semibold">신청 내역 ({quotes.length})</h2>
        <div className="mt-3 overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="px-4 py-3">신청번호</th>
                <th className="px-4 py-3">신청일시</th>
                <th className="px-4 py-3 text-right">신청 예상금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    아직 신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{q.id}</td>
                    <td className="px-4 py-3 text-muted">{new Date(q.createdAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{won(q.total)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-sm bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent">
                        {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/${q.id}`} className="text-accent hover:underline">
                        상세
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
