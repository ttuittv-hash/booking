"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PageGroup, StaticPage } from "@/lib/pricing/types";
import { NoticeEditor } from "./NoticeEditor";

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
      <div className="sticky top-14 z-10 -mx-6 flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-background px-6 sm:top-16">
        {(["VENUE", "GUIDE"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGroup(g);
              cancelEdit();
            }}
            className={[
              "shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium outline-none transition-colors",
              group === g ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {GROUP_LABEL[g]} ({pages.filter((p) => p.group === g).length})
          </button>
        ))}
      </div>

      <div className="mt-6">
        <ul className="space-y-2">
          {groupPages.length === 0 ? (
            <li className="text-[13px] text-muted">등록된 하위 페이지가 없습니다.</li>
          ) : (
            groupPages.map((page, i) => (
              <li key={page.id} className="border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13.5px] font-semibold">
                      {page.navLabel} <span className="ml-1 text-[11.5px] font-normal text-muted">/{group === "VENUE" ? "venue" : "guide"}/{page.slug}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">{page.title}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-[12.5px]">
                    <button type="button" disabled={i === 0} onClick={() => move(page, -1)} className="text-muted hover:text-foreground disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" disabled={i === groupPages.length - 1} onClick={() => move(page, 1)} className="text-muted hover:text-foreground disabled:opacity-30">
                      ↓
                    </button>
                    <button type="button" onClick={() => startEdit(page)} className="text-accent hover:underline">
                      수정
                    </button>
                    <button type="button" onClick={() => remove(page.id)} className="text-muted hover:text-red-600">
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        {editingId ? (
          <div className="mt-6 border border-border bg-panel/60 p-5">
            <h3 className="text-[14px] font-semibold">{editingId === "__new__" ? "새 하위 페이지 추가" : "하위 페이지 수정"}</h3>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[12px] text-muted">탭 이름 (예: 시설개요)</span>
                  <input
                    type="text"
                    value={form.navLabel}
                    onChange={(e) => setForm({ ...form, navLabel: e.target.value })}
                    className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] text-muted">
                    슬러그 (URL, 영문 소문자·숫자·하이픈) — /{group === "VENUE" ? "venue" : "guide"}/<b>{form.slug || "slug"}</b>
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[12px] text-muted">페이지 제목</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
              </label>
              <div>
                <span className="mb-1.5 block text-[12px] text-muted">내용</span>
                <NoticeEditor value={form.body} onChange={(body) => setForm({ ...form, body })} uploadUrl="/api/admin/pages/upload" />
              </div>

              {error && <p className="text-[12.5px] text-red-600">{error}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !form.slug.trim() || !form.navLabel.trim() || !form.title.trim()}
                  onClick={save}
                  className="rounded-sm bg-accent px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button type="button" onClick={cancelEdit} className="text-[12.5px] text-muted hover:text-foreground">
                  취소
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCreate}
            className="mt-6 border border-dashed border-border px-4 py-3 text-[12.5px] text-muted hover:border-accent hover:text-accent"
          >
            + 새 하위 페이지 추가
          </button>
        )}
      </div>
    </div>
  );
}
