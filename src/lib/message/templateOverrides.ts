// 환경별 카카오 템플릿 코드·버튼 링크 덮어쓰기 (2026-08-28).
//
// 카카오 템플릿의 버튼 링크는 등록값에 고정돼 있어 dev 와 운영이 같은 코드를 쓰면 dev 알림톡도
// 운영 주소로 간다. 수정하면 재검수 동안 발송이 막히므로, dev 링크를 단 **신규** 템플릿을 따로
// 등록하고(코드 예: MB-02-DEV) 승인되면 환경변수로만 갈아탄다 — 코드 배포 없이, 기존 템플릿은 그대로.
//
//   BIZTALK_TEMPLATE_OVERRIDES = "MB-02=MB-02-DEV,MB-03=MB-03-DEV,…"   (우리 코드 = 카카오 코드)
//   BIZTALK_BUTTON_URL         = "https://partner.dev.seoularena.net/"  (그 템플릿에 등록된 버튼 링크)
// 둘은 함께 맞춰야 한다 — 버튼 링크가 등록값과 다르면 카카오가 3027 로 거절한다.

export function parseTemplateOverrides(raw = process.env.BIZTALK_TEMPLATE_OVERRIDES): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of (raw ?? "").split(",")) {
    const [from, to] = pair.split("=").map((s) => s.trim());
    if (from && to) map[from] = to;
  }
  return map;
}

/** 우리 템플릿 코드에 대해 실제로 보낼 카카오 코드. 덮어쓰기가 없으면 정의값 그대로. */
export function resolveKakaoTemplateCode(ourCode: string, defaultCode: string | null | undefined): string | null {
  return parseTemplateOverrides()[ourCode] ?? defaultCode ?? null;
}

/** 버튼 링크 — 환경변수가 있으면 그것(등록값과 같아야 한다), 없으면 정의값. */
export function resolveKakaoButtonUrl(defaultUrl: string | null | undefined): string | null {
  const env = process.env.BIZTALK_BUTTON_URL?.trim();
  return env || defaultUrl || null;
}
