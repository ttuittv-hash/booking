import type { ReactNode } from "react";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import type { AppUser } from "@/lib/pricing/types";
import type { BookItNoticeTexts } from "@/lib/content/pageContent";
import s from "./BookingPreview.module.css";
import design from "./WizardDesign.module.css";

/** Public navigation stays outside the wizard's scoped control styles. */
export function BookingWizardFrame({ children, currentUser, bookItNotice }: {
  children: ReactNode;
  currentUser: AppUser | null;
  bookItNotice?: BookItNoticeTexts;
}) {
  return <>
    <PublicHeaderNav active="/apply" currentUser={currentUser} bookItNotice={bookItNotice} />
    <div className={`${s.shell} ${s.complete} ${design.theme}`}>
      <main>{children}</main>
    </div>
  </>;
}
