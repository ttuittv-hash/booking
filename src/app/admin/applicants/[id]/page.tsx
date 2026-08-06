import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, findUserById, listQuotes } from "@/lib/db";
import { num } from "@/lib/format";
import type { AppUser, Quote } from "@/lib/pricing/types";
import { ArrowRight, Badge } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  LINK_BTN,
  NONE,
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
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR_HOVER,
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
    ["휴대폰 번호", target.phone || NONE],
    ["회사/기획사", target.companyName || NONE],
    ["사업자등록번호", company?.businessRegistrationNumber || NONE],
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

        <dl className="mt-6 grid grid-cols-1 border-t border-border-soft bg-panel sm:grid-cols-2">
          {profile.map(([k, v]) => (
            <div key={k} className="border-b border-border-soft px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-1 text-s font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className={`mt-10 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>신청 내역 ({quotes.length})</p>
              <p className={TABLE_HEAD_DESC}>
                이 회원(또는 소속 회사)이 접수한 신청서입니다.
              </p>
            </div>
          </div>
          <div className={TABLE_SCROLL}>
            <table className={`${TABLE} min-w-[640px]`}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>신청번호</th>
                  <th className={TH_NUM}>신청일시</th>
                  <th className={TH_NUM}>신청 예상금액 (₩)</th>
                  <th className={TH}>상태</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={TD_EMPTY}>
                      아직 신청 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  quotes.map((q) => (
                    <tr key={q.id} className={TR_HOVER}>
                      <td className={`${TD_ID} tabular-nums`}>{q.id}</td>
                      <td className={`${TD_NUM} text-muted`}>
                        {new Date(q.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className={`${TD_NUM} font-bold`}>{num(q.total)}</td>
                      <td className={TD}>
                        <Badge tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                      </td>
                      <td className={TD_LINK}>
                        <Link href={`/admin/${q.id}`} className={ROW_LINK}>
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
        </div>

      </main>
    </div>
  );
}
