import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  findCompanyById,
  findUserById,
  getLatestTermsAgreement,
  getQuoteById,
  listAttachments,
} from "@/lib/db";
import { generateQuoteAiReview, isAiReviewConfigured } from "@/lib/aiReview";
import { totalRentalDays } from "@/lib/pricing/rateTableUtils";
import { DEFAULT_VENUE_ID, VENUES } from "@/lib/pricing/types";
import { buildVerificationBadges, overallVerdict } from "@/lib/verificationBadges";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
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

  const result = await generateQuoteAiReview({
    total: quote.total,
    subtotal: quote.subtotal,
    vat: quote.vat,
    venueLabel,
    expectedAudience: quote.selection.expectedAudience,
    rentalDays: totalRentalDays(quote.selection),
    verdict: overallVerdict(badges),
    badges: badges.map((b) => ({ label: b.label, state: b.state, detail: b.detail })),
    publicInterestFileCount: attachments.length,
    marketingConsent: marketing?.agreed ?? null,
  });

  return NextResponse.json(result);
}
