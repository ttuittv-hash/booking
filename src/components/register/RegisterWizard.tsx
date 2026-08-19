"use client";

// 회원가입 5스텝 (기획서 A2~A8).
//
//   STEP 1 회원 유형 선택 — 기업회원만 활성, 개인회원은 비활성 상태로 노출
//   STEP 2 약관 동의     — 필수 2건 모두 체크해야 다음으로 간다
//   STEP 3 본인인증      — 휴대폰 단일(NICE 표준창 팝업)
//   STEP 4 정보 입력     — 기업정보 + 개인정보, 이름·휴대폰은 인증 결과로 고정
//   STEP 5 가입완료      — 보류 상태로 생성되고 승인 안내가 뜬다
//
// 개인회원 탭을 감추지 않는 이유는 기획서 A2 에 있다 —
// "개인회원이 나중에 열린다는 사실을 첫 화면에서 알린다".

import Link from "next/link";
import { useEffect, useState } from "react";
import { btnClass } from "@/components/ui/kit";
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

type TermsItem = {
  kind: string;
  version: string;
  title: string;
  required: boolean;
  body: string;
  bodyHash: string;
};

type CompanyHit = {
  id: string;
  name: string;
  businessNumberMasked: string | null;
  region: string | null;
};

type FormState = {
  username: string;
  password: string;
  passwordConfirm: string;
  email: string;
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  companyPhone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
};

const STEP_LABELS = ["회원 유형", "약관 동의", "본인인증", "정보 입력", "가입완료"];

export function RegisterWizard() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [terms, setTerms] = useState<TermsItem[]>([]);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [identity, setIdentity] = useState<{
    ticket: string;
    name: string;
    mobileNo: string;
    mobileCo: string | null;
  } | null>(null);

  const [form, setForm] = useState<FormState>({
    username: "",
    password: "",
    passwordConfirm: "",
    email: "",
    companyName: "",
    businessRegistrationNumber: "",
    representativeName: "",
    companyPhone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
  });
  const [pickedCompany, setPickedCompany] = useState<CompanyHit | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/terms")
      .then((r) => r.json())
      .then((d) => setTerms(d.terms ?? []))
      .catch(() => setTerms([]));
  }, []);

  const requiredTerms = terms.filter((t) => t.required);
  const requiredAllAgreed = requiredTerms.length > 0 && requiredTerms.every((t) => agreed[t.kind]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.source !== "nice-auth") return;
      const p = e.data.payload || {};
      setLoading(false);
      if (!p.ok) {
        setError(p.message || "본인인증에 실패했습니다.");
        return;
      }
      setError(null);
      setIdentity({ ticket: p.ticket, name: p.name, mobileNo: p.mobileNo, mobileCo: p.mobileCo });
      setStep(4);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function startIdentity() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/nice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "REGISTER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본인인증을 시작하지 못했습니다.");
      // 개발 환경 스텁 응답 — 팝업 없이 곧바로 인증을 마친 것으로 처리한다.
      if (data.stub && data.ticket) {
        setLoading(false);
        setIdentity({
          ticket: data.ticket,
          name: data.name ?? "테스트사용자",
          mobileNo: data.mobileNo ?? "",
          mobileCo: null,
        });
        setStep(4);
        return;
      }
      window.open(
        data.authUrl,
        "niceAuth",
        "width=480,height=812,menubar=no,status=no,toolbar=no,scrollbars=no",
      );
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "본인인증을 시작하지 못했습니다.");
    }
  }

  function openPostcode() {
    const launch = () => {
      if (!window.daum) return;
      new window.daum.Postcode({
        oncomplete: (d) =>
          setForm((f) => ({
            ...f,
            postalCode: d.zonecode,
            address: d.roadAddress || d.jibunAddress,
          })),
      }).open();
    };
    if (window.daum) return launch();
    const s = document.createElement("script");
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.onload = launch;
    document.head.appendChild(s);
  }

  async function submit() {
    setError(null);
    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: "CORPORATE",
          username: form.username,
          email: form.email,
          passwordHash: await hashPasswordForTransport(form.password),
          name: identity?.name ?? "",
          phone: identity?.mobileNo ?? "",
          identityTicket: identity?.ticket ?? "",
          companyName: form.companyName,
          businessRegistrationNumber: form.businessRegistrationNumber,
          representativeName: form.representativeName,
          postalCode: form.postalCode,
          address: [form.address, form.addressDetail].filter(Boolean).join(" "),
          agreedTerms: !!agreed.SERVICE,
          agreedPrivacy: !!agreed.PRIVACY_REQUIRED,
          agreements: terms.map((t) => ({
            kind: t.kind,
            version: t.version,
            bodyHash: t.bodyHash,
            agreed: !!agreed[t.kind],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "가입에 실패했습니다.");
      setJoinNotice(data.joinNotice ?? null);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="register-wizard" data-step={step}>
      <StepBar step={step} />

      {error ? (
        <p
          data-testid="register-error"
          className="mt-6 border border-danger/40 bg-danger/5 px-4 py-3 text-s text-danger"
        >
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <StepMemberType onNext={() => setStep(2)} />
      ) : step === 2 ? (
        <StepTerms
          terms={terms}
          agreed={agreed}
          setAgreed={setAgreed}
          canNext={requiredAllAgreed}
          onPrev={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      ) : step === 3 ? (
        <StepIdentity loading={loading} onStart={startIdentity} onPrev={() => setStep(2)} />
      ) : step === 4 ? (
        <StepInfo
          form={form}
          setForm={setForm}
          identity={identity}
          pickedCompany={pickedCompany}
          onOpenSearch={() => setSearchOpen(true)}
          onClearCompany={() => {
            setPickedCompany(null);
            setForm((f) => ({ ...f, companyName: "", businessRegistrationNumber: "" }));
          }}
          onPostcode={openPostcode}
          loading={loading}
          onPrev={() => setStep(3)}
          onSubmit={submit}
        />
      ) : (
        <StepDone notice={joinNotice} />
      )}

      {searchOpen ? (
        <CompanySearchDialog
          onClose={() => setSearchOpen(false)}
          onPick={(hit) => {
            setPickedCompany(hit);
            setForm((f) => ({ ...f, companyName: hit.name }));
            setSearchOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs" data-testid="step-bar">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const state = n === step ? "current" : n < step ? "done" : "todo";
        return (
          <li key={label} className="flex items-center gap-2" data-state={state}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] tabular-nums ${
                state === "todo"
                  ? "border-border-soft text-muted"
                  : "border-foreground bg-foreground text-background"
              }`}
            >
              {n}
            </span>
            <span className={state === "todo" ? "text-muted" : "font-bold"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StepMemberType({ onNext }: { onNext: () => void }) {
  return (
    <section className="mt-8" data-testid="step-member-type">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">가입하실 회원 유형을 선택해 주세요.</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          data-testid="pick-corporate"
          onClick={onNext}
          className="border border-foreground p-5 text-left transition-colors hover:bg-surface"
        >
          <span className="text-xs font-bold text-accent">가입 가능</span>
          <span className="mt-2 block text-h6-m font-bold">기업회원</span>
          <span className="mt-1 block text-s text-muted">사업자등록증이 있는 법인 · 개인사업자</span>
          <ul className="mt-3 space-y-1 text-s text-muted">
            <li>· 공연 기획사 · 제작사 · 대행사 등</li>
            <li>· 대관 신청 · 계약 · 정산 전 과정 이용</li>
            <li>· 사업자등록번호 진위확인으로 즉시 심사</li>
          </ul>
          <span className={`${btnClass("primary", "md")} mt-5 w-full`}>기업회원으로 가입하기</span>
        </button>

        <div
          data-testid="pick-individual"
          aria-disabled="true"
          className="border border-border-soft p-5 opacity-60"
        >
          <span className="text-xs font-bold text-muted">준비 중</span>
          <span className="mt-2 block text-h6-m font-bold text-muted">개인회원</span>
          <span className="mt-1 block text-s text-muted">사업자등록증이 없는 개인</span>
          <ul className="mt-3 space-y-1 text-s text-muted">
            <li>· 동호회 · 개인 주최자 등</li>
            <li>· 현재 기업회원만 가입할 수 있습니다</li>
            <li>· 오픈 시 공지사항으로 안내</li>
          </ul>
          <button type="button" disabled className={`${btnClass("secondary", "md")} mt-5 w-full`}>
            준비 중입니다
          </button>
        </div>
      </div>
      <p className="mt-6 text-s text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="underline underline-offset-4">
          로그인
        </Link>
      </p>
    </section>
  );
}

function StepTerms({
  terms,
  agreed,
  setAgreed,
  canNext,
  onPrev,
  onNext,
}: {
  terms: TermsItem[];
  agreed: Record<string, boolean>;
  setAgreed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section className="mt-8" data-testid="step-terms">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">약관에 동의해 주세요.</h2>
      <div className="mt-6 space-y-5">
        {terms.map((t) => (
          <div key={t.kind} className="border border-border-soft">
            <label className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
              <span className="text-s font-bold">
                {t.title}{" "}
                <span className={t.required ? "text-accent" : "text-muted"}>
                  ({t.required ? "필수" : "선택"})
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">v{t.version}</span>
                <input
                  type="checkbox"
                  data-testid={`agree-${t.kind}`}
                  checked={!!agreed[t.kind]}
                  onChange={(e) =>
                    setAgreed((p) => ({ ...p, [t.kind]: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
              </span>
            </label>
            <pre
              data-testid={`terms-body-${t.kind}`}
              className="max-h-40 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-6 text-muted"
            >
              {t.body}
            </pre>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onPrev} className={btnClass("secondary", "md")}>
          이전
        </button>
        <button
          type="button"
          data-testid="terms-next"
          disabled={!canNext}
          onClick={onNext}
          className={`${btnClass("primary", "md")} flex-1`}
        >
          다음
        </button>
      </div>
    </section>
  );
}

function StepIdentity({
  loading,
  onStart,
  onPrev,
}: {
  loading: boolean;
  onStart: () => void;
  onPrev: () => void;
}) {
  return (
    <section className="mt-8" data-testid="step-identity">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">본인인증을 진행해 주세요.</h2>
      <p className="mt-2 text-s text-muted">
        본인 명의 휴대폰으로 본인인증을 진행합니다. 인증 결과의 이름·휴대폰번호는 계약 당사자
        정보로 쓰이므로 이후 단계에서 수정할 수 없습니다.
      </p>
      <div className="mt-6 border border-border-soft bg-surface px-6 py-10 text-center">
        <p className="text-h6-m font-bold">휴대폰</p>
        <p className="mt-2 text-s text-muted">본인 명의로 등록된 휴대폰 번호를 이용하여 본인확인</p>
        <button
          type="button"
          data-testid="identity-start"
          disabled={loading}
          onClick={onStart}
          className={`${btnClass("primary", "md")} mt-6`}
        >
          {loading ? "인증창을 여는 중…" : "인증하기"}
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">
        외국인·법인 명의 휴대폰·미성년 등으로 인증이 어려운 경우 고객센터로 문의해 주세요.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onPrev} className={btnClass("secondary", "md")}>
          이전
        </button>
      </div>
    </section>
  );
}

function StepInfo({
  form,
  setForm,
  identity,
  pickedCompany,
  onOpenSearch,
  onClearCompany,
  onPostcode,
  loading,
  onPrev,
  onSubmit,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  identity: { name: string; mobileNo: string; mobileCo: string | null } | null;
  pickedCompany: CompanyHit | null;
  onOpenSearch: () => void;
  onClearCompany: () => void;
  onPostcode: () => void;
  loading: boolean;
  onPrev: () => void;
  onSubmit: () => void;
}) {
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  const locked = !!pickedCompany;

  return (
    <section className="mt-8" data-testid="step-info">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-kr-heading text-h6-m sm:text-h6">회원 정보를 입력해 주세요.</h2>
        <button
          type="button"
          data-testid="open-company-search"
          onClick={onOpenSearch}
          className={btnClass("secondary", "sm")}
        >
          회사정보 불러오기
        </button>
      </div>

      {pickedCompany ? (
        <p
          data-testid="picked-company"
          className="mt-4 flex items-center justify-between gap-3 border border-accent px-4 py-3 text-s"
        >
          <span>
            불러온 회사 <b>{pickedCompany.name}</b>
            <span className="ml-2 text-muted">{pickedCompany.businessNumberMasked}</span>
          </span>
          <button type="button" onClick={onClearCompany} className="underline underline-offset-4">
            다시 선택
          </button>
        </p>
      ) : null}

      <h3 className="mt-8 text-s font-bold">① 기업 정보</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="회사명" required>
          <input data-testid="f-companyName" value={form.companyName} onChange={set("companyName")} readOnly={locked} className={inputCls(locked)} />
        </Field>
        <Field label="대표자 성명" required>
          <input data-testid="f-representativeName" value={form.representativeName} onChange={set("representativeName")} className={inputCls(false)} />
        </Field>
        <Field label="사업자등록번호" required hint="숫자 10자리">
          <input data-testid="f-brn" value={form.businessRegistrationNumber} onChange={set("businessRegistrationNumber")} readOnly={locked} className={inputCls(locked)} />
        </Field>
        <Field label="대표번호">
          <input data-testid="f-companyPhone" value={form.companyPhone} onChange={set("companyPhone")} className={inputCls(false)} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input data-testid="f-postalCode" value={form.postalCode} onChange={set("postalCode")} placeholder="우편번호" className={`${inputCls(false)} w-32`} />
        <button type="button" data-testid="open-postcode" onClick={onPostcode} className={btnClass("secondary", "sm")}>
          우편번호 찾기
        </button>
        <input data-testid="f-address" value={form.address} onChange={set("address")} placeholder="회사주소" className={`${inputCls(false)} min-w-52 flex-1`} />
        <input data-testid="f-addressDetail" value={form.addressDetail} onChange={set("addressDetail")} placeholder="상세주소" className={`${inputCls(false)} min-w-40 flex-1`} />
      </div>

      <h3 className="mt-8 text-s font-bold">② 개인 정보</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="이름" hint="본인인증 결과">
          <input data-testid="f-name" value={identity?.name ?? ""} readOnly className={inputCls(true)} />
        </Field>
        <Field label="휴대폰번호" hint="본인인증 결과">
          <input data-testid="f-phone" value={identity?.mobileNo ?? ""} readOnly className={inputCls(true)} />
        </Field>
        <Field label="로그인 ID" required hint="5~20자 영문·숫자">
          <input data-testid="f-username" value={form.username} onChange={set("username")} className={inputCls(false)} />
        </Field>
        <Field label="이메일" required>
          <input data-testid="f-email" type="email" value={form.email} onChange={set("email")} className={inputCls(false)} />
        </Field>
        <Field label="비밀번호" required hint="8~20자 영문 대소문자·숫자·특수문자">
          <input data-testid="f-password" type="password" value={form.password} onChange={set("password")} className={inputCls(false)} />
        </Field>
        <Field label="비밀번호 확인" required>
          <input data-testid="f-passwordConfirm" type="password" value={form.passwordConfirm} onChange={set("passwordConfirm")} className={inputCls(false)} />
        </Field>
      </div>

      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onPrev} className={btnClass("secondary", "md")}>
          이전
        </button>
        <button
          type="button"
          data-testid="submit-register"
          disabled={loading}
          onClick={onSubmit}
          className={`${btnClass("primary", "md")} flex-1`}
        >
          {loading ? "처리 중…" : "가입 신청"}
        </button>
      </div>
    </section>
  );
}

function StepDone({ notice }: { notice: string | null }) {
  return (
    <section className="mt-8 text-center" data-testid="step-done">
      <h2 className="type-kr-heading text-h5-m sm:text-h5">가입 신청이 접수되었습니다</h2>
      <p className="mt-3 text-s text-muted">승인 완료 후 이용 가능합니다.</p>
      {notice ? (
        <p data-testid="join-notice" className="mt-4 border border-border-soft px-4 py-3 text-s">
          {notice}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted">승인 결과는 알림톡 및 이메일로 안내해 드립니다.</p>
      <Link href="/login" className={`${btnClass("primary", "md")} mt-8`}>
        로그인
      </Link>
    </section>
  );
}

function CompanySearchDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (hit: CompanyHit) => void;
}) {
  const [field, setField] = useState<"name" | "brn">("name");
  const [keyword, setKeyword] = useState("");
  const [state, setState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<CompanyHit[]>([]);

  async function run() {
    const res = await fetch(
      `/api/companies/search?field=${field}&keyword=${encodeURIComponent(keyword)}`,
    );
    const data = await res.json();
    setState(data.state);
    setMessage(data.message);
    setResults(data.results ?? []);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="company-search"
    >
      <div className="w-full max-w-lg bg-background p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-h6-m font-bold">회사정보 불러오기</h3>
          <button type="button" data-testid="search-close" onClick={onClose} aria-label="닫기" className="text-muted">
            ✕
          </button>
        </div>
        <p className="mt-2 text-s text-muted">사업자등록번호 또는 회사명으로 검색해 주세요.</p>

        <div className="mt-4 flex gap-2">
          <select
            data-testid="search-field"
            value={field}
            onChange={(e) => setField(e.target.value as "name" | "brn")}
            className="border border-border-soft px-3 py-2 text-s"
          >
            <option value="name">회사명</option>
            <option value="brn">사업자등록번호</option>
          </select>
          <input
            data-testid="search-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
            className="flex-1 border border-border-soft px-3 py-2 text-s"
          />
          <button type="button" data-testid="search-run" onClick={() => void run()} className={btnClass("primary", "sm")}>
            검색
          </button>
        </div>

        {message ? (
          <p data-testid="search-message" className="mt-4 text-s text-muted">
            {message}
          </p>
        ) : null}

        <ul className="mt-4 space-y-2" data-testid="search-results" data-state={state ?? ""}>
          {results.map((hit) => (
            <li
              key={hit.id}
              className="flex items-center justify-between gap-3 border border-border-soft px-4 py-3"
            >
              <span className="text-s">
                <b>{hit.name}</b>
                <span className="ml-2 text-muted">
                  {hit.businessNumberMasked} · {hit.region}
                </span>
              </span>
              <button
                type="button"
                data-testid="search-pick"
                onClick={() => onPick(hit)}
                className={btnClass("secondary", "sm")}
              >
                선택
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-muted">
          찾으시는 회사가 없다면 창을 닫고 기업 정보를 직접 입력해 신규 등록으로 진행해 주세요.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold">
        {required ? <span className="text-accent">* </span> : null}
        {label}
        {hint ? <span className="ml-1 font-normal text-muted">({hint})</span> : null}
      </span>
      {children}
    </label>
  );
}

function inputCls(readOnly: boolean) {
  return `w-full border px-3 py-2 text-s ${
    readOnly ? "border-border-soft bg-surface text-muted" : "border-border-soft bg-background"
  }`;
}
