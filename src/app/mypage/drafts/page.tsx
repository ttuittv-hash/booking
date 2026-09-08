import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { MyPageIdentity, MyPageShell } from "@/components/mypage/MyPageShell";
import { WizardDraftSummary } from "@/components/mypage/WizardDraftSummary";

export const metadata: Metadata = {
  title: "임시 저장 내역",
};

export default async function MyPageDraftsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  if (isPendingApplicant(user)) redirect("/pending");

  return (
    <MyPageShell
      user={user}
      active="/mypage/drafts"
      en="SAVED DRAFT"
      ko="임시 저장 내역"
      lead={<MyPageIdentity user={user} />}
    >
      <WizardDraftSummary />
    </MyPageShell>
  );
}
