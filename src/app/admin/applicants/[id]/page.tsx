import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, findUserById, listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { CompanyVerification, Quote } from "@/lib/pricing/types";
import { AdminNav } from "@/components/admin/AdminNav";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 완료",
};

const APPROVAL_LABEL = {
  PENDING: "일반인 (승인 대기)",
  APPROVED: "기본 (승인됨)",
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
  const target = await findUserById(id);
  if (!target || target.role !== "APPLICANT") notFound();

  const company = target.companyId ? await findCompanyById(target.companyId) : null;
  const quotes = target.companyId
    ? await listQuotes({ companyId: target.companyId })
    : await listQuotes({ applicantId: target.id });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" user={admin} />

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
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
              {company?.businessRegistrationNumber || "-"}
              {company?.verification && <VerificationBadge verification={company.verification} />}
            </div>
            {company?.verification && (
              <div className="mt-1.5 space-y-0.5 text-[12px] text-muted">
                {company.verification.companyName && (
                  <div>등록 상호: {company.verification.companyName}</div>
                )}
                {company.verification.representativeName && (
                  <div>등록 대표자: {company.verification.representativeName}</div>
                )}
                {company.verification.compTypeLabel && (
                  <div>기업형태: {company.verification.compTypeLabel}</div>
                )}
                {company.verification.message && (
                  <div className="text-amber-600">{company.verification.message}</div>
                )}
                {company.verification.checkedAt && (
                  <div>확인: {new Date(company.verification.checkedAt).toLocaleString("ko-KR")}</div>
                )}
              </div>
            )}
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

// 사업자 진위확인 결과 뱃지 — 운영자가 승인 전에 한눈에 보도록 상태를 색으로 구분한다.
function VerificationBadge({ verification }: { verification: CompanyVerification }) {
  const normal = verification.status === "VERIFIED" && verification.compStatus === "1";
  const label =
    verification.status === "VERIFIED"
      ? `국세청 확인 · ${verification.compStatusLabel ?? "상태미상"}`
      : verification.status === "NOT_FOUND"
        ? "국세청 미조회"
        : "미확인";
  const className = normal
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
    : verification.status === "VERIFIED"
      ? "border-red-500/40 bg-red-500/10 text-red-600"
      : "border-border bg-panel text-muted";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>
  );
}
