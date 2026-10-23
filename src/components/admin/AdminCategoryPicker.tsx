"use client";
import { useState } from "react";
import { ADDON_CATEGORY_LABEL, type AddonCategory } from "@/lib/pricing/types";
import styles from "./AdminEditor.module.css";

/** 카테고리는 기존 분류만 사용하며, 첫 항목을 저장할 때 함께 반영된다. */
export function AdminCategoryPicker({ present, onSelect }: { present: string[]; onSelect: (category: AddonCategory) => void }) {
  const [open, setOpen] = useState(false);
  const available = (Object.keys(ADDON_CATEGORY_LABEL) as AddonCategory[]).filter(key => !present.includes(key));
  return <div className={styles.categoryPicker}>
    <button type="button" className={styles.addChip} aria-expanded={open} onClick={() => setOpen(!open)}>+ 카테고리 추가</button>
    {open && <div className={styles.categoryPickerPanel}>
      <strong>추가할 카테고리</strong>
      <p>{available.length ? "기존 분류 중 선택하세요. 표 아래에서 첫 항목을 추가하고 저장하면 반영됩니다." : "기존 9개 카테고리가 모두 표시되어 있습니다."}</p>
      {available.map(key => <button type="button" key={key} onClick={() => { onSelect(key); setOpen(false); }}>{ADDON_CATEGORY_LABEL[key]}</button>)}
      <button type="button" onClick={() => setOpen(false)}>닫기</button>
    </div>}
  </div>;
}
