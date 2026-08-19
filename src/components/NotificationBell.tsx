"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@/lib/pricing/types";

export function NotificationBell({ role }: { role: "ADMIN" | "APPLICANT" }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // 상대시간 계산의 기준 시각. 렌더 중 Date.now() 를 부르면 렌더마다 값이 달라진다.
  // 폴링할 때 함께 갱신해 30초 단위로만 움직이게 한다.
  const [now, setNow] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setNow(Date.now());
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

  // 저장된 링크가 있으면 그리로, 없으면 신청서 상세, 그것도 없으면 역할별 기본 목록.
  function hrefOf(n: AppNotification) {
    if (n.link) {
      // 절대 URL 로 저장돼 있어도 같은 사이트면 경로만 남겨 클라이언트 이동을 쓴다.
      try {
        const u = new URL(n.link, window.location.origin);
        return u.origin === window.location.origin ? u.pathname + u.search : n.link;
      } catch {
        return n.link;
      }
    }
    return n.quoteId ? `${detailPrefix}/${n.quoteId}` : detailPrefix;
  }

  // 본문 첫 줄을 제목처럼 쓴다. 알림톡 문안이 "제목\n상세" 구조라 그대로 살린다.
  function splitBody(message: string) {
    const [head, ...rest] = message.split("\n");
    return { head: head.trim(), body: rest.join("\n").trim() };
  }

  function relativeTime(iso: string) {
    // 기준 시각이 아직 없으면(첫 렌더) 절대 날짜로 보여준다.
    if (now === null) return new Date(iso).toLocaleString("ko-KR");
    const diff = now - Date.parse(iso);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}시간 전`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : "알림"}
        aria-expanded={open}
      >
        <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center border border-foreground bg-accent px-1 text-[10px] leading-none font-bold text-on-accent tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] animate-[dropdown-in_0.16s_ease-out] border border-border/30 bg-surface shadow-lg sm:w-[26rem]">
          <div className="flex items-center justify-between border-b border-border/25 px-5 py-3.5">
            <span className="text-s font-bold">
              알림
              {unreadCount > 0 ? (
                <span className="ml-2 text-xs font-normal text-muted tabular-nums">
                  안 읽음 {unreadCount}
                </span>
              ) : null}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-muted transition-colors hover:text-foreground"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-5 py-12 text-center text-s text-muted">받은 알림이 없습니다.</p>
            ) : (
              notifications.map((n) => {
                const { head, body } = splitBody(n.message);
                return (
                  <Link
                    key={n.id}
                    href={hrefOf(n)}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className={`flex gap-3 border-b border-border/15 px-5 py-4 transition-colors last:border-b-0 hover:bg-foreground/[0.04] ${
                      n.isRead ? "" : "bg-accent/[0.06]"
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
                          n.isRead ? "text-muted" : "font-bold text-foreground"
                        }`}
                      >
                        {head}
                      </span>
                      {body ? (
                        <span className="mt-1 block break-keep text-xs leading-6 text-muted">
                          {body}
                        </span>
                      ) : null}
                      <span className="mt-1.5 block text-xs text-muted tabular-nums">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            href={detailPrefix}
            onClick={() => setOpen(false)}
            className="block border-t border-border/25 px-5 py-3 text-center text-xs font-bold text-muted transition-colors hover:text-foreground"
          >
            전체 보기
          </Link>
        </div>
      )}
    </div>
  );
}
