import type { QuoteSelection } from "./pricing/types";

const DRAFT_KEY = "seoularena.wizard-draft.v1";

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
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardDraft) : null;
  } catch {
    return null;
  }
}

export function clearWizardDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}
