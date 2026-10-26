import Link from "next/link";
import type { ReactNode } from "react";
import s from "./BookingPreview.module.css";
import design from "./WizardDesign.module.css";

/** Shared BOOK IT presentation for live create and edit routes. */
export function BookingWizardFrame({ children }: { children: ReactNode }) {
  return <div className={`${s.shell} ${s.complete} ${design.theme}`}>
    <header className={s.header}><Link href="/" prefetch={false}>SEOUL ARENA<span>대관 신청</span></Link></header>
    <main>{children}</main>
  </div>;
}
