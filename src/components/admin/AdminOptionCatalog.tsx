"use client";

import { useState, type ReactNode } from "react";
import { ADDON_CATEGORY_LABEL, type AddonCategory, type AddonItem } from "@/lib/pricing/types";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { AdminCategoryPicker } from "./AdminCategoryPicker";
import { FIELD, FIELD_NUM } from "./adminUi";
import styles from "./AdminEditor.module.css";

/** 목록은 탐색·비교, 상세는 기존 편집 동작을 담당한다. 저장 데이터는 부모만 소유한다. */
export function AdminOptionCatalog({ items, quantity, exposed, onQuantity, onPrice, renderDetail, addContent, onAddCategory }: {
  items: AddonItem[];
  addContent: ReactNode;
  onAddCategory: (category: AddonCategory) => void;
  quantity: (id: string) => number;
  exposed: (item: AddonItem) => boolean;
  onQuantity: (id: string, quantity: number) => void;
  onPrice: (id: string, price: number) => void;
  renderDetail: (item: AddonItem) => ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extraCategories, setExtraCategories] = useState<AddonCategory[]>([]);
  const categories = [...new Set([...items.map(item => item.category), ...extraCategories])];
  const filtered = items.filter(item => (category === "all" || item.category === category)
    && `${item.name} ${item.spec ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    && (status === "all" || (status === "included" ? quantity(item.id) > 0 : exposed(item))));
  const selected = items.find(item => item.id === selectedId);
  return <div className={styles.catalog}>
    <nav className={styles.chips} aria-label="옵션 카테고리">
      <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>전체 <span>{items.length}</span></button>
      {categories.map(key => <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)}>{ADDON_CATEGORY_LABEL[key]} <span>{items.filter(item => item.category === key).length}</span></button>)}
      <AdminCategoryPicker present={categories} onSelect={key => { setExtraCategories(prev => [...prev, key]); setCategory(key); setSearch(""); setStatus("all"); onAddCategory(key); }} />
    </nav>

    <div className={styles.catalogTools}>
      <label>항목 검색<input className={FIELD} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="항목명 또는 스펙 검색" /></label>
      <label>표시 조건<select className={FIELD} value={status} onChange={e => setStatus(e.target.value)}><option value="all">전체 항목</option><option value="included">기본 포함 항목</option><option value="exposed">신청자 선택 가능</option></select></label>
      <span aria-live="polite">{filtered.length}개 항목</span>
    </div>
    <div className={styles.catalogLayout} data-detail-open={Boolean(selected)}>
      <div className={styles.catalogTableWrap}><table className={styles.catalogTable}>
        <colgroup><col className={styles.itemColumn} /><col className={styles.quantityColumn} /><col className={styles.priceColumn} /><col className={styles.actionColumn} /></colgroup>
        <thead><tr><th>항목 / 단위</th><th>기본 수량</th><th>단가</th><th>상세</th></tr></thead>
        <tbody>{filtered.map(item => <tr key={item.id} data-selected={selectedId === item.id}>
          <td><strong>{item.name}</strong><small>{item.unitLabel} · {item.visibility === "HIDDEN" ? "신청자 비노출" : item.visibility === "ITEM_ONLY" ? "항목명 노출" : exposed(item) ? "신청자 선택 가능" : "선택 비노출"}</small></td>
          <td><input aria-label={`${item.name} 기본 수량`} className={FIELD_NUM} type="number" min={0} value={quantity(item.id)} onChange={e => onQuantity(item.id, Math.max(0, Number(e.target.value) || 0))} /></td>
          <td><MoneyInput aria-label={`${item.name} 단가`} className={FIELD_NUM} value={item.unitPrice} onChange={value => onPrice(item.id, Math.max(0, value))} /></td>
          <td><button type="button" aria-label={`${item.name} 상세 편집`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>편집</button></td>
        </tr>)}</tbody>
      </table>{filtered.length === 0 && <p className={styles.empty}>조건에 맞는 항목이 없습니다. 검색어나 카테고리를 변경하세요.</p>}</div>
      {selected && <aside className={styles.detail} aria-label={`${selected.name} 상세 편집`}>
        <header><div><small>항목 상세</small><h3>{selected.name}</h3></div><button type="button" onClick={() => setSelectedId(null)}>닫기</button></header>
        <p>변경 내용은 목록에도 반영됩니다. 화면 하단의 저장 버튼으로 확정하세요.</p>
        {renderDetail(selected)}
      </aside>}
    </div>
    <div className={styles.tableAdd}><button type="button" className={styles.addChip} aria-expanded={adding} onClick={() => setAdding(!adding)}>+ 항목 추가</button></div>
    <div hidden={!adding} className={styles.addPanel}><strong>항목 추가</strong><p>카테고리를 고른 뒤 새 항목을 만들거나 기존 항목을 가져오세요.</p>{addContent}</div>
  </div>;
}
