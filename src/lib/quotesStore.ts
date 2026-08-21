import type { QuoteSelection } from "./pricing/types";

/*
  위저드 입력값 스키마가 바뀔 때마다 키를 올린다.

  옛 모양의 임시저장본이 복원되면 새로 생긴 중첩 필드(공연 기본정보의 배열들,
  안전관리 서약서 등)가 undefined 인 채로 화면에 들어가 렌더 중에 터진다.
  키를 올리면 헌 초안은 그냥 무시된다 — 절반만 맞는 값을 복원하는 것보다 낫다.
  (v2: 위저드 4단계 개편 · 동시 대관 · 안전관리 서약서)
*/
const DRAFT_KEY = "seoularena.wizard-draft.v2";
/** 예전 키들 — 남아 있으면 지운다 */
const LEGACY_KEYS = ["seoularena.wizard-draft.v1"];

interface WizardDraft {
  step: number;
  selection: QuoteSelection;
}

/**
 * 로그인 리다이렉트 등으로 페이지를 벗어나도 작성 중인 견적 입력값을 잃지 않도록
 * 브라우저에 임시 저장한다. 제출된 신청서는 서버(DB)에 저장되며 여기 저장하지 않는다.
 */
export function saveWizardDraft(draft: WizardDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadWizardDraft(): WizardDraft | null {
  if (typeof window === "undefined") return null;
  for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraft;
    // 최소한의 모양 검사 — 깨진 값이면 없는 것으로 본다.
    if (!parsed || typeof parsed !== "object" || typeof parsed.selection !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWizardDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
  for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
}
