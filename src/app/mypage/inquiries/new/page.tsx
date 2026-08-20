import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { MyPageSidebar } from "@/components/MyPageSidebar";
import { NewInquiryForm } from "@/components/NewInquiryForm";

export const metadata: Metadata = {
  title: "문의하기 | 서울아레나",
};

export default async function NewInquiryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <MyPageSidebar active="/mypage/inquiries" />

          <div className="min-w-0 max-w-2xl flex-1">
            <h1 className="text-[22px] font-semibold">문의하기</h1>
            <NewInquiryForm />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
