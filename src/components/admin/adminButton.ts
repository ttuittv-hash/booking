import { btnClass as baseButtonClass } from "@/components/ui/kit";
import styles from "./AdminButton.module.css";

/** Admin geometry is independent of the public site's rem-based button sizes. */
export function btnClass(
  variant: Parameters<typeof baseButtonClass>[0] = "secondary",
  size: Parameters<typeof baseButtonClass>[1] = "md",
) {
  const sizeClass = { sm: styles.small, md: styles.medium, lg: styles.large }[size];
  return `${baseButtonClass(variant, size)} ${styles.button} ${sizeClass}`;
}
