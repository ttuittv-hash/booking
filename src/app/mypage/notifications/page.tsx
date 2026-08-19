import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { PageHeading } from "@/components/ui/kit";
import { NotificationList } from "@/components/NotificationList";

// 알림 전체 보기 (신청자).
export default async function MyNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmypage%2Fnotifications");

  const notifications = await listNotifications(user.id, 100);
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />
      <main className="container-site flex-1 py-12">
        <PageHeading title="알림" />
        <p className="mt-3 break-keep text-s leading-6 text-muted">
          최근 받은 알림 100건입니다. 항목을 누르면 해당 화면으로 이동합니다.
        </p>
        <NotificationList notifications={notifications} fallbackPrefix="/mypage" />
      </main>
      <SiteFooter />
    </div>
  );
}
