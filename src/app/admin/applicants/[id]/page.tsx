import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, findUserById, listQuotes } from "@/lib/db";
import { won } from "@/lib/format";
import type { Company, CompanyVerification, Quote } from "@/lib/pricing/types";
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

        {company && <BusinessCheckPanel company={company} />}

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

// 입력값과 국세청 등록값을 나란히 놓고 대조한다. 운영자가 승인 전에 볼 화면이라
// 불일치 항목만 눈에 띄게 하고, 서류는 필요할 때만 열어보게 한다.
function BusinessCheckPanel({ company }: { company: Company }) {
  const verification = company.verification;
  const rows: { label: string; input: string | null; registered: string | null }[] = [
    { label: "상호", input: company.name, registered: verification?.companyName ?? null },
    {
      label: "대표자",
      input: company.representativeName,
      registered: verification?.representativeName ?? null,
    },
  ];

  const same = (a: string | null, b: string | null) =>
    !!a && !!b && a.replace(/\s+/g, "") === b.replace(/\s+/g, "");

  return (
    <div className="mt-4 rounded border border-border bg-background p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold">사업자 확인</h2>
        {verification?.checkedAt && (
          <span className="text-[11.5px] text-muted">
            국세청 조회 {new Date(verification.checkedAt).toLocaleString("ko-KR")}
          </span>
        )}
      </div>

      {verification ? (
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] text-muted">
              <th className="w-24 py-2 font-medium">항목</th>
              <th className="py-2 font-medium">가입 시 입력값</th>
              <th className="py-2 font-medium">국세청 등록값</th>
              <th className="w-16 py-2 font-medium">대조</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const matched = same(row.input, row.registered);
              return (
                <tr key={row.label} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2 text-muted">{row.label}</td>
                  <td className="py-2">{row.input || "-"}</td>
                  <td className="py-2">{row.registered || "-"}</td>
                  <td className="py-2">
                    {!row.registered ? (
                      <span className="text-muted">-</span>
                    ) : matched ? (
                      <span className="text-emerald-600">일치</span>
                    ) : (
                      <span className="font-medium text-amber-600">확인 필요</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="py-2 text-muted">기업상태</td>
              <td className="py-2 text-muted">-</td>
              <td className="py-2">{verification.compStatusLabel || "-"}</td>
              <td className="py-2">
                {verification.compStatus === "1" ? (
                  <span className="text-emerald-600">정상</span>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          국세청 조회 이력이 없습니다. 사업자등록증과 입력값을 직접 대조해 주세요.
        </p>
      )}

      {verification?.message && (
        <p className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-700">
          {verification.message}
        </p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <div className="text-[11px] text-muted">사업자등록증</div>
        {company.businessCertUrl ? (
          <a
            href={`${company.businessCertUrl}${company.businessCertName ? `?name=${encodeURIComponent(company.businessCertName)}` : ""}`}
            className="mt-1 inline-block text-[13.5px] font-medium text-accent hover:underline"
          >
            {company.businessCertName || "첨부파일"} 열기
          </a>
        ) : (
          <p className="mt-1 text-[13.5px] text-amber-600">
            미첨부 — 신청자가 직접 입력한 정보로 신청했습니다.
          </p>
        )}
      </div>
    </div>
  );
}
