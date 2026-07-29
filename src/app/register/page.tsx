"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AccountType = "CORPORATE" | "INDIVIDUAL";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("CORPORATE");
  const [form, setForm] = useState({ email: "", password: "", name: "", companyName: "", companyId: "" });
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountType }),
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
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>
        <h1 className="mt-6 text-[22px] font-semibold">신청자 회원가입</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          대관사(엔터테인먼트사·기획사) 전용 가입입니다. 가입 후 운영자 승인이
          완료되어야 대관 패키지 안내와 견적 산출을 이용할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="이메일">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="비밀번호 (8자 이상)">
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="담당자명">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="회원 유형">
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
            <p className="mt-1.5 text-[11.5px] text-muted">
              {accountType === "CORPORATE"
                ? "회사/기획사를 처음 등록하는 경우입니다. 이후 같은 회사의 동료는 \"개인회원\"으로 이 회사를 선택해 연결할 수 있습니다."
                : "이미 등록된 회사/기획사에 소속된 실무자가 연결하는 경우입니다. 연결된 담당자끼리는 서로의 신청 내역을 함께 조회·관리할 수 있습니다."}
            </p>
          </Field>

          {accountType === "CORPORATE" ? (
            <Field label="회사/기획사명 (신규 등록)">
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="input"
              />
            </Field>
          ) : (
            <Field label="소속 회사/기획사">
              <select
                required
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="input"
              >
                <option value="">회사를 선택하세요</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {companies.length === 0 && (
                <p className="mt-1.5 text-[11.5px] text-muted">
                  아직 등록된 회사가 없습니다. 회사를 처음 등록하려면 &ldquo;법인회원&rdquo;을 선택하세요.
                </p>
              )}
            </Field>
          )}

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
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
          padding: 0.65rem 0.9rem;
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
