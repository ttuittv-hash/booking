"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/ui/AuthShell";
import { btnClass, Note } from "@/components/ui/kit";
import { hashPasswordForTransport } from "@/lib/clientPassword";

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
    };
  }
}

type AccountType = "CORPORATE" | "INDIVIDUAL";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("CORPORATE");
  const [form, setForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phone: "",
    email: "",
    companyName: "",
    companyId: "",
    businessRegistrationNumber: "",
    representativeName: "",
    postalCode: "",
    address: "",
    addressDetail: "",
  });
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [certFile, setCertFile] = useState<{ url: string; name: string } | null>(null);
  const [certUploading, setCertUploading] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
  }, []);

  function openPostcodeSearch() {
    function launch() {
      if (!window.daum) return;
      new window.daum.Postcode({
        oncomplete: (data) => {
          setForm((f) => ({ ...f, postalCode: data.zonecode, address: data.roadAddress || data.jibunAddress }));
        },
      }).open();
    }
    if (window.daum) {
      launch();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = launch;
    document.body.appendChild(script);
  }

  async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/auth/register/attachment", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "파일 업로드에 실패했습니다.");
        return;
      }
      setCertFile({ url: data.url, name: data.name });
    } finally {
      setCertUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.username.trim()) return setError("아이디를 입력하세요.");
    if (form.password.length < 8) return setError("비밀번호는 8자 이상이어야 합니다.");
    if (form.password !== form.passwordConfirm) return setError("비밀번호가 일치하지 않습니다.");
    if (!form.name.trim()) return setError("담당자명을 입력하세요.");
    if (!form.phone.trim()) return setError("휴대폰 번호를 입력하세요.");
    if (!form.email.trim()) return setError("이메일을 입력하세요.");
    if (accountType === "CORPORATE") {
      if (!form.companyName.trim()) return setError("회사/기획사명을 입력하세요.");
      if (!form.businessRegistrationNumber.trim()) return setError("사업자등록번호를 입력하세요.");
      if (!form.representativeName.trim()) return setError("대표자 성명을 입력하세요.");
      if (!form.postalCode.trim() || !form.address.trim()) return setError("우편번호 찾기로 주소를 입력하세요.");
    }
    if (!agreedTerms) return setError("이용약관에 동의해주세요.");
    if (!agreedPrivacy) return setError("개인정보 수집·이용에 동의해주세요.");

    setLoading(true);
    try {
      // 비밀번호 평문은 전송하지 않는다 — SHA-256 해시만 보내고 서버가 bcrypt로 저장한다.
      // (undefined 필드는 JSON.stringify에서 제외된다)
      const formWithoutPassword = { ...form, password: undefined, passwordConfirm: undefined };
      const passwordHash = await hashPasswordForTransport(form.password);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formWithoutPassword,
          passwordHash,
          address: form.addressDetail ? `${form.address} ${form.addressDetail}` : form.address,
          accountType,
          agreedTerms,
          agreedPrivacy,
          businessCertUrl: certFile?.url ?? "",
          businessCertName: certFile?.name ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }
      router.push("/apply");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="plain"
      active="register"
      width="md"
      title="신청자 회원가입"
      lead="대관사(엔터테인먼트사·기획사) 전용 가입입니다. 가입 후 운영자 승인이 완료되어야 대관료 열람과 신청서 작성을 이용할 수 있습니다."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-10">
              <FormSection no="01" title="계정 정보">
                <Field label="아이디" hint="영문 소문자/숫자, 4~20자">
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <Field label="비밀번호" hint="8자 이상">
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <Field label="비밀번호 확인">
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={form.passwordConfirm}
                    onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                    className="field-base"
                  />
                </Field>
              </FormSection>

              <FormSection no="02" title="담당자 정보">
                <Field label="담당자명">
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <Field label="휴대폰 번호">
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="010-0000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <Field label="이메일">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="field-base"
                  />
                </Field>
              </FormSection>

              <FormSection no="03" title="회원 유형">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["CORPORATE", "법인회원"],
                      ["INDIVIDUAL", "개인회원"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccountType(value)}
                      aria-pressed={accountType === value}
                      className={btnClass(
                        accountType === value ? "primary" : "secondary",
                        "lg",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  {accountType === "CORPORATE"
                    ? "회사/기획사를 처음 등록하는 경우입니다. 이후 같은 회사의 동료는 \"개인회원\"으로 이 회사를 선택해 연결할 수 있습니다."
                    : "이미 등록된 회사/기획사에 소속된 실무자가 연결하는 경우입니다. 연결된 담당자끼리는 서로의 신청 내역을 함께 조회·관리할 수 있습니다."}
                </p>
              </FormSection>

              {accountType === "CORPORATE" ? (
                <FormSection no="04" title="법인 정보">
                  <Field label="회사/기획사명" hint="신규 등록">
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="field-base"
                    />
                  </Field>
                  <Field label="사업자등록번호" hint="10자리, - 없이 또는 포함하여">
                    <input
                      type="text"
                      required
                      placeholder="000-00-00000"
                      value={form.businessRegistrationNumber}
                      onChange={(e) => setForm({ ...form, businessRegistrationNumber: e.target.value })}
                      className="field-base"
                    />
                    {/* 진위확인은 가입 요청 시 서버(NICE 법인실명확인)에서 수행된다.
                        휴업·폐업 등 부적격 상태이거나 조회되지 않으면 그 사유가 아래 오류로 표시된다. */}
                    <Note className="mt-3">
                      입력하신 번호는 국세청 사업자 진위확인으로 조회합니다. 휴업·폐업 등으로 확인되면
                      가입이 제한되고, 상호·대표자가 등록 정보와 다르면 운영자 심사에서 확인합니다.
                    </Note>
                  </Field>
                  <Field label="대표자 성명">
                    <input
                      type="text"
                      required
                      value={form.representativeName}
                      onChange={(e) => setForm({ ...form, representativeName: e.target.value })}
                      className="field-base"
                    />
                  </Field>
                  <Field label="주소">
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        readOnly
                        placeholder="우편번호"
                        value={form.postalCode}
                        className="field-base flex-1"
                      />
                      <button
                        type="button"
                        onClick={openPostcodeSearch}
                        className={`${btnClass("secondary", "md")} shrink-0`}
                      >
                        우편번호 찾기
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      placeholder="주소 (우편번호 찾기로 입력)"
                      value={form.address}
                      className="field-base mt-2"
                    />
                    <input
                      type="text"
                      placeholder="상세주소"
                      value={form.addressDetail}
                      onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                      className="field-base mt-2"
                    />
                  </Field>
                  <Field label="사업자등록증 첨부" hint="PDF/이미지, 10MB 이하 · 권장">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleCertUpload}
                      className="field-base text-muted file:mr-3 file:border file:border-foreground file:bg-transparent file:px-3 file:py-1 file:text-xs file:font-bold file:text-foreground"
                    />
                    {certUploading && <p className="mt-2 text-xs text-muted">업로드 중...</p>}
                    {certFile ? (
                      <p className="mt-2 text-xs text-good">첨부됨: {certFile.name}</p>
                    ) : (
                      // 첨부는 필수가 아니다 — 사업자번호 진위확인으로 입력값을 검증하고,
                      // 첨부 여부는 운영자 심사 화면에 그대로 표시된다.
                      <Note className="mt-3">
                        지금 파일이 없어도 입력하신 정보로 먼저 가입할 수 있습니다. 다만 첨부가 없으면
                        운영자 확인에 시간이 더 걸릴 수 있습니다.
                      </Note>
                    )}
                  </Field>
                </FormSection>
              ) : (
                <FormSection no="04" title="소속 정보">
                  <Field label="소속 회사/기획사" hint="선택">
                    <select
                      value={form.companyId}
                      onChange={(e) => setForm({ ...form, companyId: e.target.value, companyName: "" })}
                      className="field-base"
                    >
                      <option value="">목록에서 선택하지 않음</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 mb-2 text-xs text-muted">
                      회사가 목록에 없나요? 이름을 직접 입력하세요. 비워두면 회사 없이 가입됩니다.
                    </p>
                    <input
                      type="text"
                      placeholder="회사/기획사명 (직접 입력, 선택)"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value, companyId: "" })}
                      className="field-base"
                    />
                  </Field>
                </FormSection>
              )}

              <FormSection no="05" title="약관 동의">
                <label className="flex items-start gap-3 text-s">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
                  />
                  <span>
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
                    >
                      이용약관
                    </Link>
                    에 동의합니다. (필수)
                  </span>
                </label>
                <label className="flex items-start gap-3 text-s">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
                  />
                  <span>
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
                    >
                      개인정보 수집·이용
                    </Link>
                    에 동의합니다. (필수)
                  </span>
                </label>
              </FormSection>

              {error && (
                <p className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
                  {error}
                </p>
              )}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className={`${btnClass("primary", "md")} w-full`}
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
          <Link href="/login" className={`${btnClass("secondary", "md")} w-full`}>
            이미 계정이 있습니다
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

/** 섹션 — 번호(옐로 허용 · 강조 요소)와 라벨을 헤어라인 위에 얹는다 */
function FormSection({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/25 pt-6">
      <div className="flex items-baseline gap-3">
        <span className="type-display text-xs tabular-nums text-muted">{no}</span>
        <h2 className="type-kr-heading text-h6-m sm:text-h6">{title}</h2>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline gap-2">
        <span className="text-xs text-muted">{label}</span>
        {hint && <span className="text-xs text-muted/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
