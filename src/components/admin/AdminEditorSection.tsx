import type { ReactNode } from "react";
import styles from "./AdminEditor.module.css";

/** 관리자 편집 화면 공통 정보 그룹. 접어도 입력 컴포넌트는 유지된다. */
export function AdminEditorSection({ title, description, openDescription, children, defaultOpen = false }: {
  title: string; description: string; openDescription?: string; children: ReactNode; defaultOpen?: boolean;
}) {
  return <details className={styles.section} open={defaultOpen}>
    <summary className={styles.summary}><span><span className={styles.title}>{title}</span><span className={`${styles.description} ${openDescription ? styles.closedDescription : ""}`}>{description}</span>{openDescription && <span className={`${styles.description} ${styles.openDescription}`}>{openDescription}</span>}</span><span className={styles.chevron} aria-hidden="true">⌄</span></summary>
    <div className={styles.body}>{children}</div>
  </details>;
}
