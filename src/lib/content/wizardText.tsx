"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * [2026-08-25] "모든 텍스트 수정 가능" — 위저드 스텝 제목·리드(WizardStepTexts, 이미
 * 전용 폼이 있음) 밖의 나머지 문구를 전부 관리자가 고칠 수 있게 하는 메커니즘.
 *
 * 스텝 컴포넌트마다 필드를 하나하나 새로 선언하지 않고, key → fallback 한 쌍을 그
 * 자리에서 바로 쓴다:
 *
 *   const { t } = useWizardText();
 *   <span>{t("safetyPledge.items.staffSafetyTraining", "출연자 및 스태프 등...")}</span>
 *
 * 실제 위저드(WizardTextProvider)에서는 overrides[key] ?? fallback을 반환한다 —
 * 그래서 overrides가 항상 빈 객체({})로 시작해도 화면은 원래 문구 그대로 나온다.
 * 관리자 미리보기(WizardTextPreview)에서는 같은 key로 "그 자리에 편집 입력"을 렌더하는
 * 별도 Provider를 쓴다 — 컴포넌트 소스는 이 훅 하나만 알면 되고, 편집 가능 여부는
 * 어느 Provider 아래 있는지로 결정된다.
 *
 * t()는 화면에 보이는 실제 텍스트 노드용(ReactNode 반환 — 미리보기에서 입력으로
 * 바뀌어도 무방한 자리). placeholder/aria-label처럼 DOM이 string만 받는 속성값은
 * tStr()을 쓴다(항상 plain string).
 */
export type WizardTextOverrides = Record<string, string>;

export interface WizardTextApi {
  t: (key: string, fallback: string) => ReactNode;
  tStr: (key: string, fallback: string) => string;
}

const PASSTHROUGH_API: WizardTextApi = {
  t: (_key, fallback) => fallback,
  tStr: (_key, fallback) => fallback,
};

export const WizardTextContext = createContext<WizardTextApi>(PASSTHROUGH_API);

export function useWizardText(): WizardTextApi {
  return useContext(WizardTextContext);
}

/** 실제 위저드(/apply)에서 쓰는 Provider — overrides에 없는 key는 fallback을 그대로 보여준다. */
export function WizardTextProvider({
  overrides,
  children,
}: {
  overrides: WizardTextOverrides;
  children: ReactNode;
}) {
  const api: WizardTextApi = {
    t: (key, fallback) => overrides[key] ?? fallback,
    tStr: (key, fallback) => overrides[key] ?? fallback,
  };
  return <WizardTextContext.Provider value={api}>{children}</WizardTextContext.Provider>;
}
