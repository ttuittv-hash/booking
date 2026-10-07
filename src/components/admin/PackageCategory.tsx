"use client";
import { Children, useId, useState, type ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import styles from "./PackageCategory.module.css";

export function PackageCategory({preview,title,children}:{preview:boolean;title:string;children:ReactNode}) {
  const [open,setOpen]=useState(true);
  const id=useId();
  const parts=Children.toArray(children);
  if(!preview) return <div className="pl-1">{children}</div>;
  return <div className={styles.category}>
    <div className={styles.header} data-open={open}>
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={id} aria-label={`${title} ${open ? "접기" : "펼치기"}`} onClick={()=>setOpen(!open)}><IconChevronDown size={18} className={open ? undefined : styles.closed}/></button>
      {parts[0]}
    </div>
    <div id={id} hidden={!open} className={styles.body}>{parts.slice(1)}</div>
  </div>;
}
