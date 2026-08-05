import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, findUserById, listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { AppUser, Quote } from "@/lib/pricing/types";
import { ArrowRight, Badge, Label } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  LINK_BTN,
  SUB_TITLE,
  TABLE,
  TABLE_WRAP,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 완료",
};

/** 상태 색은 kit 의 tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<Quote["status"], "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
};

const APPROVAL_LABEL = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
} as const;

const APPROVAL_TONE: Record<AppUser["approvalStatus"], "warn" | "good" | "neutral"> = {
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "neutral",
};

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

  const profile: [string, string][] = [
    ["이메일", target.email],
    ["휴대폰 번호", target.phone || "-"],
    ["회사/기획사", target.companyName || "-"],
    ["사업자등록번호", company?.businessRegistrationNumber || "-"],
    ["가입일", new Date(target.createdAt).toLocaleString("ko-KR")],
    ["계정 ID", target.id],
  ];

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <Link href="/admin/applicants" className={LINK_BTN}>
          ← 회원 관리
        </Link>

        <header className="mt-5 border-b border-border/20 pb-6">
          <Label className="mb-3 text-muted">Member</Label>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="type-kr-heading text-h5-m sm:text-h5">{target.name}</h1>
              <p className="mt-2 text-s text-muted">{target.email}</p>
            </div>
            <Badge tone={APPROVAL_TONE[target.approvalStatus]}>
              {APPROVAL_LABEL[target.approvalStatus]}
            </Badge>
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-1 border-t border-border-soft bg-surface sm:grid-cols-2">
          {profile.map(([k, v]) => (
            <div key={k} className="border-b border-border-soft px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-1 text-s font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className={`mt-10 ${SUB_TITLE}`}>신청 내역 ({quotes.length})</h2>
        <div className={`mt-3 ${TABLE_WRAP}`}>
          <table className={`${TABLE} min-w-[640px]`}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>신청번호</th>
                <th className={TH}>신청일시</th>
                <th className={TH_NUM}>신청 예상금액</th>
                <th className={TH}>상태</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-s text-muted">
                    아직 신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className={`${TR} transition-colors hover:bg-foreground/[0.03]`}>
                    <td className={`${TD} font-bold tabular-nums`}>{q.id}</td>
                    <td className={`${TD} tabular-nums text-muted`}>
                      {new Date(q.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className={`${TD_NUM} font-bold`}>{won(q.total)}</td>
                    <td className={TD}>
                      <Badge tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                    </td>
                    <td className={`${TD} text-right`}>
                      <Link
                        href={`/admin/${q.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-muted-strong"
                      >
                        상세
                        <ArrowRight />
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
