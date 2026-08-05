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
      className={`cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${className}`}
    >
      로그아웃
    </button>
  );
}
