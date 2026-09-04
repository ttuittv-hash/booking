import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  findCompanyById,
  findUserById,
  getCertOcrResult,
  listQuotes,
  listUsersByIds,
} from "@/lib/db";
import { isBusinessCertOcrConfigured } from "@/lib/businessCertOcr";
import { num } from "@/lib/format";
import type { AppUser, Company, CompanyVerification, Quote } from "@/lib/pricing/types";
import { ArrowRight, Badge } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import { SetCompanyMasterButton } from "@/components/admin/SetCompanyMasterButton";
import { BusinessCertCheck, type CertCheckView } from "@/components/admin/BusinessCertCheck";
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

  // 사업자등록증 자동 대조 결과. 파일 단위로 저장돼 있으므로 회사 첨부와 본인 첨부를
  // 각각 읽는다. 아직 대조하지 않았으면 null 이고, 화면에서 [대조] 버튼만 뜬다.
  const companyCertUrl = company?.businessCertUrl ?? null;
  const [companyCertOcr, userCertOcr] = await Promise.all([
    companyCertUrl ? getCertOcrResult(companyCertUrl) : Promise.resolve(null),
    target.businessCertUrl ? getCertOcrResult(target.businessCertUrl) : Promise.resolve(null),
  ]);
  const certCheckerIds = [companyCertOcr?.checkedBy, userCertOcr?.checkedBy].filter(
    (v): v is string => !!v,
  );
  const certCheckers = certCheckerIds.length ? await listUsersByIds(certCheckerIds) : [];
  const certCheckerName = (userId: string | null | undefined) =>
    userId ? (certCheckers.find((u) => u.id === userId)?.name ?? null) : null;
  const certOcrConfigured = isBusinessCertOcrConfigured();

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
          <span className="rounded-btn border border-accent px-2 py-0.5 text-xs text-accent">대표 담당자</span>
        ) : target.companyRole === "STAFF" ? (
          <span className="rounded-btn border border-border-soft px-2 py-0.5 text-xs text-muted">소속 담당자</span>
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
    // 반려 사유(2026-09-02) — 재심사 요청으로 다시 올라온 건을 볼 때 "지난번에 왜
    // 반려했는지"가 같은 화면에 있어야 판단이 된다. 승인·재심사 요청 시 지워진다.
    ...(target.approvalRejectReason
      ? ([
          [
            "반려 사유",
            <span key="reject-reason" className="whitespace-pre-wrap break-keep font-normal text-danger">
              {target.approvalRejectReason}
            </span>,
          ],
        ] as [string, React.ReactNode][])
      : []),
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

        <header className="mt-5 border-b border-border/25 pb-6">
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

        {/*
          [신규 2026-09-02] 첨부 서류를 한자리에 모은다. 예전에는 재직증명서와 본인 첨부
          사업자등록증이 위 프로필 표 칸 안에, 회사 사업자등록증은 아래 「사업자 확인」
          패널 맨 끝에 있어 심사할 때 세 군데를 훑어야 했고, 어느 서류가 아예 안 왔는지도
          한눈에 안 보였다. 미첨부도 줄을 남겨 빠진 서류가 드러나게 한다.
        */}
        <section className={`mt-8 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>첨부 서류</p>
              <p className={TABLE_HEAD_DESC}>
                가입 신청 시 제출한 서류입니다. [열기] 는 새 탭에서 바로 보여 줍니다.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border-soft">
            <CertRow
              label="사업자등록증"
              note={company ? "회사를 처음 등록한 담당자가 첨부한 것" : "소속 회사 없음"}
              url={company?.businessCertUrl ?? null}
              name={company?.businessCertName ?? null}
              missingNote="미첨부 — 신청자가 직접 입력한 정보로 신청했습니다."
            >
              {/* 첨부된 등록증을 실제로 읽어 가입 입력값과 맞춰 본다(2026-09-02).
                  예전에는 상호가 달라도 화면에 아무 표시가 없어 운영자가 파일을 일일이
                  열어 대조해야 했다. */}
              {company?.businessCertUrl ? (
                <BusinessCertCheck
                  companyId={company.id}
                  fileUrl={company.businessCertUrl}
                  configured={certOcrConfigured}
                  initial={(companyCertOcr?.result as CertCheckView | undefined) ?? null}
                  checkedByName={certCheckerName(companyCertOcr?.checkedBy)}
                />
              ) : null}
            </CertRow>

            {/* 기존 회사에 합류하는 사람이 직접 올린 등록증은 계정에 남는다(2026-08-27).
                회사 행의 것과 다른 회사일 수 있어 이쪽이야말로 대조가 필요하다.
                합류 가입이 아니면 애초에 받지 않는 서류라 없으면 줄을 빼는 게 맞다. */}
            {target.businessCertUrl && (
              <CertRow
                label="사업자등록증 (본인 첨부)"
                note="기존 회사에 합류하며 본인이 올린 것"
                url={target.businessCertUrl}
                name={target.businessCertName}
              >
                {company ? (
                  <BusinessCertCheck
                    companyId={company.id}
                    fileUrl={target.businessCertUrl}
                    configured={certOcrConfigured}
                    initial={(userCertOcr?.result as CertCheckView | undefined) ?? null}
                    checkedByName={certCheckerName(userCertOcr?.checkedBy)}
                  />
                ) : null}
              </CertRow>
            )}

            <CertRow
              label="재직증명서"
              note="본인이 그 회사 소속임을 확인하는 서류"
              url={target.employmentCertUrl}
              name={target.employmentCertName}
              missingNote="미첨부 — 소속 확인이 되지 않았습니다."
            />
          </ul>
        </section>

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

    </div>
  );
}

/**
 * 첨부 서류 한 줄. 파일이 있으면 [열기](새 탭 · 미리보기)와 [내려받기]를 함께 준다 —
 * 심사는 화면에서 훑어보는 일이고, 보관이 필요할 때만 내려받으면 된다.
 * 파일이 없으면 빈칸으로 두지 않고 왜 비었는지를 적는다.
 */
function CertRow({
  label,
  note,
  url,
  name,
  missingNote,
  children,
}: {
  label: string;
  note: string;
  url: string | null;
  name: string | null;
  missingNote?: string;
  children?: ReactNode;
}) {
  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-s font-bold">{label}</p>
          <p className={`mt-0.5 ${HELP}`}>{note}</p>
        </div>
        {url ? (
          <span className="flex shrink-0 items-center gap-3">
            <a href={`${url}${query}`} target="_blank" rel="noreferrer" className={LINK_BTN}>
              열기
            </a>
            <a href={`${url}${query ? `${query}&` : "?"}download=1`} className={LINK_BTN}>
              내려받기
            </a>
          </span>
        ) : null}
      </div>
      {url ? (
        <p className="mt-1 break-all text-xs text-muted">{name || "파일명 없음"}</p>
      ) : (
        <p className={`mt-1 ${WARN_NOTE}`}>{missingNote ?? "미첨부"}</p>
      )}
      {children}
    </li>
  );
}
