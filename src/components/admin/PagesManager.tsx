"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PageGroup, StaticPage } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";
import { NoticeEditor } from "./NoticeEditor";
import {
  ADD_BTN_LG,
  CARD,
  ERROR_NOTE,
  FIELD,
  FIELD_LABEL,
  HELP,
  PANEL,
  QUIET_BTN,
  REMOVE_BTN,
  SUB_TITLE,
  TAB_BAR,
  tabCls,
} from "./adminUi";

const GROUP_LABEL: Record<PageGroup, string> = {
  VENUE: "서울아레나 소개",
  GUIDE: "대관 안내",
};

function blankForm() {
  return { slug: "", navLabel: "", title: "", body: "" };
}

export function PagesManager({ pages: initialPages }: { pages: StaticPage[] }) {
  const router = useRouter();
  const [group, setGroup] = useState<PageGroup>("VENUE");
  const [pages, setPages] = useState(initialPages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupPages = pages.filter((p) => p.group === group).sort((a, b) => a.sortOrder - b.sortOrder);

  function startCreate() {
    setEditingId("__new__");
    setForm(blankForm());
    setError(null);
  }

  function startEdit(page: StaticPage) {
    setEditingId(page.id);
    setForm({ slug: page.slug, navLabel: page.navLabel, title: page.title, body: page.body });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(blankForm());
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const isNew = editingId === "__new__";
      const sortOrder = isNew ? groupPages.length : (pages.find((p) => p.id === editingId)?.sortOrder ?? 0);
      const res = await fetch(isNew ? "/api/admin/pages" : `/api/admin/pages/${editingId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, group, sortOrder }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      if (isNew) {
        setPages([...pages, data.page]);
      } else {
        setPages(pages.map((p) => (p.id === editingId ? data.page : p)));
      }
      cancelEdit();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    setPages(pages.filter((p) => p.id !== id));
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  async function move(page: StaticPage, direction: -1 | 1) {
    const idx = groupPages.findIndex((p) => p.id === page.id);
    const swapWith = groupPages[idx + direction];
    if (!swapWith) return;

    const [a, b] = [
      { ...page, sortOrder: swapWith.sortOrder },
      { ...swapWith, sortOrder: page.sortOrder },
    ];
    setPages(pages.map((p) => (p.id === a.id ? a : p.id === b.id ? b : p)));

    await Promise.all(
      [a, b].map((p) =>
        fetch(`/api/admin/pages/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: p.slug, navLabel: p.navLabel, title: p.title, body: p.body, sortOrder: p.sortOrder }),
        }),
      ),
    );
    router.refresh();
  }

  return (
    <div className="mt-8">
      <div className={TAB_BAR}>
        {(["VENUE", "GUIDE"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGroup(g);
              cancelEdit();
            }}
            className={tabCls(group === g)}
          >
            {GROUP_LABEL[g]} ({pages.filter((p) => p.group === g).length})
          </button>
        ))}
      </div>

      <div className="mt-6">
        <ul className="space-y-2">
          {groupPages.length === 0 ? (
            <li className="text-s text-muted">등록된 하위 페이지가 없습니다.</li>
          ) : (
            groupPages.map((page, i) => (
              <li key={page.id} className={CARD}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-s font-bold">
                      {page.navLabel}{" "}
                      <span className="ml-1 text-xs font-normal text-muted">
                        /{group === "VENUE" ? "venue" : "guide"}/{page.slug}
                      </span>
                    </div>
                    <div className={`mt-1 ${HELP}`}>{page.title}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(page, -1)}
                      aria-label="위로 이동"
                      className="text-s text-muted transition-colors hover:text-foreground disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={i === groupPages.length - 1}
                      onClick={() => move(page, 1)}
                      aria-label="아래로 이동"
                      className="text-s text-muted transition-colors hover:text-foreground disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(page)}
                      className="text-xs font-bold underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong"
                    >
                      수정
                    </button>
                    <button type="button" onClick={() => remove(page.id)} className={REMOVE_BTN}>
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        {editingId ? (
          <div className={`mt-6 ${PANEL}`}>
            <h3 className={SUB_TITLE}>{editingId === "__new__" ? "새 하위 페이지 추가" : "하위 페이지 수정"}</h3>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={FIELD_LABEL}>탭 이름 (예: 시설개요)</span>
                  <input
                    type="text"
                    value={form.navLabel}
                    onChange={(e) => setForm({ ...form, navLabel: e.target.value })}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={FIELD_LABEL}>
                    슬러그 (URL, 영문 소문자·숫자·하이픈) — /{group === "VENUE" ? "venue" : "guide"}/<b>{form.slug || "slug"}</b>
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className={FIELD}
                  />
                </label>
              </div>
              <label className="block">
                <span className={FIELD_LABEL}>페이지 제목</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={FIELD}
                />
              </label>
              <div>
                <span className={FIELD_LABEL}>내용</span>
                <NoticeEditor value={form.body} onChange={(body) => setForm({ ...form, body })} uploadUrl="/api/admin/pages/upload" />
              </div>

              {error && <p className={ERROR_NOTE}>{error}</p>}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={saving || !form.slug.trim() || !form.navLabel.trim() || !form.title.trim()}
                  onClick={save}
                  className={btnClass("primary", "md")}
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button type="button" onClick={cancelEdit} className={QUIET_BTN}>
                  취소
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" onClick={startCreate} className={`mt-6 ${ADD_BTN_LG}`}>
            + 새 하위 페이지 추가
          </button>
        )}
      </div>
    </div>
  );
}
