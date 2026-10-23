"use client";
import { useId } from "react";
import styles from "./AdminEditor.module.css";

export function AdminHelpTooltip({ label, children }: { label: string; children: string }) {
  const id = useId();
  return <span className={styles.helpTooltip}>
    <button type="button" aria-label={`${label} 설명`} aria-describedby={id}>i</button>
    <span id={id} role="tooltip">{children}</span>
  </span>;
}
