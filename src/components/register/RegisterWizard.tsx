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
import { useEffect, useRef, useState } from "react";
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
  companyFax: string;
  corporateNumber: string;
  personalPhone: string;
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
    companyFax: "",
    corporateNumber: "",
    personalPhone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
  });
  const [pickedCompany, setPickedCompany] = useState<CompanyHit | null>(null);
  // 개발 환경에서 본인인증을 건너뛴 상태인지 — 화면에 그대로 표시해 착각을 막는다.
  const [stubMode, setStubMode] = useState(false);
  // 개발 환경에서만 우회 버튼을 보여준다.
  const [devBypass, setDevBypass] = useState(false);
  // 인증 결과를 기다리는 중인지. 팝업 감시와 메시지 수신이 서로를 덮어쓰지 않게 ref 로 둔다.
  const awaitingAuth = useRef(false);
  // 사업자등록번호 중복·진위확인, 아이디 중복확인 결과
  const [brnCheck, setBrnCheck] = useState<{ state: string; message: string } | null>(null);
  const [idCheck, setIdCheck] = useState<{ available: boolean; message: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/terms")
      .then((r) => r.json())
      .then((d) => setTerms(d.terms ?? []))
      .catch(() => setTerms([]));
    fetch("/api/auth/nice/config")
      .then((r) => r.json())
      .then((d) => setDevBypass(d.devBypass === true))
      .catch(() => setDevBypass(false));
  }, []);

  const requiredTerms = terms.filter((t) => t.required);
  const requiredAllAgreed = requiredTerms.length > 0 && requiredTerms.every((t) => agreed[t.kind]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.source !== "nice-auth") return;
      const p = e.data.payload || {};
      awaitingAuth.current = false;
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

  async function startIdentity(options?: { bypass?: boolean }) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/nice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "REGISTER", devBypass: options?.bypass === true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본인인증을 시작하지 못했습니다.");

      // 개발 환경 우회 — 팝업 없이 곧바로 인증을 마친 것으로 처리한다.
      if (data.stub && data.ticket) {
        setLoading(false);
        setStubMode(true);
        setIdentity({
          ticket: data.ticket,
          name: data.name ?? "테스트사용자",
          mobileNo: data.mobileNo ?? "",
          mobileCo: null,
        });
        setStep(4);
        return;
      }

      awaitingAuth.current = true;
      const popup = window.open(
        data.authUrl,
        "niceAuth",
        "width=480,height=812,menubar=no,status=no,toolbar=no,scrollbars=no",
      );
      if (!popup) {
        awaitingAuth.current = false;
        setLoading(false);
        setError("팝업이 차단되었습니다. 브라우저 팝업 차단을 해제한 뒤 다시 시도해 주세요.");
        return;
      }
      // 사용자가 인증창을 그냥 닫으면 결과 메시지가 오지 않는다.
      // 감시하지 않으면 버튼이 "인증창을 여는 중…" 인 채로 영영 잠긴다.
      const timer = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(timer);
        // 결과 메시지가 이미 왔으면 건드리지 않는다(정상 완료 후에도 창은 닫힌다).
        if (!awaitingAuth.current) return;
        awaitingAuth.current = false;
        setLoading(false);
        setError("본인인증이 완료되지 않았습니다. 다시 시도해 주세요.");
      }, 700);
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
    // 불러오기로 채운 회사는 이미 확인된 번호라 다시 묻지 않는다(기획서 A5).
    if (!pickedCompany && brnCheck?.state !== "VERIFIED" && brnCheck?.state !== "UNCHECKED") {
      setError("사업자등록번호 [중복·진위확인]을 먼저 진행해 주세요.");
      return;
    }
    if (idCheck?.available !== true) {
      setError("로그인 ID [중복확인]을 먼저 진행해 주세요.");
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
          companyPhone: form.companyPhone,
          companyFax: form.companyFax,
          corporateNumber: form.corporateNumber,
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
        <StepIdentity
          loading={loading}
          devBypass={devBypass}
          onStart={() => startIdentity()}
          onBypass={() => startIdentity({ bypass: true })}
          onPrev={() => setStep(2)}
        />
      ) : step === 4 ? (
        <StepInfo
          form={form}
          setForm={setForm}
          identity={identity}
          stubMode={stubMode}
          pickedCompany={pickedCompany}
          brnCheck={brnCheck}
          setBrnCheck={setBrnCheck}
          idCheck={idCheck}
          setIdCheck={setIdCheck}
          onOpenSearch={() => setSearchOpen(true)}
          onClearCompany={() => {
            setPickedCompany(null);
            setBrnCheck(null);
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
            // 불러온 회사는 이미 확인된 번호다 — 중복확인·진위확인을 생략한다(기획서 A5).
            setBrnCheck({ state: "VERIFIED", message: `불러온 회사입니다 — ${hit.name}` });
            setForm((f) => ({ ...f, companyName: hit.name, businessRegistrationNumber: "" }));
            setSearchOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2.5 text-xs" data-testid="step-bar">
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
            <span className={`whitespace-nowrap ${state === "todo" ? "text-muted" : "font-bold"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepMemberType({ onNext }: { onNext: () => void }) {
  return (
    <section className="mt-10" data-testid="step-member-type">
      <h2 className="type-kr-heading break-keep text-h6-m sm:text-h6">
        가입하실 회원 유형을 선택해 주세요.
      </h2>

      {/* items-stretch(기본)로 두 카드 높이를 맞추고, 각 카드 안에서 버튼을 바닥에 붙인다.
          높이가 다르면 두 버튼이 어긋나 보인다. */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <button
          type="button"
          data-testid="pick-corporate"
          onClick={onNext}
          className="flex h-full flex-col border border-foreground p-6 text-left transition-colors hover:bg-surface"
        >
          <span className="flex-1">
            <span className="block text-xs font-bold text-accent">가입 가능</span>
            <span className="mt-2 block text-h6-m font-bold">기업회원</span>
            <span className="mt-1.5 block break-keep text-s leading-6 text-muted">
              사업자등록증이 있는 법인 · 개인사업자
            </span>
            <span className="mt-4 block space-y-2 break-keep text-s leading-6 text-muted">
              <span className="block">· 공연 기획사 · 제작사 · 대행사 등</span>
              <span className="block">· 대관 신청 · 계약 · 정산 전 과정 이용</span>
              <span className="block">· 사업자등록번호 진위확인으로 즉시 심사</span>
            </span>
          </span>
          <span className={`${btnClass("primary", "md")} mt-7 w-full justify-center text-center`}>
            기업회원으로 가입하기
          </span>
        </button>

        <div
          data-testid="pick-individual"
          aria-disabled="true"
          className="flex h-full flex-col border border-border-soft p-6 opacity-60"
        >
          <div className="flex-1">
            <p className="text-xs font-bold text-muted">준비 중</p>
            <p className="mt-2 text-h6-m font-bold text-muted">개인회원</p>
            <p className="mt-1.5 break-keep text-s leading-6 text-muted">
              사업자등록증이 없는 개인
            </p>
            <ul className="mt-4 space-y-2 break-keep text-s leading-6 text-muted">
              <li>· 동호회 · 개인 주최자 등</li>
              <li>· 현재 기업회원만 가입할 수 있습니다</li>
              <li>· 오픈 시 공지사항으로 안내</li>
            </ul>
          </div>
          <button
            type="button"
            disabled
            className={`${btnClass("secondary", "md")} mt-7 w-full justify-center text-center`}
          >
            준비 중입니다
          </button>
        </div>
      </div>

      <p className="mt-7 break-keep text-s text-muted">
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
      <h2 className="type-kr-heading break-keep text-h6-m sm:text-h6">약관에 동의해 주세요.</h2>
      <p className="mt-2 break-keep text-s text-muted">
        필수 항목 2건에 모두 동의하셔야 다음 단계로 진행할 수 있습니다.
      </p>
      <div className="mt-6 space-y-5">
        {terms.map((t) => (
          <div key={t.kind} className="border border-border-soft">
            <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-border-soft px-5 py-4">
              <span className="break-keep text-s font-bold">
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
              className="max-h-44 overflow-y-auto whitespace-pre-wrap break-keep px-5 py-4 font-sans text-xs leading-7 text-muted"
            >
              {t.body}
            </pre>
          </div>
        ))}
      </div>
      <div className="mt-9 flex gap-3">
        <button type="button" onClick={onPrev} className={`${btnClass("secondary", "md")} justify-center`}>
          이전
        </button>
        <button
          type="button"
          data-testid="terms-next"
          disabled={!canNext}
          onClick={onNext}
          className={`${btnClass("primary", "md")} flex-1 justify-center`}
        >
          다음
        </button>
      </div>
    </section>
  );
}

function StepIdentity({
  loading,
  devBypass,
  onStart,
  onBypass,
  onPrev,
}: {
  loading: boolean;
  devBypass: boolean;
  onStart: () => void;
  onBypass: () => void;
  onPrev: () => void;
}) {
  return (
    <section className="mt-8" data-testid="step-identity">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">본인인증을 진행해 주세요.</h2>
      <p className="mt-2 max-w-2xl break-keep text-s text-muted">
        본인 명의 휴대폰으로 본인인증을 진행합니다. 인증 결과의 이름·휴대폰번호는 계약 당사자
        정보로 쓰이므로 이후 단계에서 수정할 수 없습니다.
      </p>
      <div className="mt-7 border border-border-soft bg-surface px-6 py-12 text-center">
        <p className="text-h6-m font-bold">휴대폰</p>
        <p className="mx-auto mt-2.5 max-w-sm break-keep text-s leading-6 text-muted">
          본인 명의로 등록된 휴대폰 번호를 이용하여 본인확인
        </p>
        <button
          type="button"
          data-testid="identity-start"
          disabled={loading}
          onClick={onStart}
          className={`${btnClass("primary", "md")} mt-7 min-w-40 justify-center`}
        >
          {loading ? "인증창을 여는 중…" : "인증하기"}
        </button>
      </div>
      <p className="mt-4 break-keep text-xs text-muted">
        외국인·법인 명의 휴대폰·미성년 등으로 인증이 어려운 경우 고객센터로 문의해 주세요.
      </p>
      {/* 개발 환경 전용 — 표준창 인증은 실제 사람이 휴대폰으로 해야 해서
          화면 흐름을 훑어볼 때 막힌다. 운영에는 이 변수가 없어 버튼이 뜨지 않는다. */}
      {devBypass ? (
        <div className="mt-6 border border-warn/40 px-4 py-3">
          <p className="break-keep text-xs leading-6 text-warn">
            개발 환경에서만 보이는 버튼입니다. 인증을 건너뛰고 다음 단계로 넘어갑니다.
          </p>
          <button
            type="button"
            data-testid="identity-bypass"
            disabled={loading}
            onClick={onBypass}
            className={`${btnClass("secondary", "sm")} mt-2.5 justify-center`}
          >
            인증 없이 다음 (개발용)
          </button>
        </div>
      ) : null}

      <div className="mt-9 flex gap-3">
        <button type="button" onClick={onPrev} className={`${btnClass("secondary", "md")} justify-center`}>
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
  stubMode,
  pickedCompany,
  brnCheck,
  setBrnCheck,
  idCheck,
  setIdCheck,
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
  stubMode: boolean;
  pickedCompany: CompanyHit | null;
  brnCheck: { state: string; message: string } | null;
  setBrnCheck: React.Dispatch<React.SetStateAction<{ state: string; message: string } | null>>;
  idCheck: { available: boolean; message: string } | null;
  setIdCheck: React.Dispatch<React.SetStateAction<{ available: boolean; message: string } | null>>;
  onOpenSearch: () => void;
  onClearCompany: () => void;
  onPostcode: () => void;
  loading: boolean;
  onPrev: () => void;
  onSubmit: () => void;
}) {
  const [checking, setChecking] = useState<"brn" | "id" | null>(null);
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  const locked = !!pickedCompany;

  // 사업자등록번호 중복확인 + 국세청 진위확인 (기획서 A5 · 1-34)
  async function verifyBrn() {
    setChecking("brn");
    try {
      const res = await fetch("/api/companies/verify-brn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessRegistrationNumber: form.businessRegistrationNumber }),
      });
      const data = await res.json();
      setBrnCheck({ state: data.state ?? "ERROR", message: data.message ?? data.error ?? "" });
      // 조회된 상호·대표자를 비워둔 칸에 채워준다. 입력값이 있으면 건드리지 않는다.
      if (data.state === "VERIFIED") {
        setForm((p) => ({
          ...p,
          companyName: p.companyName || data.companyName || "",
          representativeName: p.representativeName || data.representativeName || "",
        }));
      }
    } finally {
      setChecking(null);
    }
  }

  async function checkUsername() {
    setChecking("id");
    try {
      const res = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username }),
      });
      const data = await res.json();
      setIdCheck({ available: data.available === true, message: data.message ?? data.error ?? "" });
    } finally {
      setChecking(null);
    }
  }

  const brnTone =
    brnCheck?.state === "VERIFIED"
      ? "text-ok"
      : brnCheck?.state === "REGISTERED" || brnCheck?.state === "UNCHECKED"
        ? "text-muted"
        : "text-danger";

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
      <p className="mt-2 break-keep text-xs text-muted">* 표시는 필수 입력 항목입니다.</p>

      {pickedCompany ? (
        <p
          data-testid="picked-company"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-accent px-4 py-3 text-s"
        >
          <span className="break-keep">
            불러온 회사 <b>{pickedCompany.name}</b>
            <span className="ml-2 text-muted">{pickedCompany.businessNumberMasked}</span>
          </span>
          <button type="button" onClick={onClearCompany} className="underline underline-offset-4">
            다시 선택
          </button>
        </p>
      ) : null}

      <h3 className="mt-8 text-s font-bold">① 기업 정보</h3>
      <p className="mt-1 break-keep text-xs text-muted">
        이미 등록된 회사라면 [회사정보 불러오기]로 채우세요.
      </p>
      <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field label="회사명" required>
          <input data-testid="f-companyName" value={form.companyName} onChange={set("companyName")} readOnly={locked} className={inputCls(locked)} />
        </Field>
        <Field label="대표자 성명" required>
          <input data-testid="f-representativeName" value={form.representativeName} onChange={set("representativeName")} className={inputCls(false)} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="사업자등록번호" required hint="숫자 10자리">
            <span className="flex gap-2">
              <input
                data-testid="f-brn"
                value={form.businessRegistrationNumber}
                onChange={(e) => {
                  set("businessRegistrationNumber")(e);
                  setBrnCheck(null);
                }}
                readOnly={locked}
                placeholder="120-81-47521"
                className={`${inputCls(locked)} flex-1`}
              />
              <button
                type="button"
                data-testid="verify-brn"
                disabled={locked || checking === "brn" || !form.businessRegistrationNumber}
                onClick={verifyBrn}
                className={`${btnClass("secondary", "md")} whitespace-nowrap`}
              >
                {checking === "brn" ? "확인 중…" : "중복·진위확인"}
              </button>
            </span>
          </Field>
          {brnCheck ? (
            <p data-testid="brn-check-message" className={`mt-2 break-keep text-xs ${brnTone}`}>
              {brnCheck.message}
            </p>
          ) : null}
        </div>

        <Field label="대표번호">
          <input data-testid="f-companyPhone" value={form.companyPhone} onChange={set("companyPhone")} placeholder="02-1234-5678" className={inputCls(false)} />
        </Field>
        <Field label="대표팩스">
          <input data-testid="f-companyFax" value={form.companyFax} onChange={set("companyFax")} className={inputCls(false)} />
        </Field>
        <Field label="법인등록번호" hint="선택 · 법인만">
          <input data-testid="f-corporateNumber" value={form.corporateNumber} onChange={set("corporateNumber")} placeholder="110111-1234567" className={inputCls(false)} />
        </Field>
        <div />

        <div className="sm:col-span-2">
          <Field label="회사주소" required>
            <span className="flex flex-wrap gap-2">
              <input data-testid="f-postalCode" value={form.postalCode} onChange={set("postalCode")} placeholder="우편번호" className={inputCls(false, "w-36")} />
              <button type="button" data-testid="open-postcode" onClick={onPostcode} className={`${btnClass("secondary", "md")} whitespace-nowrap`}>
                우편번호 찾기
              </button>
            </span>
          </Field>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <input data-testid="f-address" value={form.address} onChange={set("address")} placeholder="회사주소" className={inputCls(false)} />
            <input data-testid="f-addressDetail" value={form.addressDetail} onChange={set("addressDetail")} placeholder="상세주소" className={inputCls(false)} />
          </div>
        </div>
      </div>

      <h3 className="mt-10 text-s font-bold">② 개인 정보</h3>
      <p className="mt-1 break-keep text-xs text-muted">
        이름 · 휴대폰번호는 본인인증 결과가 그대로 들어가며 수정할 수 없습니다.
      </p>
      {stubMode ? (
        <p
          data-testid="stub-notice"
          className="mt-3 break-keep border border-warn/40 px-4 py-2.5 text-xs leading-6 text-warn"
        >
          개발 환경: 본인인증을 건너뛴 상태입니다. 아래 이름 · 휴대폰번호는 실제 인증 결과가 아닙니다.
        </p>
      ) : null}
      <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field label="이름" hint="본인인증 결과">
          <input data-testid="f-name" value={identity?.name ?? ""} readOnly className={inputCls(true)} />
        </Field>
        <Field label="휴대폰번호" hint="본인인증 결과">
          <input data-testid="f-phone" value={identity?.mobileNo ?? ""} readOnly className={inputCls(true)} />
        </Field>

        <div>
          <Field label="로그인 ID" required hint="5~20자 영문·숫자">
            <span className="flex gap-2">
              <input
                data-testid="f-username"
                value={form.username}
                onChange={(e) => {
                  set("username")(e);
                  setIdCheck(null);
                }}
                className={`${inputCls(false)} flex-1`}
              />
              <button
                type="button"
                data-testid="check-username"
                disabled={checking === "id" || !form.username}
                onClick={checkUsername}
                className={`${btnClass("secondary", "md")} whitespace-nowrap`}
              >
                {checking === "id" ? "확인 중…" : "중복확인"}
              </button>
            </span>
          </Field>
          {idCheck ? (
            <p
              data-testid="id-check-message"
              className={`mt-2 break-keep text-xs ${idCheck.available ? "text-ok" : "text-danger"}`}
            >
              {idCheck.message}
            </p>
          ) : null}
        </div>

        <Field label="이메일" required>
          <input data-testid="f-email" type="email" value={form.email} onChange={set("email")} className={inputCls(false)} />
        </Field>
        <Field label="비밀번호" required hint="8~20자 영문 대소문자·숫자·특수문자">
          <input data-testid="f-password" type="password" value={form.password} onChange={set("password")} className={inputCls(false)} />
        </Field>
        <Field label="비밀번호 확인" required>
          <input data-testid="f-passwordConfirm" type="password" value={form.passwordConfirm} onChange={set("passwordConfirm")} className={inputCls(false)} />
        </Field>
        <Field label="전화번호">
          <input data-testid="f-personalPhone" value={form.personalPhone} onChange={set("personalPhone")} placeholder="02-544-1651" className={inputCls(false)} />
        </Field>
      </div>

      <div className="mt-10 flex gap-3">
        <button type="button" onClick={onPrev} className={`${btnClass("secondary", "md")} justify-center`}>
          이전
        </button>
        <button
          type="button"
          data-testid="submit-register"
          disabled={loading}
          onClick={onSubmit}
          className={`${btnClass("primary", "md")} flex-1 justify-center`}
        >
          {loading ? "처리 중…" : "가입 신청"}
        </button>
      </div>
    </section>
  );
}

function StepDone({ notice }: { notice: string | null }) {
  return (
    <section className="mt-12 text-center" data-testid="step-done">
      <h2 className="type-kr-heading break-keep text-h5-m sm:text-h5">가입 신청이 접수되었습니다</h2>
      <p className="mt-3 break-keep text-s leading-6 text-muted">승인 완료 후 이용 가능합니다.</p>
      {notice ? (
        <p data-testid="join-notice" className="mx-auto mt-5 max-w-lg break-keep border border-border-soft px-5 py-4 text-s leading-6">
          {notice}
        </p>
      ) : null}
      <p className="mt-3 break-keep text-xs leading-6 text-muted">
        승인 결과는 알림톡 및 이메일로 안내해 드립니다.
      </p>
      <Link href="/login" className={`${btnClass("primary", "md")} mt-9 min-w-40 justify-center`}>
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
        <p className="mt-2 break-keep text-s leading-6 text-muted">
          사업자등록번호 또는 회사명으로 검색해 주세요.
        </p>

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
          <button type="button" data-testid="search-run" onClick={() => void run()} className={`${btnClass("primary", "sm")} whitespace-nowrap`}>
            검색
          </button>
        </div>

        {message ? (
          <p data-testid="search-message" className="mt-4 break-keep text-s leading-6 text-muted">
            {message}
          </p>
        ) : null}

        <ul className="mt-4 space-y-2" data-testid="search-results" data-state={state ?? ""}>
          {results.map((hit) => (
            <li
              key={hit.id}
              className="flex items-center justify-between gap-3 border border-border-soft px-4 py-3.5"
            >
              <span className="break-keep text-s leading-6">
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

        <p className="mt-5 break-keep text-xs leading-6 text-muted">
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
      <span className="mb-2 block break-keep text-xs leading-5 font-bold">
        {required ? <span className="text-accent">* </span> : null}
        {label}
        {hint ? <span className="ml-1 font-normal text-muted">({hint})</span> : null}
      </span>
      {children}
    </label>
  );
}

function inputCls(readOnly: boolean, width = "w-full") {
  // 폭을 인자로 받는다 — 문자열에 w-full 을 박아두면 w-32 같은 지정이 충돌해 먹지 않는다.
  return `${width} border px-3 py-2 text-s ${
    readOnly ? "border-border-soft bg-surface text-muted" : "border-border-soft bg-background"
  }`;
}
