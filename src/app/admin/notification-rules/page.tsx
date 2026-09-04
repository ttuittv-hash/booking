import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotificationRules } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationRulesManager } from "@/components/admin/NotificationRulesManager";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminNotificationRulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const rules = await listNotificationRules();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/notification-rules" user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/25 pb-6">
          <h1 className={PAGE_TITLE}>알림 관리</h1>
          <p className={PAGE_LEAD}>
            신청자·운영자에게 자동으로 나가는 알림의 조건과 문구를 관리합니다. 받은 알림 자체는 종 아이콘의
            알림함에서 확인할 수 있습니다.
          </p>
        </header>

        <NotificationRulesManager initialRules={rules} />
      </main>
    </div>
  );
}
