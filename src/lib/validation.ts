// 입력 규칙 — 화면과 서버가 같은 정의를 쓴다.
//
// 규칙이 여러 곳에 흩어지면 조용히 어긋난다. 실제로 그랬다:
//   중복확인 API  /^[a-zA-Z0-9]{5,20}$/     (5~20자, 대문자 허용)
//   가입 API      /^[a-z0-9][a-z0-9_]{3,19}$/ (4~20자, 소문자만, _ 허용)
// 중복확인은 통과하는데 가입에서 거부되는 조합이 생긴다.
//
// 비밀번호는 사정이 다르다. 클라이언트가 SHA-256 해시로 보내므로 서버는 원문을 못 본다 —
// 규칙 검사는 해시를 만들기 전, 화면에서만 가능하다. 그래서 규칙을 여기 두고
// 화면이 반드시 통과시킨 뒤 해시하도록 한다.

/** 로그인 ID — 5~20자 영문·숫자 (기획서 1-32). */
export const USERNAME_RE = /^[a-zA-Z0-9]{5,20}$/;
export const USERNAME_HINT = "5~20자의 영문·숫자 조합";

/**
 * 비밀번호 — 8~20자, 영문 대소문자·숫자·특수문자 조합 (기획서 1-33).
 * 기획서 안에서 가입 8~20자 / 변경 8~15자로 어긋나 있어 넓은 쪽(8~20)으로 통일한다.
 * 확정되면 이 상수만 고치면 화면·API 전부 따라온다.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 20;
export const PASSWORD_HINT = "8~20자 · 영문 대문자·소문자·숫자·특수문자를 모두 포함";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CheckResult {
  ok: boolean;
  message?: string;
}

export function checkUsername(value: string): CheckResult {
  const v = value.trim();
  if (!v) return { ok: false, message: "아이디를 입력해 주세요." };
  if (!USERNAME_RE.test(v)) return { ok: false, message: `아이디는 ${USERNAME_HINT}이어야 합니다.` };
  return { ok: true };
}

export function checkPassword(value: string): CheckResult {
  if (!value) return { ok: false, message: "비밀번호를 입력해 주세요." };
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    return { ok: false, message: `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.` };
  }
  const missing: string[] = [];
  if (!/[A-Z]/.test(value)) missing.push("대문자");
  if (!/[a-z]/.test(value)) missing.push("소문자");
  if (!/[0-9]/.test(value)) missing.push("숫자");
  if (!/[^A-Za-z0-9]/.test(value)) missing.push("특수문자");
  if (missing.length > 0) {
    return { ok: false, message: `비밀번호에 ${missing.join(" · ")}를 포함해 주세요.` };
  }
  return { ok: true };
}

export function checkEmail(value: string): CheckResult {
  const v = value.trim();
  if (!v) return { ok: false, message: "이메일을 입력해 주세요." };
  if (!EMAIL_RE.test(v)) return { ok: false, message: "올바른 이메일 형식이 아닙니다." };
  return { ok: true };
}

/** 사업자등록번호 — 숫자 10자리. */
export function checkBusinessNumber(value: string): CheckResult {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { ok: false, message: "사업자등록번호를 입력해 주세요." };
  if (digits.length !== 10) {
    return { ok: false, message: "사업자등록번호는 숫자 10자리입니다." };
  }
  return { ok: true };
}

/** 여러 검사를 순서대로 돌려 첫 실패를 돌려준다 — 사용자에게 한 번에 하나만 알린다. */
export function firstFailure(...results: (CheckResult | false | null | undefined)[]): string | null {
  for (const r of results) {
    if (r && !r.ok) return r.message ?? "입력값을 확인해 주세요.";
  }
  return null;
}

/*
  아이디·비밀번호 칸은 입력 단계에서 영문 자판만 받는다.

  한글 IME 가 켜진 채 아이디를 치면 "ㅎㅎㄴ" 같은 값이 들어가고, 제출에서야
  "영문·숫자만" 오류를 만난다. 브라우저는 IME 를 강제로 끌 방법을 주지 않으므로,
  입력되는 순간 규칙 밖 문자를 걸러내는 것이 할 수 있는 전부다 — 한글을 치면
  아무것도 입력되지 않고, 자판을 영문으로 바꾸면 그대로 들어간다.
*/

/** 아이디 칸용 — 영문·숫자만 남긴다. */
export function sanitizeUsernameInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

/** 비밀번호 칸용 — 인쇄 가능한 ASCII(영문·숫자·특수문자)만 남긴다. 공백도 제외. */
export function sanitizePasswordInput(value: string): string {
  return value.replace(/[^\x21-\x7E]/g, "");
}
