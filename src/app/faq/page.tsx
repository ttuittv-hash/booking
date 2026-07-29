import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listFaqs } from "@/lib/db";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "FAQ | 서울아레나",
};

export default async function FaqPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const faqs = listFaqs();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/faq" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">FAQ</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">자주 묻는 질문</h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          대관 신청, 심사, 계약, 정산 등 대관 절차 전반에 대해 자주 문의주시는 내용을 안내해
          드립니다. 찾으시는 답변이 없다면 운영자에게 직접 문의해주세요.
        </p>

        {faqs.length === 0 ? (
          <p className="mt-10 border-t border-border py-8 text-[13.5px] text-muted">
            등록된 FAQ가 없습니다.
          </p>
        ) : (
          <FaqAccordion faqs={faqs} />
        )}
      </main>
    </div>
  );
}
