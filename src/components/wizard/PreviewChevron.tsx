import s from "./BookingPreview.module.css";
export function PreviewChevron() {
  return <span className={s.chevron} aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></span>;
}
