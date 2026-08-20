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
import { useToast } from "@/components/ui/Toast";
import { InputCheckMark, PasswordMatchHint } from "@/components/ui/PasswordMatchHint";
import {
  checkBusinessNumber,
  checkEmail,
  checkPassword,
  checkUsername,
  firstFailure,
  PASSWORD_HINT,
  USERNAME_HINT,
} from "@/lib/validation";
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
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // 오류는 토스트로 띄운다. 위저드 상단에 붙이면 스크롤을 내려 입력하다 [다음]을 눌렀을 때
  // 메시지가 화면 밖에 떠서 왜 안 넘어가는지 알 수 없다.
  const setError = toast.error;

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
  const [brnCheck, setBrnCheck] = useState<{ state: string; title: string; message: string } | null>(null);
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
        toast.error(p.message || "본인인증에 실패했습니다.");
        return;
      }
      setIdentity({ ticket: p.ticket, name: p.name, mobileNo: p.mobileNo, mobileCo: p.mobileCo });
      setStep(4);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [toast]);

  async function startIdentity(options?: { bypass?: boolean }) {
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
    // 화면에서 먼저 거른다. 특히 비밀번호는 SHA-256 해시로 보내므로 서버가 원문을 못 본다 —
    // 여기서 통과시키지 않으면 규칙이 아무 데서도 검사되지 않는다.
    const invalid = firstFailure(
      form.companyName.trim() ? null : { ok: false, message: "회사명을 입력해 주세요." },
      checkBusinessNumber(form.businessRegistrationNumber),
      form.representativeName.trim() ? null : { ok: false, message: "대표자 성명을 입력해 주세요." },
      form.postalCode.trim() && form.address.trim()
        ? null
        : { ok: false, message: "우편번호 찾기로 회사주소를 입력해 주세요." },
      identity ? null : { ok: false, message: "휴대폰 본인인증을 먼저 진행해 주세요." },
      checkUsername(form.username),
      checkEmail(form.email),
      checkPassword(form.password),
      form.password === form.passwordConfirm
        ? null
        : { ok: false, message: "비밀번호가 일치하지 않습니다." },
    );
    if (invalid) {
      toast.error(invalid);
      return;
    }
    // 불러오기로 채운 회사는 이미 확인된 번호라 다시 묻지 않는다(기획서 A5).
    //
    // 통과로 보는 상태:
    //   VERIFIED   국세청 조회 완료
    //   REGISTERED 이미 등록된 회사 → 합류 신청. 정상 경로라 막으면 안 된다.
    //   UNCHECKED  진위확인을 쓸 수 없는 환경 → 운영자 심사로 넘긴다
    // 막는 상태: 미확인 · INVALID · NOT_FOUND · BLOCKED(휴·폐업)
    const brnOk =
      pickedCompany !== null ||
      brnCheck?.state === "VERIFIED" ||
      brnCheck?.state === "REGISTERED" ||
      brnCheck?.state === "UNCHECKED";
    if (!brnOk) {
      setError(
        brnCheck
          ? brnCheck.message
          : "사업자등록번호 [중복·진위확인]을 먼저 진행해 주세요.",
      );
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

      {step === 1 ? (
        <StepMemberType onNext={() => setStep(2)} />
      ) : step === 2 ? (
        <StepTerms
          terms={terms}
          agreed={agreed}
          setAgreed={setAgreed}
          canNext={requiredAllAgreed}
          onPrev={() => setStep(1)}
          onNext={() => {
            if (!requiredAllAgreed) {
              toast.error("필수 약관 2건에 모두 동의해 주세요.");
              return;
            }
            setStep(3);
          }}
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
          onUnlock={() => {
            // 값은 지우지 않는다 — 불러온 내용을 바탕으로 고쳐 쓰는 경우가 대부분이다.
            setPickedCompany(null);
            setBrnCheck(null);
          }}
          onOpenSearch={() => {
            // 불러오기를 다시 누르면 잠금이 풀린다. 배너의 [다시 선택] 을 없앴으므로
            // 이 버튼이 유일한 되돌리기 수단이다 — 이게 없으면 회사를 잘못 불러왔을 때
            // 새로고침 말고는 빠져나갈 길이 없다.
            // 입력값은 지우지 않는다. 창을 그냥 닫았을 때 애써 채운 내용이 사라지면 안 된다.
            setPickedCompany(null);
            setBrnCheck(null);
            setSearchOpen(true);
          }}
          onLockCompany={(name) =>
            setPickedCompany({ id: "", name, businessNumberMasked: null, region: null })
          }
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
          onPick={async (hit) => {
            setPickedCompany(hit);
            // 불러온 회사는 이미 확인된 번호다 — 중복확인·진위확인을 생략한다(기획서 A5).
            setBrnCheck({ state: "REGISTERED", title: "이미 등록된 회사", message: `${hit.name} — 합류 신청됩니다.` });
            setSearchOpen(false);
            // 기업정보 전 항목을 채운다. 채워진 칸은 읽기 전용이 된다.
            try {
              const res = await fetch(`/api/companies/${hit.id}/profile`);
              const data = await res.json();
              const c = data.company;
              if (c) {
                setForm((f) => ({
                  ...f,
                  companyName: c.name ?? hit.name,
                  businessRegistrationNumber: c.businessRegistrationNumber ?? "",
                  representativeName: c.representativeName ?? "",
                  companyPhone: c.companyPhone ?? "",
                  companyFax: c.companyFax ?? "",
                  corporateNumber: c.corporateNumber ?? "",
                  postalCode: c.postalCode ?? "",
                  address: c.address ?? "",
                  // 직접 입력해 둔 상세주소가 남으면 다른 회사 주소에 붙는다.
                  addressDetail: "",
                }));
                return;
              }
            } catch {
              // 조회에 실패해도 회사명만이라도 채워 흐름이 끊기지 않게 한다.
            }
            setForm((f) => ({ ...f, companyName: hit.name }));
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
        {/* disabled 로 막아두면 왜 안 넘어가는지 알 수 없다 — 누르면 이유를 알려준다. */}
        <button
          type="button"
          data-testid="terms-next"
          onClick={onNext}
          className={`${btnClass("primary", "md")} flex-1 justify-center ${canNext ? "" : "opacity-50"}`}
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
  onUnlock,
  onLockCompany,
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
  brnCheck: { state: string; title: string; message: string } | null;
  setBrnCheck: React.Dispatch<React.SetStateAction<{ state: string; title: string; message: string } | null>>;
  idCheck: { available: boolean; message: string } | null;
  setIdCheck: React.Dispatch<React.SetStateAction<{ available: boolean; message: string } | null>>;
  onOpenSearch: () => void;
  /** 불러온 회사를 되돌린다 — 잠금을 풀고 직접 입력할 수 있게 한다 */
  onUnlock: () => void;
  /** 이미 등록된 회사로 확인되면 기업정보를 잠근다. */
  onLockCompany: (name: string) => void;
  onPostcode: () => void;
  loading: boolean;
  onPrev: () => void;
  onSubmit: () => void;
}) {
  const toast = useToast();
  const [checking, setChecking] = useState<"brn" | "id" | null>(null);
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  const locked = !!pickedCompany;

  // 사업자등록번호 중복확인 + 국세청 진위확인 (기획서 A5 · 1-34)
  async function verifyBrn() {
    const invalid = firstFailure(checkBusinessNumber(form.businessRegistrationNumber));
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setChecking("brn");
    try {
      const res = await fetch("/api/companies/verify-brn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessRegistrationNumber: form.businessRegistrationNumber }),
      });
      const data = await res.json();
      const state: string = data.state ?? "ERROR";
      const title: string = data.title ?? "인증 실패";
      const message: string = data.message ?? data.error ?? "";
      setBrnCheck({ state, title, message });

      // 버튼을 누른 결과는 화면 안 문구뿐 아니라 토스트로도 알린다.
      // 문구만 있으면 스크롤 위치에 따라 눈에 안 들어온다 — 눌렀는데 아무 일도
      // 없는 것처럼 보인다는 지적이 실제로 있었다.
      const notice = message ? `${title} — ${message}` : title;
      if (state === "VERIFIED") toast.success(notice);
      else if (state === "REGISTERED" || state === "UNCHECKED") toast.info(notice);
      else toast.error(notice);

      // 이미 등록된 회사면 저장된 기업정보를 그대로 채운다 — 회사정보 불러오기와 같다.
      if (data.state === "REGISTERED" && data.company) {
        const c = data.company;
        setForm((p) => ({
          ...p,
          companyName: c.name ?? p.companyName,
          businessRegistrationNumber: c.businessRegistrationNumber ?? p.businessRegistrationNumber,
          representativeName: c.representativeName ?? "",
          companyPhone: c.companyPhone ?? "",
          companyFax: c.companyFax ?? "",
          corporateNumber: c.corporateNumber ?? "",
          postalCode: c.postalCode ?? "",
          address: c.address ?? "",
        }));
        onLockCompany(c.name ?? "");
        return;
      }

      // 신규 등록이면 국세청 조회값으로 상호·대표자를 채운다. 등록부 값이 정본이라
      // 입력값이 있어도 덮어쓴다 — 표기가 어긋난 채 제출되면 운영자 심사에서
      // "불일치"로 잡혀 승인이 늦어진다. 주소·대표번호는 이 응답에 없어 직접 입력해야 한다.
      if (data.state === "VERIFIED" || data.state === "UNCHECKED") {
        setForm((p) => ({
          ...p,
          companyName: data.companyName || p.companyName,
          representativeName: data.representativeName || p.representativeName,
        }));
      }
    } catch {
      // 예전에는 여기서 조용히 끝났다 — 버튼만 멈추고 아무 말이 없었다.
      const message = "확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setBrnCheck({ state: "ERROR", title: "인증 실패", message });
      toast.error(message);
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
      const available = data.available === true;
      const message: string = data.message ?? data.error ?? "";
      setIdCheck({ available, message });
      if (message) (available ? toast.success : toast.error)(message);
    } catch {
      const message = "확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setIdCheck({ available: false, message });
      toast.error(message);
    } finally {
      setChecking(null);
    }
  }

  const brnTone =
    brnCheck?.state === "VERIFIED"
      ? "text-ok"
      : brnCheck?.state === "REGISTERED"
        ? "text-accent"
        : brnCheck?.state === "UNCHECKED"
          ? "text-warn"
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

      <h3 className="mt-8 text-s font-bold">① 기업 정보</h3>
      {locked ? null : (
        <p className="mt-1 break-keep text-xs leading-6 text-muted">
          이미 등록된 회사라면 [회사정보 불러오기]로 채우세요.
        </p>
      )}
      <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {/* 사업자등록번호가 먼저다 — 진위확인을 거치면 아래 회사명·대표자가 채워진다. */}
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
              {/* 불러온 회사는 등록 때 이미 확인이 끝났으니 "확인 완료"를 보여줬는데,
                  불러왔다가 직접 입력하고 싶어질 때 되돌릴 길이 없었다.
                  상태 표시보다 되돌리기가 더 필요하다 — [취소] 로 바꾼다. */}
              {locked ? (
                <button
                  type="button"
                  data-testid="brn-cancel"
                  onClick={onUnlock}
                  className={btnClass("secondary", "md")}
                >
                  취소
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="verify-brn"
                  disabled={checking === "brn"}
                  onClick={verifyBrn}
                  className={`${btnClass("secondary", "md")} whitespace-nowrap`}
                >
                  {checking === "brn" ? "확인 중…" : "중복·진위확인"}
                </button>
              )}
            </span>
          </Field>
          {brnCheck ? (
            <div data-testid="brn-check-message" className="mt-2.5 break-keep text-xs leading-6">
              <span className={`font-bold ${brnTone}`}>{brnCheck.title}</span>
              <span className="ml-2 text-muted">{brnCheck.message}</span>
              {brnCheck.state === "VERIFIED" || brnCheck.state === "UNCHECKED" ? (
                <p className="mt-1 text-muted">
                  회사명 · 대표자 성명은 국세청 등록 정보로 채워집니다. 주소 · 대표번호는 직접
                  입력해 주세요.
                </p>
              ) : null}
              {brnCheck.state === "REGISTERED" ? (
                <p className="mt-1 text-muted">
                  등록된 기업 정보가 확인되었습니다. 개인 정보만 입력하면 해당 기업의 구성원으로
                  가입할 수 있습니다.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <Field label="회사명" required>
          <input data-testid="f-companyName" value={form.companyName} onChange={set("companyName")} readOnly={locked} className={inputCls(locked)} />
        </Field>
        <Field label="대표자 성명" required>
          <input data-testid="f-representativeName" readOnly={locked} value={form.representativeName} onChange={set("representativeName")} className={inputCls(locked)} />
        </Field>

        <Field label="대표번호">
          <input data-testid="f-companyPhone" readOnly={locked} value={form.companyPhone} onChange={set("companyPhone")} placeholder="02-1234-5678" className={inputCls(locked)} />
        </Field>
        <Field label="대표팩스">
          <input data-testid="f-companyFax" readOnly={locked} value={form.companyFax} onChange={set("companyFax")} className={inputCls(locked)} />
        </Field>
        <Field label="법인등록번호" hint="선택 · 법인만">
          <input data-testid="f-corporateNumber" readOnly={locked} value={form.corporateNumber} onChange={set("corporateNumber")} placeholder="110111-1234567" className={inputCls(locked)} />
        </Field>
        <div />

        <div className="sm:col-span-2">
          <Field label="회사주소" required>
            <span className="flex flex-wrap gap-2">
              <input data-testid="f-postalCode" readOnly={locked} value={form.postalCode} onChange={set("postalCode")} placeholder="우편번호" className={inputCls(locked, "w-36")} />
              <button type="button" data-testid="open-postcode" disabled={locked} onClick={onPostcode} className={`${btnClass("secondary", "md")} whitespace-nowrap`}>
                우편번호 찾기
              </button>
            </span>
          </Field>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <input data-testid="f-address" readOnly={locked} value={form.address} onChange={set("address")} placeholder="회사주소" className={inputCls(locked)} />
            <input data-testid="f-addressDetail" readOnly={locked} value={form.addressDetail} onChange={set("addressDetail")} placeholder="상세주소" className={inputCls(locked)} />
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
          <Field label="로그인 ID" required hint={USERNAME_HINT}>
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
        <Field label="비밀번호" required hint={PASSWORD_HINT}>
          <div className="relative">
            <input
              data-testid="f-password"
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              className={`${inputCls(false)} pr-9`}
            />
            <InputCheckMark show={checkPassword(form.password).ok} />
          </div>
        </Field>
        <Field label="비밀번호 확인" required>
          <div className="relative">
            <input
              data-testid="f-passwordConfirm"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={form.passwordConfirm}
              onChange={set("passwordConfirm")}
              className={`${inputCls(false)} pr-9`}
            />
            <InputCheckMark show={form.passwordConfirm.length > 0 && form.password === form.passwordConfirm} />
          </div>
          <PasswordMatchHint password={form.password} confirm={form.passwordConfirm} />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-8"
      data-testid="company-search"
      role="dialog"
      aria-modal="true"
      aria-label="회사정보 불러오기"
      // 어두운 바깥을 누르거나 Esc 를 누르면 닫힌다 — 창을 띄웠으면 그렇게 닫히리라 기대한다.
      // 안쪽을 눌렀을 때 닫히면 안 되므로 대상이 이 겹판 자신일 때만 닫는다.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      /* 포커스는 열릴 때 딱 한 번 검색창으로 보낸다.
         인라인 ref 로 겹판에 focus() 를 걸었더니 렌더마다 다시 실행돼, 글자 하나 칠 때마다
         입력칸에서 커서를 빼앗았다 — 실사용에서 바로 신고된 버그다. */
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-y-auto bg-background p-7 sm:p-9">
        <div className="flex items-center justify-between">
          <h3 className="text-h5-m font-bold sm:text-h5">회사정보 불러오기</h3>
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
            className="border border-border-soft px-3 py-2.5 text-s"
          >
            <option value="name">회사명</option>
            <option value="brn">사업자등록번호</option>
          </select>
          <input
            data-testid="search-keyword"
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
            placeholder="회사명 2자 이상 또는 사업자등록번호 10자리"
            className="min-w-0 flex-1 border border-border-soft px-3 py-2.5 text-s"
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

        <ul className="mt-5 space-y-2.5" data-testid="search-results" data-state={state ?? ""}>
          {results.map((hit) => (
            <li
              key={hit.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-border-soft px-5 py-4"
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
