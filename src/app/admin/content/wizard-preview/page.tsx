import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScreenTextContent } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { WizardTextPreview } from "@/components/admin/WizardTextPreview";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function WizardTextPreviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const screenTextContent = await getScreenTextContent();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/content" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <Link href="/admin/content?tab=screenText" className="text-xs font-bold text-muted hover:text-foreground">
            ← 화면 문구
          </Link>
          <h1 className={`mt-2 ${PAGE_TITLE}`}>위저드 문구 미리보기 · 수정</h1>
          <p className={PAGE_LEAD}>
            대관 위저드(/apply) 각 STEP 제목·설명을 실제 화면과 같은 모양으로 보면서 바로 고칩니다.
          </p>
        </header>

        <div className="mt-8">
          <WizardTextPreview content={screenTextContent} />
        </div>
      </main>
    </div>
  );
}
