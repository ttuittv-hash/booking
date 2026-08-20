import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead } from "@/components/ui/kit";
import { NotificationList } from "@/components/NotificationList";

// 알림 전체 보기 (신청자).
export default async function MyNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmypage%2Fnotifications");

  const notifications = await listNotifications(user.id, 100);
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage/notifications" currentUser={user} />
      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHead
            en="NOTIFICATIONS"
            ko="알림"
            lead="최근 받은 알림 100건입니다. 항목을 누르면 해당 화면으로 이동합니다."
          />
        </Band>
        <Band tone="white" size="sm">
          <NotificationList notifications={notifications} fallbackPrefix="/mypage" />
        </Band>
      </main>
      <SiteFooter />
    </div>
  );
}
