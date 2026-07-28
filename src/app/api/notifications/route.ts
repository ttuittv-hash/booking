import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countUnreadNotifications, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  return NextResponse.json({
    notifications: listNotifications(user.id),
    unreadCount: countUnreadNotifications(user.id),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (body?.action === "markRead" && typeof body?.id === "string") {
    markNotificationRead(body.id, user.id);
  } else if (body?.action === "markAllRead") {
    markAllNotificationsRead(user.id);
  } else {
    return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
  }

  return NextResponse.json({
    notifications: listNotifications(user.id),
    unreadCount: countUnreadNotifications(user.id),
  });
}
