"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    <div className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight">신청자 회원가입</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          대관사(엔터테인먼트사·기획사) 전용 가입입니다. 가입 후 운영자 승인이
          완료되어야 대관 패키지 안내와 견적 산출을 이용할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-8">
          <FormSection title="계정 정보">
            <Field label="아이디" hint="영문 소문자/숫자, 4~20자">
              <input
                type="text"
                required
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
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
                className="input"
              />
            </Field>
            <Field label="비밀번호 확인">
              <input
                type="password"
                required
                autoComplete="new-password"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                className="input"
              />
            </Field>
          </FormSection>

          <FormSection title="담당자 정보">
            <Field label="담당자명">
              <input
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
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
                className="input"
              />
            </Field>
            <Field label="이메일">
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
          </FormSection>

          <FormSection title="회원 유형">
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
                  className={[
                    "rounded-sm border px-3 py-2.5 text-[13px] font-medium transition-colors",
                    accountType === value
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-muted hover:border-accent/50",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] leading-5 text-muted">
              {accountType === "CORPORATE"
                ? "회사/기획사를 처음 등록하는 경우입니다. 이후 같은 회사의 동료는 \"개인회원\"으로 이 회사를 선택해 연결할 수 있습니다."
                : "이미 등록된 회사/기획사에 소속된 실무자가 연결하는 경우입니다. 연결된 담당자끼리는 서로의 신청 내역을 함께 조회·관리할 수 있습니다."}
            </p>
          </FormSection>

          {accountType === "CORPORATE" ? (
            <FormSection title="법인 정보">
              <Field label="회사/기획사명" hint="신규 등록">
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="사업자등록번호" hint="10자리, - 없이 또는 포함하여">
                <input
                  type="text"
                  required
                  placeholder="000-00-00000"
                  value={form.businessRegistrationNumber}
                  onChange={(e) => setForm({ ...form, businessRegistrationNumber: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="대표자 성명">
                <input
                  type="text"
                  required
                  value={form.representativeName}
                  onChange={(e) => setForm({ ...form, representativeName: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="주소">
                <div className="flex gap-2">
                  <input type="text" readOnly placeholder="우편번호" value={form.postalCode} className="input flex-1" />
                  <button
                    type="button"
                    onClick={openPostcodeSearch}
                    className="shrink-0 rounded-sm border border-border px-3 py-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-panel"
                  >
                    우편번호 찾기
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  placeholder="주소 (우편번호 찾기로 입력)"
                  value={form.address}
                  className="input mt-2"
                />
                <input
                  type="text"
                  placeholder="상세주소"
                  value={form.addressDetail}
                  onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                  className="input mt-2"
                />
              </Field>
              <Field label="사업자등록증 첨부" hint="PDF/이미지, 10MB 이하 · 권장">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleCertUpload} className="text-[13px]" />
                {certUploading && <p className="mt-1.5 text-[12px] text-muted">업로드 중...</p>}
                {certFile ? (
                  <p className="mt-1.5 text-[12px] text-good">첨부됨: {certFile.name}</p>
                ) : (
                  <p className="mt-1.5 text-[12px] text-muted">
                    지금 파일이 없으면 위에 입력하신 정보로 먼저 신청하실 수 있습니다.
                    다만 첨부가 없으면 운영자 확인에 시간이 더 걸릴 수 있습니다.
                  </p>
                )}
              </Field>
            </FormSection>
          ) : (
            <FormSection title="소속 정보">
              <Field label="소속 회사/기획사" hint="선택">
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value, companyName: "" })}
                  className="input"
                >
                  <option value="">목록에서 선택하지 않음</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 mb-1 text-[11.5px] text-muted">
                  회사가 목록에 없나요? 이름을 직접 입력하세요. 비워두면 회사 없이 가입됩니다.
                </p>
                <input
                  type="text"
                  placeholder="회사/기획사명 (직접 입력, 선택)"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value, companyId: "" })}
                  className="input"
                />
              </Field>
            </FormSection>
          )}

          <FormSection title="약관 동의">
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
              <span>
                <Link href="/terms" target="_blank" className="font-medium text-accent hover:underline">
                  이용약관
                </Link>
                에 동의합니다. (필수)
              </span>
            </label>
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} />
              <span>
                <Link href="/privacy" target="_blank" className="font-medium text-accent hover:underline">
                  개인정보 수집·이용
                </Link>
                에 동의합니다. (필수)
              </span>
            </label>
          </FormSection>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-accent px-6 py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            로그인
          </Link>
        </p>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 2px;
          padding: 0.7rem 0.9rem;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-[12.5px] font-medium text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
