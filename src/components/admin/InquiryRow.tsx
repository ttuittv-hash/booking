"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/** Keep native links available for keyboard navigation and opening a new tab. */
export function InquiryRow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return <tr className={`${className ?? ""} cursor-pointer`} onClick={event => {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }}>{children}</tr>;
}
