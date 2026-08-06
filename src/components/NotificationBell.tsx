"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@/lib/pricing/types";

export function NotificationBell({ role }: { role: "ADMIN" | "APPLICANT" }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    // 서버 알림 상태를 마운트 시 동기화하고 30초 간격으로 폴링한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", id }),
    });
  }

  const detailPrefix = role === "ADMIN" ? "/admin" : "/mypage";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
        aria-label="알림"
      >
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* 옐로 면 + 검정 텍스트 (대비 약 14:1) · 샤프 코너 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 grid h-4 min-w-4 place-items-center border border-foreground bg-accent px-1 text-xs leading-none font-bold text-on-accent tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 animate-[dropdown-in_0.16s_ease-out] border border-border/25 bg-surface shadow-md">
          <div className="flex items-center justify-between border-b border-border/25 px-4 py-3">
            <span className="text-xs font-bold">알림</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
              >
                모두 읽음
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">알림이 없습니다.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.quoteId ? `${detailPrefix}/${n.quoteId}` : detailPrefix}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                  className="flex gap-3 border-b border-border/15 px-4 py-3 text-s transition-colors last:border-b-0 hover:bg-foreground/[0.04]"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${n.isRead ? "bg-transparent" : "bg-accent"}`}
                  />
                  <span className="flex-1">
                    <span className={n.isRead ? "text-muted" : "text-foreground"}>{n.message}</span>
                    <span className="mt-1 block text-xs text-muted tabular-nums">
                      {new Date(n.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
