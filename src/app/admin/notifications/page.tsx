import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";
import { NotificationList } from "@/components/NotificationList";

// 알림 전체 보기 (운영자).
export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const notifications = await listNotifications(user.id, 100);
  return (
    <div className="flex flex-1 flex-col">
      {/* 알림은 상단 메뉴에 없는 화면이라 어느 탭도 켜지 않는다. */}
      <AdminNav active="/admin/notifications" user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/25 pb-6">
          <h1 className={PAGE_TITLE}>알림</h1>
          <p className={PAGE_LEAD}>최근 받은 알림 100건입니다. 항목을 누르면 해당 화면으로 이동합니다.</p>
        </header>
        <NotificationList notifications={notifications} fallbackPrefix="/admin" />
      </main>
    </div>
  );
}
