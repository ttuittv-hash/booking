import { NextResponse } from "next/server";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import {
  findCompanyById,
  findUserById,
  getLatestTermsAgreement,
  getQuoteById,
  getReviewCriteriaDoc,
  listAttachments,
} from "@/lib/db";
import { generateQuoteAiReview, isAiReviewConfigured } from "@/lib/aiReview";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { rowAudience } from "@/lib/quoteAudience";
import { DEFAULT_VENUE_ID, VENUES } from "@/lib/pricing/types";
import { buildVerificationBadges, overallVerdict } from "@/lib/verificationBadges";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isProAdminOrAbove(user)) {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  if (!isAiReviewConfigured()) {
    return NextResponse.json({ status: "UNCONFIGURED" });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  const applicant = await findUserById(quote.applicantId);
  const company = applicant?.companyId ? await findCompanyById(applicant.companyId) : null;
  const attachments = await listAttachments(id, null);
  const marketing = applicant ? await getLatestTermsAgreement(applicant.id, "PRIVACY_OPTIONAL") : null;
  const criteriaDoc = await getReviewCriteriaDoc();

  // 목록·상세 화면과 같은 판정 로직을 쓴다(verificationBadges.ts) — 중복 가입 여부는
  // 이 화면에서 계산하지 않으므로 회원 상세 화면과 같은 관례대로 false로 둔다.
  const badges = applicant
    ? buildVerificationBadges({ user: applicant, company: company ?? null, duplicated: false })
    : [];

  const venueLabel =
    quote.selection.venueId === "medium-hall"
      ? "중형공연장"
      : quote.selection.bookingMode === "SIMULTANEOUS"
        ? "동시 대관(아레나+중형공연장)"
        : (VENUES.find((v) => v.id === (quote.selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "아레나");

  const result = await generateQuoteAiReview(
    {
      total: quote.total,
      subtotal: quote.subtotal,
      vat: quote.vat,
      venueLabel,
      // [수정 2026-09-18] 바로 위 venueLabel 은 공간을 구분하는데 이 줄만 안 했다 —
      // 중형 단독 신청이 AI 요약에 「중형공연장 / 0명」으로 들어가고 있었다.
      expectedAudience: rowAudience(quote.selection).main,
      rentalDays: totalRentalDays(quote.selection),
      verdict: overallVerdict(badges),
      badges: badges.map((b) => ({ label: b.label, state: b.state, detail: b.detail })),
      publicInterestFileCount: attachments.length,
      marketingConsent: marketing?.agreed ?? null,
    },
    criteriaDoc ? { fileName: criteriaDoc.fileName, mimeType: criteriaDoc.mimeType, filePath: criteriaDoc.filePath } : null,
  );

  return NextResponse.json(result);
}
