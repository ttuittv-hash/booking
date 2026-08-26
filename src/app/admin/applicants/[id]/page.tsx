import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, findUserById, listQuotes } from "@/lib/db";
import { num } from "@/lib/format";
import type { AppUser, Company, CompanyVerification, Quote } from "@/lib/pricing/types";
import { ArrowRight, Badge } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import { SetCompanyMasterButton } from "@/components/admin/SetCompanyMasterButton";
import { buildVerificationBadges, overallVerdict } from "@/lib/verificationBadges";
import {
  HELP,
  INFO_NOTE,
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
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
  TR_HOVER,
  WARN_NOTE,
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
  PENDING: "일반인 (승인 대기)",
  APPROVED: "기본 (승인됨)",
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
  const target = await findUserById(id);
  if (!target || target.role !== "APPLICANT") notFound();

  const company = target.companyId ? await findCompanyById(target.companyId) : null;
  const quotes = target.companyId
    ? await listQuotes({ companyId: target.companyId })
    : await listQuotes({ applicantId: target.id });

  const profile: [string, ReactNode][] = [
    ["이름", target.name],
    ["로그인 ID", target.username || NONE],
    ["이메일", target.email],
    ["휴대폰 번호", target.phone || NONE],
    ["회사/기획사", target.companyName || NONE],
    [
      "사업자등록번호",
      <span key="brn" className="flex flex-wrap items-center gap-2">
        {company?.businessRegistrationNumber || NONE}
        {company?.verification && <VerificationBadge verification={company.verification} />}
      </span>,
    ],
    [
      "회사 내 권한",
      <span key="role" className="flex flex-col items-start gap-2">
        {target.companyRole === "MASTER" ? (
          <span className="border border-accent px-2 py-0.5 text-xs text-accent">대표 담당자</span>
        ) : target.companyRole === "STAFF" ? (
          <span className="border border-border-soft px-2 py-0.5 text-xs text-muted">소속 담당자</span>
        ) : (
          NONE
        )}
        {/* 대표가 부재·퇴사했거나 처음부터 잘못 지정된 경우의 안전망(기획서 A10) —
            회원 상세에서 바로 대표를 지정할 수 있어야 회원 관리 화면을 벗어나지 않는다. */}
        {company && target.companyRole !== "MASTER" && target.approvalStatus === "APPROVED" && (
          <SetCompanyMasterButton companyId={company.id} targetId={target.id} targetName={target.name} />
        )}
      </span>,
    ],
    ["본인인증", target.identityVerifiedAt ? new Date(target.identityVerifiedAt).toLocaleString("ko-KR") : "미인증"],
    [
      "재직증명서",
      target.employmentCertUrl ? (
        <a
          key="employment-cert"
          href={`${target.employmentCertUrl}${target.employmentCertName ? `?name=${encodeURIComponent(target.employmentCertName)}` : ""}`}
          className={LINK_BTN}
        >
          {target.employmentCertName || "첨부파일"} 열기
        </a>
      ) : (
        NONE
      ),
    ],
    ["가입일", new Date(target.createdAt).toLocaleString("ko-KR")],
    ["계정 ID", target.id],
  ];

  // 기획서 A9 — 운영자가 판단에 쓰는 근거 7종. 목록과 같은 판정을 쓴다.
  const badges = buildVerificationBadges({
    user: target,
    company: company ?? null,
    duplicated: false,
  });
  const verdict = overallVerdict(badges);

  const BADGE_MARK: Record<string, string> = { PASS: "✓", WARN: "!", NONE: "—" };
  const BADGE_TONE: Record<string, string> = {
    PASS: "text-ok",
    WARN: "text-danger",
    NONE: "text-muted",
  };

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/applicants" user={admin} />

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

        {/* 기획서 A9 — 승인 판단 근거 7종. 목록 화면과 같은 판정 로직을 쓴다. */}
        <section className={`mt-8 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>검증 결과</p>
              <p className={TABLE_HEAD_DESC}>
                {verdict === "AUTO"
                  ? "7개 항목이 모두 통과했습니다."
                  : "확인이 필요한 항목이 있습니다. 승인 전에 확인해 주세요."}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border-soft">
            {badges.map((b) => (
              <li key={b.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="flex items-center gap-3 text-s">
                  <span className={`w-4 text-center font-bold ${BADGE_TONE[b.state]}`}>
                    {BADGE_MARK[b.state]}
                  </span>
                  <span className="font-bold">{b.label}</span>
                </span>
                <span className="break-keep text-right text-xs text-muted">{b.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {company && <BusinessCheckPanel company={company} />}

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

// 사업자 진위확인 결과 뱃지 — 운영자가 승인 전에 한눈에 보도록 상태를 구분한다.
// 색은 kit 의 Badge tone 만 쓴다 (임의 색 금지).
// 가입 화면과 같은 말을 쓴다 — 같은 결과를 두 화면이 다르게 부르면 대조가 안 된다.
//   인증 완료 / 확인 필요 / 인증 실패
function VerificationBadge({ verification }: { verification: CompanyVerification }) {
  const normal = verification.status === "VERIFIED" && verification.compStatus === "1";
  const label = normal
    ? `인증 완료 · ${verification.compStatusLabel ?? "정상"}`
    : verification.status === "VERIFIED"
      ? `확인 필요 · ${verification.compStatusLabel ?? "상태 정보 없음"}`
      : verification.status === "NOT_FOUND"
        ? "인증 실패 · 조회되지 않음"
        : "확인 필요 · 미확인";
  const tone = normal ? "good" : verification.status === "NOT_FOUND" ? "danger" : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
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
    <div className={`mt-8 ${TABLE_CARD}`}>
      <div className={TABLE_HEAD}>
        <div>
          <p className={TABLE_HEAD_TITLE}>사업자 확인</p>
          <p className={TABLE_HEAD_DESC}>
            가입 시 입력값과 국세청 등록값을 대조합니다. 승인 전에 확인하세요.
          </p>
        </div>
        {verification?.checkedAt && (
          <span className={HELP}>
            국세청 조회 {new Date(verification.checkedAt).toLocaleString("ko-KR")}
          </span>
        )}
      </div>

      {verification ? (
        <div className={TABLE_SCROLL}>
          <table className={`${TABLE} min-w-[560px]`}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={`${TH} w-24`}>항목</th>
                <th className={TH}>가입 시 입력값</th>
                <th className={TH}>국세청 등록값</th>
                <th className={`${TH} w-24`}>대조</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const matched = same(row.input, row.registered);
                return (
                  <tr key={row.label} className={TR}>
                    <td className={TD_MUTED}>{row.label}</td>
                    <td className={TD}>{row.input || NONE}</td>
                    <td className={TD}>{row.registered || NONE}</td>
                    <td className={TD}>
                      {!row.registered ? (
                        <span className="text-muted">{NONE}</span>
                      ) : matched ? (
                        <Badge tone="good">일치</Badge>
                      ) : (
                        <Badge tone="danger">확인 필요</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className={TR}>
                <td className={TD_MUTED}>기업상태</td>
                <td className={TD_MUTED}>{NONE}</td>
                <td className={TD}>{verification.compStatusLabel || NONE}</td>
                <td className={TD}>
                  {verification.compStatus === "1" ? (
                    <Badge tone="good">정상</Badge>
                  ) : (
                    <span className="text-muted">{NONE}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-3.5">
          <p className={INFO_NOTE}>
            국세청 조회 이력이 없습니다. 사업자등록증과 입력값을 직접 대조해 주세요.
          </p>
        </div>
      )}

      {verification?.message && (
        <div className="border-t border-border-soft px-4 py-3.5">
          <p className={WARN_NOTE}>{verification.message}</p>
        </div>
      )}

      <div className="border-t border-border-soft px-4 py-3.5">
        <p className={HELP}>사업자등록증</p>
        {company.businessCertUrl ? (
          <a
            href={`${company.businessCertUrl}${company.businessCertName ? `?name=${encodeURIComponent(company.businessCertName)}` : ""}`}
            className={`mt-2 inline-block ${LINK_BTN}`}
          >
            {company.businessCertName || "첨부파일"} 열기
          </a>
        ) : (
          <p className={`mt-2 ${WARN_NOTE}`}>
            미첨부 — 신청자가 직접 입력한 정보로 신청했습니다.
          </p>
        )}
      </div>
    </div>
  );
}
