"use client";

// 회원가입 5스텝 (기획서 A2~A8).
//
//   STEP 1 기업회원 안내  — 기업회원 카드 한 장
//   STEP 2 약관 동의     — 필수 2건 모두 체크해야 다음으로 간다
//   STEP 3 본인인증      — 휴대폰 단일(NICE 표준창 팝업)
//   STEP 4 정보 입력     — 기업정보 + 개인정보, 이름·휴대폰은 인증 결과로 고정
//   STEP 5 가입완료      — 보류 상태로 생성되고 승인 안내가 뜬다
//
// [개정 2026-08-30] 개인회원 카드를 뺐다. 기획서 A2 는 "개인회원이 나중에 열린다는 사실을
// 첫 화면에서 알린다"고 했지만, 고를 수 없는 카드를 나란히 두면 유형을 고르는 화면처럼
// 보인다. 알려야 할 사실은 카드 대신 카드 아래 한 줄로 남겼다.

import Link from "next/link";
import { useDialog } from "@/components/ui/Dialog";
import { useEffect, useRef, useState } from "react";
import { btnClass, toggleClass } from "@/components/ui/kit";
import { APPLICANT_COMPANY_TYPE_LABEL, type ApplicantCompanyType } from "@/lib/pricing/types";

const APPLICANT_COMPANY_TYPES = Object.keys(APPLICANT_COMPANY_TYPE_LABEL) as ApplicantCompanyType[];
import { useToast } from "@/components/ui/Toast";
import { InputCheckMark, PasswordMatchHint } from "@/components/ui/PasswordMatchHint";
import {
  sanitizePasswordInput,
  sanitizeUsernameInput,
  checkBusinessNumber,
  checkEmail,
  checkPassword,
  checkUsername,
  firstFailure,
  PASSWORD_HINT,
  USERNAME_HINT,
} from "@/lib/validation";
import { hashPasswordForTransport } from "@/lib/clientPassword";
import { DEFAULT_REGISTER_INTRO, type RegisterIntroTexts } from "@/lib/content/pageContent";

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
          /** 등기된 건물명. 없는 건물이 많아 빈 문자열로 온다. */
          buildingName?: string;
        }) => void;
        // open({ q }) 로 검색어를 미리 넣어 열 수 있다.
      }) => { open: (options?: { q?: string }) => void };
    };
  }
}

/** 법인명 검색 결과 한 건 — /api/address/places 응답. */
type PlaceHit = {
  name: string;
  roadAddress: string;
  jibunAddress: string;
  category: string;
};

const POSTCODE_LOAD_ERROR =
  "우편번호 찾기를 불러오지 못했습니다. 우편번호와 회사주소를 직접 입력해 주세요.";

/**
 * 법인명으로 주소 찾기 (2026-08-30).
 *
 * 우편번호 위젯은 도로명주소 DB 라 회사 이름이 없다 — 가입자는 자기 법인명을 치는 게
 * 당연한데 계속 "검색 결과 없음"으로 막혔다. 여기서는 장소 DB 로 회사 이름을 찾아
 * **도로명주소까지만** 얻고, 고르면 그 주소로 우편번호 위젯을 열어 우편번호를 확정한다.
 * 주소 한 벌을 두 출처에서 섞어 만들지 않으려는 것이다.
 *
 * 서버에 키가 없으면(503) 이 블록은 스스로 사라진다 — 쓸 수 없는 버튼을 두지 않는다.
 */
function PlaceSearch({
  defaultQuery,
  onPick,
}: {
  defaultQuery: string;
  onPick: (roadAddress: string) => void;
}) {
  const [q, setQ] = useState(defaultQuery);
  const [places, setPlaces] = useState<PlaceHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  async function run() {
    const query = q.trim();
    if (query.length < 2) {
      setMessage("두 글자 이상 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/address/places?q=${encodeURIComponent(query)}`);
      if (res.status === 503) {
        setAvailable(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "검색하지 못했습니다.");
        return;
      }
      setPlaces(data.places ?? []);
      if ((data.places ?? []).length === 0) {
        setMessage("검색 결과가 없습니다. 주소로 찾거나 직접 입력해 주세요.");
      }
    } catch {
      setMessage("검색하지 못했습니다. 주소로 찾거나 직접 입력해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <div className="mt-3" data-testid="place-search">
      <span className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // form 안이라 Enter 가 제출로 새어 나가면 안 된다.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          maxLength={60}
          placeholder="법인명으로 찾기 (예: 와이지엔터테인먼트)"
          className="min-w-0 flex-1 border border-border-soft bg-background px-3 py-2 text-s"
          data-testid="place-query"
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className={`${btnClass("secondary", "md")} whitespace-nowrap`}
          data-testid="place-search-go"
        >
          {busy ? "찾는 중…" : "법인명으로 찾기"}
        </button>
      </span>

      {places && places.length > 0 ? (
        <ul className="mt-2 max-h-56 divide-y divide-border/40 overflow-y-auto border border-border-soft">
          {places.map((p, i) => (
            <li key={`${p.name}-${i}`}>
              <button
                type="button"
                // 고른 주소로 우편번호 위젯을 연다 — 우편번호는 거기서 확정된다.
                onClick={() => onPick(p.roadAddress || p.jibunAddress)}
                className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-accent-soft/40"
              >
                <span className="block text-s font-bold">{p.name}</span>
                <span className="mt-0.5 block break-keep text-xs leading-5 text-muted">
                  {p.roadAddress || p.jibunAddress}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="mt-2 text-xs leading-6 text-muted">{message}</p> : null}
    </div>
  );
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
  companyType: ApplicantCompanyType | null;
  businessRegistrationNumber: string;
  representativeName: string;
  companyPhone: string;
  companyFax: string;
  corporateNumber: string;
  personalPhone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  businessCertUrl: string;
  businessCertName: string;
  employmentCertUrl: string;
  employmentCertName: string;
};

// 회원가입 중(비로그인)에도 쓸 수 있는 공개 업로드 엔드포인트 — 사업자등록증/재직증명서
// 둘 다 여기로 올린다(PDF/JPG/PNG, 10MB 이하).
async function uploadRegisterAttachment(file: File): Promise<{ url: string; name: string }> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/auth/register/attachment", { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "파일 업로드에 실패했습니다.");
  return { url: data.url, name: data.name };
}

const STEP_LABELS = ["회원 유형", "약관 동의", "본인인증", "정보 입력", "가입완료"];

/*
  초대 링크 가입 (2026-08-28) — 링크의 ?invite= 토큰을 그대로 서버에 넘긴다.

  화면은 일반 가입과 같다(약관·본인인증·정보 입력). 다른 점은 서버 쪽에 있다: 토큰이
  살아 있고 **본인인증한 번호가 초대장 번호와 같으면** 회사가 초대장으로 정해지고 심사
  없이 승인된다. 번호가 다르면 토큰은 무시되고 평범한 합류 신청이 된다.
*/
export function RegisterWizard({
  // 서버에서 읽은 편집 문구. 넘기지 않은 호출부는 기본값으로 돈다 — 문구 하나 때문에
  // 화면이 비지 않게 한다.
  intro = DEFAULT_REGISTER_INTRO,
}: {
  intro?: RegisterIntroTexts;
} = {}) {
  const toast = useToast();
  const dialog = useDialog();
  // 링크의 토큰. useSearchParams 는 Suspense 경계를 요구하므로 마운트 후 한 번만 읽는다.
  const [inviteToken, setInviteToken] = useState("");
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
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
    companyType: null,
    businessRegistrationNumber: "",
    representativeName: "",
    companyPhone: "",
    companyFax: "",
    corporateNumber: "",
    personalPhone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
    businessCertUrl: "",
    businessCertName: "",
    employmentCertUrl: "",
    employmentCertName: "",
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

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite") ?? "";
    if (!token) return;
    // 초대장이 회사를 정하므로 기업정보를 미리 채우고 잠근다 — 초대받은 사람이 회사의
    // 사업자등록번호·주소를 알고 있으리라 기대할 수 없다.
    void (async () => {
      try {
        const res = await fetch(`/api/company/invitations/preview?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data?.state !== "OK") {
          setInviteNotice(data?.message ?? "초대 링크를 확인할 수 없습니다. 일반 가입으로 진행해 주세요.");
          return;
        }
        const c = data.company;
        // 여기까지 왔으면 살아 있는 초대장이다 — 이제야 토큰을 들고 간다.
        setInviteToken(token);
        setPickedCompany({ id: c.id, name: c.name, businessNumberMasked: null, region: null });
        setBrnCheck({
          state: "REGISTERED",
          title: "초대받은 회사",
          message: `${c.name} — 초대로 합류합니다.`,
        });
        setForm((f) => ({
          ...f,
          companyName: c.name ?? "",
          companyType: (c.companyType ?? null) as ApplicantCompanyType | null,
          businessRegistrationNumber: c.businessRegistrationNumber ?? "",
          representativeName: c.representativeName ?? "",
          companyPhone: c.companyPhone ?? "",
          companyFax: c.companyFax ?? "",
          corporateNumber: c.corporateNumber ?? "",
          postalCode: c.postalCode ?? "",
          address: c.address ?? "",
          addressDetail: "",
          email: data.invitee?.email ?? f.email,
        }));
        setInviteNotice(
          `${c.name} 의 초대로 가입합니다. 초대장에 적힌 번호로 본인인증하시면 별도 승인 없이 바로 이용하실 수 있습니다.`,
        );
      } catch {
        setInviteNotice("초대 링크를 확인하지 못했습니다. 일반 가입으로 진행해 주세요.");
      }
    })();
  }, []);

  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [isNewMaster, setIsNewMaster] = useState(false);

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
    // 개발 우회일 때만: 알림톡을 실제로 받아 볼 번호를 물어본다(비우면 가짜 번호).
    // 운영에는 우회 버튼 자체가 없다(NICE_AUTH_DEV_STUB 없음).
    let stubPhone: string | undefined;
    if (options?.bypass) {
      const typed = await dialog.prompt(
        "개발용 우회 인증입니다.\n알림톡을 받아 볼 휴대폰 번호를 입력하세요(비우면 가짜 번호로 진행).",
        { title: "인증 없이 다음 (개발용)", placeholder: "010-0000-0000", required: false, okLabel: "진행" },
      );
      if (typed === null) return;
      stubPhone = typed.replace(/\D/g, "") || undefined;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/nice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "REGISTER", devBypass: options?.bypass === true, stubPhone }),
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

  // 다음(카카오) 우편번호 서비스. 원본은 행정안전부 도로명주소 DB라, 검색되는 건
  // 도로명 · 지번 · 등기된 건물명뿐이다 — 법인명으로는 찾을 수 없다("와이지엔터테인먼트"는
  // 그 건물 임차인 이름이지 건물명이 아니다). 아직 준공되지 않은 건물도 주소가 없어
  // 나오지 않는다. 그래서 검색이 실패하는 건 정상이고, 직접 입력 경로가 늘 열려 있어야 한다.
  //
  // initialQuery 를 주면 그 말로 검색창을 미리 채워 연다. 법인명 검색(아래)에서 고른
  // 도로명주소를 넘겨, 우편번호는 결국 이 위젯이 확정하게 하려는 것이다 — 주소 한 벌을
  // 두 출처에서 섞어 만들지 않는다.
  function openPostcode(initialQuery?: string) {
    const launch = () => {
      if (!window.daum) {
        setError(POSTCODE_LOAD_ERROR);
        return;
      }
      const widget = new window.daum.Postcode({
        oncomplete: (d) => {
          // 건물명을 버리지 않는다 — 회사 주소는 건물명으로 식별하는 경우가 많고,
          // 운영자가 심사할 때도 "○○빌딩"이 있어야 사업자등록증과 대조가 된다.
          const base = d.roadAddress || d.jibunAddress;
          const building = d.buildingName?.trim();
          setForm((f) => ({
            ...f,
            postalCode: d.zonecode,
            address: building ? `${base} (${building})` : base,
          }));
        },
      });
      const q = initialQuery?.trim();
      if (q) widget.open({ q });
      else widget.open();
    };
    if (window.daum) return launch();
    const s = document.createElement("script");
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.onload = launch;
    // 사내망 차단이나 CDN 장애로 스크립트를 못 받으면 예전에는 버튼을 눌러도 아무 일이
    // 일어나지 않았다. 조용히 죽는 대신 직접 입력하라고 알려준다.
    s.onerror = () => setError(POSTCODE_LOAD_ERROR);
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
        // "우편번호 찾기로"라고 적었더니 검색이 안 되는 주소에서 길이 막힌 것처럼 읽혔다.
        : { ok: false, message: "우편번호와 회사주소를 입력해 주세요. 검색되지 않으면 직접 입력하셔도 됩니다." },
      identity ? null : { ok: false, message: "휴대폰 본인인증을 먼저 진행해 주세요." },
      checkUsername(form.username),
      checkEmail(form.email),
      checkPassword(form.password),
      form.password === form.passwordConfirm
        ? null
        : { ok: false, message: "비밀번호가 일치하지 않습니다." },
      // [개정 2026-08-28] 두 서류를 필수로 바꿨다. 예전에는 선택이라 첨부 없이 접수된 건이
      // 그대로 심사로 넘어가, 운영자가 판단 근거 없이 되묻는 일이 반복됐다.
      // 초대로 들어오면 회사는 초대장이 정하고 등록증은 이미 회사에 있다 — 재직증명서만 받는다.
      inviteToken || form.businessCertUrl
        ? null
        : { ok: false, message: "사업자등록증을 첨부해 주세요." },
      form.employmentCertUrl
        ? null
        : { ok: false, message: "재직증명서를 첨부해 주세요." },
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
          companyType: form.companyType,
          businessRegistrationNumber: form.businessRegistrationNumber,
          representativeName: form.representativeName,
          companyPhone: form.companyPhone,
          companyFax: form.companyFax,
          corporateNumber: form.corporateNumber,
          postalCode: form.postalCode,
          address: [form.address, form.addressDetail].filter(Boolean).join(" "),
          inviteToken,
          businessCertUrl: form.businessCertUrl,
          businessCertName: form.businessCertName,
          employmentCertUrl: form.employmentCertUrl,
          employmentCertName: form.employmentCertName,
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
      // joinKind가 "NEW"(회사 신규 등록)일 때만 이 계정이 회사 마스터가 된다 — 합류
      // 신청(JOIN_*)은 항상 STAFF 로 시작하므로 companyRole 만 봐도 동치이지만, 의도를
      // 명시적으로 드러내기 위해 joinKind 도 같이 확인한다.
      setIsNewMaster(data.joinKind === "NEW" && data.user?.companyRole === "MASTER");
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
        <StepMemberType onNext={() => setStep(2)} intro={intro} />
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
          inviteNotice={inviteNotice}
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
            // 기업 정보를 통째로 비운다. 처음에는 값을 남겼는데, 사용자가 다른 사업자번호를
            // 입력해 진위확인을 하면 이전 회사의 상호·대표자·주소가 그대로 남아 새 번호와
            // 섞였다 — 그 상태로 제출되면 남의 회사 정보로 가입하는 셈이다.
            // [취소] 는 "직접 입력하겠다"는 뜻이므로 빈 종이에서 시작하는 것이 맞다.
            setPickedCompany(null);
            setBrnCheck(null);
            setForm((f) => ({
              ...f,
              companyName: "",
              companyType: null,
              businessRegistrationNumber: "",
              representativeName: "",
              companyPhone: "",
              companyFax: "",
              corporateNumber: "",
              postalCode: "",
              address: "",
              addressDetail: "",
              businessCertUrl: "",
              businessCertName: "",
            }));
          }}
          onOpenSearch={() => {
            // 불러온 회사가 잠겨 있는 상태에서 다시 열면, 그 회사 정보는 지우고 시작한다.
            // 잠금만 풀고 값을 남겼더니 창을 그냥 닫은 뒤 다른 번호로 진위확인을 하면
            // 이전 회사의 상호·대표자·주소가 새 번호와 섞였다.
            // 직접 타이핑한 내용(잠기지 않은 상태)은 건드리지 않는다.
            if (pickedCompany) {
              setPickedCompany(null);
              setBrnCheck(null);
              setForm((f) => ({
                ...f,
                companyName: "",
                businessRegistrationNumber: "",
                representativeName: "",
                companyPhone: "",
                companyFax: "",
                corporateNumber: "",
                postalCode: "",
                address: "",
                addressDetail: "",
              }));
            }
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
        <StepDone notice={joinNotice} isNewMaster={isNewMaster} companyName={form.companyName} />
      )}

      {searchOpen ? (
        <CompanySearchDialog
          onClose={() => setSearchOpen(false)}
          onPick={async (hit) => {
            setPickedCompany(hit);
            // 불러온 회사는 이미 확인된 번호다 — 중복확인·진위확인을 생략한다(기획서 A5).
            setBrnCheck({ state: "REGISTERED", title: "이미 등록된 회사입니다", message: "" });
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
                  companyType: (c.companyType ?? null) as ApplicantCompanyType | null,
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
              className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs tabular-nums ${
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

function StepMemberType({ onNext, intro }: { onNext: () => void; intro: RegisterIntroTexts }) {
  return (
    <section className="mt-10" data-testid="step-member-type">
      <h2 className="type-kr-heading break-keep text-h6-m sm:text-h6">{intro.heading}</h2>

      {/* [개정 2026-08-30] 개인회원 카드를 뺐다. 예전에는 "나중에 열린다"는 사실을 첫 화면에서
          알리려고 비활성 카드를 남겨 뒀는데(기획서 A2), 고를 수 없는 선택지를 나란히 두면
          유형을 고르는 화면처럼 보인다. 고를 것이 하나뿐이므로 한 장으로 세운다.
          폭은 좁히지 않는다 — AuthShell width="lg" 안에서 카드만 좁히면 오른쪽이 비어
          다른 스텝(약관·정보 입력)과 어긋나 보인다. */}
      <div className="mt-6">
        <button
          type="button"
          data-testid="pick-corporate"
          onClick={onNext}
          /* 안내 카드 겸 진입 버튼 — kit 의 choiceClass 와 같은 패딩(20)을 쓴다.
             flex-col 은 CTA 를 본문 아래로 떨어뜨리려는 것이다(카드가 하나뿐이라
             예전처럼 두 장의 높이를 맞출 일은 없어 h-full 은 뺐다). */
          className="flex w-full flex-col border border-foreground p-5 text-left transition-colors hover:bg-surface"
        >
          <span className="flex-1">
            <span className="block text-xs font-bold text-foreground">{intro.badge}</span>
            <span className="mt-2 block text-h6-m font-bold">{intro.title}</span>
            <span className="mt-1.5 block break-keep text-s leading-6 text-muted">
              {intro.subtitle}
            </span>
            {/* [개정 2026-08-30] 예전 문구는 회사의 첫 가입자 경로만 설명했고, "진위확인으로
                즉시 심사" 는 사실과도 달랐다 — 진위확인은 휴·폐업을 거르는 것이지 승인이
                아니고, 접수된 계정은 승인 대기로 남는다. 한 회사에서 여러 담당자가 들어오는
                구조이므로 첫 가입자와 이후 담당자를 나눠 적는다. */}
            {/* 카드가 button 이라 안에 ul/li 를 넣을 수 없다(button 은 phrasing content 만 받는다).
                span 을 flex 로 세워 글머리표와 본문을 나눈다 — "· 텍스트" 를 한 덩어리로 두면
                두 번째 줄이 글머리표 아래로 파고들어 들여쓰기가 어긋난다. */}
            <span className="mt-4 flex max-w-2xl flex-col gap-2 break-keep text-s leading-6 text-muted">
              {intro.bullets.map((line, i) => (
                <span key={i} className="flex gap-2">
                  <span aria-hidden className="shrink-0">
                    ·
                  </span>
                  <span>{line}</span>
                </span>
              ))}
            </span>
          </span>
          {/* 카드가 넓어져 w-full 버튼은 검은 띠처럼 보인다. 좁은 화면에서만 꽉 채우고
              그 위로는 글줄 시작점에 맞춰 제 폭으로 세운다. */}
          <span
            className={`${btnClass("primary", "md")} mt-7 w-full justify-center text-center sm:w-auto sm:self-start sm:px-10`}
          >
            {intro.cta}
          </span>
        </button>

      </div>

      {/* 개인회원 카드를 뺀 대신 한 줄로만 남긴다 — 사업자등록증이 없는 사람이 여기서
          헤매지 않도록, 지금은 받지 않는다는 사실은 계속 알려야 한다. */}
      <p className="mt-5 break-keep text-s leading-6 text-muted">{intro.individualNote}</p>

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
              {/* 약관 버전(t.version)은 화면에 내보이지 않는다 — 동의 이력을 특정하려고
                  들고 있는 내부 값이라, 사용자에게는 읽을 이유가 없는 기호다.
                  제출할 때는 그대로 실어 보낸다(위 submit 페이로드). */}
              <input
                type="checkbox"
                data-testid={`agree-${t.kind}`}
                checked={!!agreed[t.kind]}
                onChange={(e) =>
                  setAgreed((p) => ({ ...p, [t.kind]: e.target.checked }))
                }
                className="h-4 w-4"
              />
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
  inviteNotice,
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
  /** q 를 주면 우편번호 위젯을 그 검색어로 미리 채워 연다(법인명 검색에서 고른 주소). */
  onPostcode: (q?: string) => void;
  loading: boolean;
  onPrev: () => void;
  onSubmit: () => void;
  /** 초대 링크로 열었을 때의 안내(회사·승인 생략 조건). 일반 가입이면 null. */
  inviteNotice: string | null;
}) {
  const toast = useToast();
  const [checking, setChecking] = useState<"brn" | "id" | null>(null);
  const [uploading, setUploading] = useState<"biz" | "employment" | null>(null);
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  const locked = !!pickedCompany;

  async function handleCertUpload(
    kind: "biz" | "employment",
    urlKey: keyof FormState,
    nameKey: keyof FormState,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(kind);
    try {
      const { url, name } = await uploadRegisterAttachment(file);
      setForm((p) => ({ ...p, [urlKey]: url, [nameKey]: name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(null);
    }
  }

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
          companyType: (c.companyType ?? null) as ApplicantCompanyType | null,
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
          등록된 회사정보 불러오기
        </button>
      </div>
      {inviteNotice ? (
        <p
          data-testid="invite-notice"
          className="mt-3 border border-accent px-4 py-3 text-s leading-6 break-keep"
        >
          {inviteNotice}
        </p>
      ) : null}
      <p className="mt-2 break-keep text-xs text-muted">* 표시는 필수 입력 항목입니다.</p>

      <h3 className="mt-8 text-s font-bold">① 기업 정보</h3>
      {locked ? null : (
        <p className="mt-1 break-keep text-xs leading-6 text-muted">
          이미 등록된 회사라면 [등록된 회사정보 불러오기]로 채우세요.
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
              {/* 합류 신청처럼 덧붙일 말이 없는 상태는 message 가 빈 문자열이다 —
                  빈 span 이 앞 여백만 남기지 않도록 아예 그리지 않는다. */}
              {brnCheck.message ? <span className="ml-2 text-muted">{brnCheck.message}</span> : null}
              {brnCheck.state === "VERIFIED" || brnCheck.state === "UNCHECKED" ? (
                <p className="mt-1 text-muted">
                  회사명 · 대표자 성명은 국세청 등록 정보로 채워집니다. 주소 · 대표번호는 직접
                  입력해 주세요.
                </p>
              ) : null}
              {brnCheck.state === "REGISTERED" ? (
                <p className="mt-1 text-muted">
                  회사 정보가 확인되었습니다. 개인 정보를 입력하면 해당 기업의 구성원으로
                  가입을 신청할 수 있습니다.
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

        {/* 신청 기업 유형은 회사를 새로 등록하는 사람(대표 담당자)만 정한다 — 이미 등록된
            회사로 합류하는 사람은 그 회사의 값을 그대로 물려받을 뿐 바꿀 수 없다. */}
        {!locked && (
          <div className="sm:col-span-2">
            <span className="mb-2 block break-keep text-xs leading-5 font-bold">신청 기업 유형</span>
            <div className="flex flex-wrap gap-2">
              {APPLICANT_COMPANY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  data-testid={`f-companyType-${type}`}
                  onClick={() => setForm((f) => ({ ...f, companyType: f.companyType === type ? null : type }))}
                  className={toggleClass(form.companyType === type)}
                >
                  {APPLICANT_COMPANY_TYPE_LABEL[type]}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* [개정 2026-08-27] 기존 회사를 불러온 뒤에도(locked) 사업자등록증 첨부를 남겨 둔다.
            예전에는 통째로 숨겨서 합류 가입자는 낼 방법이 없었다. 회사 행에 저장된 등록증은
            회사를 처음 등록한 사람의 것 하나뿐이라, 합류자가 올린 파일은 그 사람 계정에
            따로 남아 운영자 심사 화면에 보인다. */}
        <div className="sm:col-span-2">
            <Field
              label="사업자등록증"
              required
              hint={
                locked
                  ? "필수 · PDF/JPG/PNG · 10MB 이하 · 불러온 회사에 등록된 서류가 있어도 본인 확인용으로 첨부해 주세요"
                  : "필수 · PDF/JPG/PNG · 10MB 이하"
              }
            >
              <span className="flex flex-wrap items-center gap-3">
                <label className={`${btnClass("secondary", "md")} cursor-pointer whitespace-nowrap`}>
                  {uploading === "biz" ? "업로드 중…" : "파일 선택"}
                  <input
                    type="file"
                    data-testid="f-businessCert"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading === "biz"}
                    onChange={(e) => handleCertUpload("biz", "businessCertUrl", "businessCertName", e)}
                    className="hidden"
                  />
                </label>
                {form.businessCertName ? (
                  <span data-testid="business-cert-name" className="break-all text-s text-muted">
                    {form.businessCertName}
                  </span>
                ) : null}
              </span>
            </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="회사주소" required>
            <span className="flex flex-wrap gap-2">
              <input data-testid="f-postalCode" readOnly={locked} value={form.postalCode} onChange={set("postalCode")} placeholder="우편번호" className={inputCls(locked, "w-36")} />
              <button type="button" data-testid="open-postcode" disabled={locked} onClick={() => onPostcode()} className={`${btnClass("secondary", "md")} whitespace-nowrap`}>
                우편번호 찾기
              </button>
            </span>
          </Field>
          {/* [개정 2026-08-29] 이미 등록된 회사에는 상세주소 칸을 두지 않는다.
              회사주소는 최초 등록 때 상세주소까지 합쳐 저장되고(제출 시 address +
              addressDetail 를 이어 붙인다), 합류 가입에서는 서버가 기존 회사 값을
              그대로 유지한다(findOrCreateCompany). 그래서 여기서 더 받아 봐야 조용히
              버려진다 — 빈 칸을 열어 두는 것보다 아예 안 보이는 게 낫다. */}
          {locked ? (
            <div className="mt-2">
              <input data-testid="f-address" readOnly value={form.address} placeholder="회사주소" className={inputCls(true)} />
              <p className="mt-2 break-keep text-xs leading-6 text-muted">
                등록된 회사 주소입니다. 바꾸려면 대표 담당자가 가입 후 [회사 정보 수정]에서
                변경해 주세요.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <input data-testid="f-address" value={form.address} onChange={set("address")} placeholder="회사주소" className={inputCls(false)} />
                <input data-testid="f-addressDetail" value={form.addressDetail} onChange={set("addressDetail")} placeholder="상세주소 (동 · 층 · 호)" className={inputCls(false)} />
              </div>
              <PlaceSearch defaultQuery={form.companyName} onPick={(road) => onPostcode(road)} />
              {/* 회사명으로 검색해 놓고 "주소가 없다"고 막히는 일이 잦았다. 무엇으로 찾는
                  검색인지, 못 찾으면 어떻게 하는지를 검색창 옆이 아니라 여기서 알려 준다. */}
              <p className="mt-2 break-keep text-xs leading-6 text-muted">
                <b>우편번호 찾기</b>는 도로명 · 지번 · <b>건물명</b>으로 찾습니다.{" "}
                <b>법인명으로 찾기</b>는 회사 이름으로 찾습니다 — 장소 정보에 등록된 이름을
                따르므로, 법인명 그대로 안 나오면 &ldquo;주식회사&rdquo;를 빼거나 줄여서 다시
                찾아 보세요. 아직 주소가 부여되지 않은 신축 건물처럼 어느 쪽으로도 나오지 않으면
                우편번호와 회사주소를 직접 입력해 주세요.
              </p>
            </>
          )}
        </div>
      </div>

      {/* 기업 정보와 개인 정보 사이를 선으로 끊는다 — 칸이 계속 이어져 어디까지가 회사
          이야기인지 한눈에 안 잡혔다. 구분선은 관리자 폼과 같은 border/15 를 쓴다. */}
      <h3 className="mt-10 border-t border-border/15 pt-8 text-s font-bold">② 개인 정보</h3>
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
                  // 한글 IME 입력을 걸러 영문·숫자만 받는다
                  setForm((f) => ({ ...f, username: sanitizeUsernameInput(e.target.value) }));
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
              onChange={(e) => setForm((f) => ({ ...f, password: sanitizePasswordInput(e.target.value) }))}
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
              onChange={(e) => setForm((f) => ({ ...f, passwordConfirm: sanitizePasswordInput(e.target.value) }))}
              className={`${inputCls(false)} pr-9`}
            />
            <InputCheckMark show={form.passwordConfirm.length > 0 && form.password === form.passwordConfirm} />
          </div>
          <PasswordMatchHint password={form.password} confirm={form.passwordConfirm} />
        </Field>
        <Field label="전화번호">
          <input data-testid="f-personalPhone" value={form.personalPhone} onChange={set("personalPhone")} placeholder="02-544-1651" className={inputCls(false)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="재직증명서" required hint="필수 · PDF/JPG/PNG · 10MB 이하">
            <span className="flex flex-wrap items-center gap-3">
              <label className={`${btnClass("secondary", "md")} cursor-pointer whitespace-nowrap`}>
                {uploading === "employment" ? "업로드 중…" : "파일 선택"}
                <input
                  type="file"
                  data-testid="f-employmentCert"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={uploading === "employment"}
                  onChange={(e) => handleCertUpload("employment", "employmentCertUrl", "employmentCertName", e)}
                  className="hidden"
                />
              </label>
              {form.employmentCertName ? (
                <span data-testid="employment-cert-name" className="break-all text-s text-muted">
                  {form.employmentCertName}
                </span>
              ) : null}
            </span>
          </Field>
        </div>
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

function StepDone({
  notice,
  isNewMaster,
  companyName,
}: {
  notice: string | null;
  isNewMaster: boolean;
  companyName: string;
}) {
  return (
    <section className="mt-12 text-center" data-testid="step-done">
      <h2 className="type-kr-heading break-keep text-h5-m sm:text-h5">가입 신청이 접수되었습니다</h2>
      <p className="mt-3 break-keep text-s leading-6 text-muted">승인 완료 후 이용 가능합니다.</p>
      {notice ? (
        <p data-testid="join-notice" className="mx-auto mt-5 max-w-lg break-keep border border-border-soft px-5 py-4 text-s leading-6">
          {notice}
        </p>
      ) : null}
      {isNewMaster ? (
        <p
          data-testid="master-account-notice"
          className="mx-auto mt-5 max-w-lg break-keep border border-accent px-5 py-4 text-s leading-6"
        >
          {companyName || "회사"}의 <b>마스터 계정</b>으로 가입되었습니다. 승인 후 마이메뉴 &gt; 담당자
          관리에서 소속 담당자를 초대하고, 합류 신청을 승인·반려하거나 대표 권한을 이관할 수 있습니다.
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
      aria-label="등록된 회사정보 불러오기"
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
          <h3 className="text-h5-m font-bold sm:text-h5">등록된 회사정보 불러오기</h3>
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
