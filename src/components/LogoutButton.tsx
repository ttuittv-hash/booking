"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      // 글자 높이만큼만 잡히면 모바일에서 18px 짜리 타깃이 된다.
      className={`inline-flex min-h-11 cursor-pointer items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:min-h-0 ${className}`}
    >
      로그아웃
    </button>
  );
}
