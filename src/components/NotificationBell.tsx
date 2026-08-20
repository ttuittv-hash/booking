"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@/lib/pricing/types";
import { formatDateTime, formatMonthDay } from "@/lib/format";

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
    if (now === null) return formatDateTime(iso);
    const diff = now - Date.parse(iso);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}시간 전`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day}일 전`;
    return formatMonthDay(iso);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:text-accent"
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : "알림"}
        aria-expanded={open}
      >
        {/* Figma 2608 › 01 공개 화면 › `notifications` 아이콘 (24×24, 면채움) */}
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.70221 19.1495C4.46171 19.1495 4.25963 19.0673 4.09596 18.9028C3.9323 18.7383 3.85046 18.5352 3.85046 18.2935C3.85046 18.0518 3.9323 17.8502 4.09596 17.6885C4.25963 17.527 4.46171 17.4462 4.70221 17.4462H5.79671V9.99575C5.79671 8.56108 6.21621 7.27133 7.05521 6.1265C7.89405 4.98167 9.00838 4.26158 10.3982 3.96625V3.45225C10.3982 3.00558 10.554 2.626 10.8655 2.3135C11.177 2.00083 11.5551 1.8445 12 1.8445C12.4448 1.8445 12.823 2.00083 13.1345 2.3135C13.446 2.626 13.6017 3.00558 13.6017 3.45225V3.96625C14.9915 4.25758 16.1069 4.97633 16.9477 6.1225C17.7887 7.26867 18.2092 8.55975 18.2092 9.99575V17.4462H19.2977C19.5377 17.4462 19.7406 17.5285 19.9065 17.693C20.0725 17.8575 20.1555 18.0606 20.1555 18.3022C20.1555 18.5439 20.0725 18.7455 19.9065 18.907C19.7406 19.0687 19.5377 19.1495 19.2977 19.1495H4.70221ZM12.003 22.2033C11.4391 22.2033 10.9564 22.0022 10.5547 21.6C10.153 21.1978 9.95221 20.7143 9.95221 20.1495H14.0537C14.0537 20.7153 13.8525 21.1991 13.45 21.6008C13.0475 22.0024 12.5651 22.2033 12.003 22.2033ZM7.49996 17.4462H16.5V9.99575C16.5 8.74975 16.0625 7.68825 15.1875 6.81125C14.3125 5.93425 13.25 5.49575 12 5.49575C10.75 5.49575 9.68746 5.93425 8.81246 6.81125C7.93746 7.68825 7.49996 8.74975 7.49996 9.99575V17.4462Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1.5 grid h-3.5 min-w-3.5 place-items-center border border-foreground bg-accent px-1 text-[10px] leading-none font-bold text-on-accent tabular-nums">
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
            href={`${detailPrefix}/notifications`}
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
