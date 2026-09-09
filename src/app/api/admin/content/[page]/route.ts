import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getDocumentsContent,
  getFeaturesContent,
  getGuidePageContent,
  getRatesContent,
  getMemberPolicy,
  getRegisterTermsContent,
  getRulesContent,
  getScreenTextContent,
  getSeoulArenaContent,
  saveDocumentsContent,
  saveFeaturesContent,
  saveGuidePageContent,
  saveRatesContent,
  saveMemberPolicy,
  saveRegisterTermsContent,
  saveRulesContent,
  saveScreenTextContent,
  saveSeoulArenaContent,
} from "@/lib/db";

/* ============================================================================
   페이지 콘텐츠 저장 — 페이지 키 하나로 모든 화면을 다룬다.
   화면마다 라우트를 따로 만들면 스키마가 늘 때마다 파일이 늘어난다.
   ========================================================================= */

type Loader = {
  get: () => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  save: (data: any) => Promise<unknown>;
};

const PAGES: Record<string, Loader> = {
  seoularena: { get: getSeoulArenaContent, save: saveSeoulArenaContent },
  features: { get: getFeaturesContent, save: saveFeaturesContent },
  guide: { get: getGuidePageContent, save: saveGuidePageContent },
  rates: { get: getRatesContent, save: saveRatesContent },
  documents: { get: getDocumentsContent, save: saveDocumentsContent },
  rules: { get: getRulesContent, save: saveRulesContent },
  screenText: { get: getScreenTextContent, save: saveScreenTextContent },
  // 가입 화면의 동의 항목 3종. 저장할 때 본문이 바뀌면 버전이 자동으로 올라간다.
  registerTerms: { get: getRegisterTermsContent, save: saveRegisterTermsContent },
  // 초대 가입도 운영자 승인을 받게 할지 — 회원 관리 화면의 스위치가 쓴다.
  memberPolicy: { get: getMemberPolicy, save: saveMemberPolicy },
};

export async function GET(_request: Request, ctx: { params: Promise<{ page: string }> }) {
  // [보안 2026-09-04] 콘텐츠 원본 GET 도 운영자 전용 — 승인 전용 페이지(규약·요금 등)가 여기로 새어 나갔다.
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  const { page } = await ctx.params;
  const loader = PAGES[page];
  if (!loader) return NextResponse.json({ error: "알 수 없는 페이지입니다." }, { status: 404 });
  return NextResponse.json({ content: await loader.get() });
}

export async function PUT(request: Request, ctx: { params: Promise<{ page: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { page } = await ctx.params;
  const loader = PAGES[page];
  if (!loader) return NextResponse.json({ error: "알 수 없는 페이지입니다." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const content = body?.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  return NextResponse.json({ content: await loader.save(content) });
}
