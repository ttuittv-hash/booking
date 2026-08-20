import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "이용약관 | 서울아레나",
};

export default async function TermsPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/terms" currentUser={currentUser} />
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "이용약관" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading title="이용약관" lead="시행일 2026년 8월 1일" />
        </Band>

        <Band tone="white" size="md">
          {/* 본문은 가입 시 동의하는 문서와 같은 것을 쓴다 — src/lib/terms.ts */}
          <LegalDocument kind="SERVICE" />
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
