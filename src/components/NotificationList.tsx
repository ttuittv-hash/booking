import Link from "next/link";
import type { AppNotification } from "@/lib/pricing/types";
import { formatDateTime } from "@/lib/format";

// 알림 전체 보기 목록. 드롭다운과 같은 규칙으로 제목·본문을 나눈다.
export function NotificationList({
  notifications,
  fallbackPrefix,
}: {
  notifications: AppNotification[];
  fallbackPrefix: string;
}) {
  if (notifications.length === 0) {
    return <p className="mt-10 text-center text-s text-muted">받은 알림이 없습니다.</p>;
  }

  return (
    <ul className="mt-8 border-t border-border/25">
      {notifications.map((n) => {
        const [head, ...rest] = n.message.split("\n");
        const body = rest.join("\n").trim();
        const href = n.link ?? (n.quoteId ? `${fallbackPrefix}/${n.quoteId}` : fallbackPrefix);
        return (
          <li key={n.id} className="border-b border-border/25">
            <Link
              href={href}
              className={`flex gap-3 px-1 py-4 transition-colors hover:bg-foreground/[0.03] ${
                n.isRead ? "" : "bg-accent/[0.05]"
              }`}
            >
              <span
                aria-hidden
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                  n.isRead ? "bg-transparent" : "bg-accent"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block break-keep text-s leading-6 ${
                    n.isRead ? "text-muted" : "font-bold"
                  }`}
                >
                  {head.trim()}
                </span>
                {body ? (
                  <span className="mt-1 block break-keep text-xs leading-6 text-muted">{body}</span>
                ) : null}
                <span className="mt-1.5 block text-xs text-muted tabular-nums">
                  {formatDateTime(n.createdAt)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
