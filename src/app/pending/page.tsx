import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "가입 승인 대기 | 서울아레나",
};

const NOTICE: Record<"PENDING" | "REJECTED", { title: string; desc: string }> = {
  PENDING: {
    title: "가입 승인 대기 중입니다",
    desc: "일반인은 자유 가입할 수 없으며, 운영자 승인이 완료되어야 대관 패키지 안내와 견적 산출·신청을 이용하실 수 있습니다. 승인 결과는 알림으로 안내해 드립니다.",
  },
  REJECTED: {
    title: "가입이 승인되지 않았습니다",
    desc: "자세한 사항은 운영자에게 문의해주세요.",
  },
};

export default async function PendingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "APPLICANT" || currentUser.approvalStatus === "APPROVED") redirect("/apply");

  const notice = NOTICE[currentUser.approvalStatus];

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="" currentUser={currentUser} />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-24 text-center">
        <h1 className="text-[20px] font-semibold">{notice.title}</h1>
        <p className="mt-3 text-[13.5px] leading-6 text-muted">{notice.desc}</p>
      </main>

      <PublicFooter />
    </div>
  );
}
