"use client";

import { useContentTransport } from "./ContentTransport";
import { useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import type { NotificationRule } from "@/lib/pricing/types";
import { btnClass } from "@/components/admin/adminButton";
import { FIELD, FIELD_LABEL, HELP, REMOVE_BTN } from "./adminUi";

import s from "./NotificationRulesManager.module.css";
import editor from "./AdminEditor.module.css";

interface Draft {
  label: string;
  description: string;
  enabled: boolean;
  thresholdDays: string;
  repeatIntervalDays: string;
  messageTemplate: string;
}

function toDraft(rule: NotificationRule): Draft {
  return {
    label: rule.label,
    description: rule.description,
    enabled: rule.enabled,
    thresholdDays: rule.thresholdDays === null ? "" : String(rule.thresholdDays),
    repeatIntervalDays: rule.repeatIntervalDays === null ? "" : String(rule.repeatIntervalDays),
    messageTemplate: rule.messageTemplate,
  };
}

const BLANK_DRAFT: Draft = {
  label: "",
  description: "",
  enabled: true,
  thresholdDays: "",
  repeatIntervalDays: "",
  messageTemplate: "",
};

function draftsEqual(a: Draft, b: Draft): boolean {
  return (
    a.label === b.label &&
    a.description === b.description &&
    a.enabled === b.enabled &&
    a.thresholdDays === b.thresholdDays &&
    a.repeatIntervalDays === b.repeatIntervalDays &&
    a.messageTemplate === b.messageTemplate
  );
}

// 메시지 문구에 어떤 자리표시자를 쓸 수 있는지 트리거마다 다르므로, typeCode 기준으로
// 안내를 붙인다 — 커스텀(안내용) 규칙은 자리표시자가 실제로 치환되지 않으므로 표시하지 않는다.
const PLACEHOLDER_HELP: Record<string, string> = {
  INVOICE_UNPAID: "{quoteId} · {purposeLabel}(계약금/정산금) 를 문구 안에서 쓸 수 있습니다.",
  TICKET_OPEN_MISSING: "{quoteId} · {openDate} 를 문구 안에서 쓸 수 있습니다.",
  FACILITY_MEETING_MISSING: "{quoteId} · {meetingDate} 를 문구 안에서 쓸 수 있습니다.",
};

function RuleFields({
  draft,
  onChange,
  placeholderHelp,
  thresholdLabel,
  automatic = false,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  placeholderHelp?: string;
  thresholdLabel: string;
  automatic?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className={FIELD_LABEL}>이름</span>
        <input
          value={draft.label}
          onChange={(e) => onChange({ ...draft, label: e.target.value })}
          className={`w-full ${FIELD}`}
        />
      </label>
      <label className="flex items-end gap-2 pb-2">
        <input
          type="checkbox"

          checked={draft.enabled}
          onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
        />
        <span className="text-s">{automatic ? "자동 발송 사용" : "안내용 항목 사용"}</span>
      </label>
      <label className="block sm:col-span-2">
        <span className={FIELD_LABEL}>안내 문구 (운영자용 설명)</span>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={2}
          className={`w-full ${FIELD}`}
        />
      </label>
      <label className="block">
        <span className={FIELD_LABEL}>{thresholdLabel}</span>
        <input
          type="number"
          min={0}
          placeholder="예: 30"
          value={draft.thresholdDays}
          onChange={(e) => onChange({ ...draft, thresholdDays: e.target.value })}
          className={`w-full ${FIELD}`}
        />
      </label>
      <label className="block">
        <span className={FIELD_LABEL}>재발송 간격(일)</span>
        <input
          type="number"
          min={0}
          placeholder="예: 5"
          value={draft.repeatIntervalDays}
          onChange={(e) => onChange({ ...draft, repeatIntervalDays: e.target.value })}
          className={`w-full ${FIELD}`}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className={FIELD_LABEL}>발송 문구</span>
        <textarea
          value={draft.messageTemplate}
          onChange={(e) => onChange({ ...draft, messageTemplate: e.target.value })}
          rows={2}
          className={`w-full ${FIELD}`}
        />
        {placeholderHelp && <p className={`mt-1 ${HELP}`}>{placeholderHelp}</p>}
      </label>
    </div>
  );
}

function RuleCard({
  rule,
  onSaved,
  onDeleted,
}: {
  rule: NotificationRule;
  onSaved: (rule: NotificationRule) => void;
  onDeleted: (id: string) => void;
}) {
  const { request } = useContentTransport();
  const [draft, setDraft] = useState<Draft>(toDraft(rule));
  const dialog = useDialog();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = !draftsEqual(draft, toDraft(rule));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await request(`/api/admin/notification-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: draft.label,
          description: draft.description,
          enabled: draft.enabled,
          thresholdDays: draft.thresholdDays === "" ? null : Number(draft.thresholdDays),
          repeatIntervalDays: draft.repeatIntervalDays === "" ? null : Number(draft.repeatIntervalDays),
          messageTemplate: draft.messageTemplate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      onSaved(data.rule);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!(await dialog.confirm(`"${rule.label}" 트리거를 삭제할까요?`, { okLabel: "삭제" }))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await request(`/api/admin/notification-rules/${rule.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "삭제에 실패했습니다.");
        return;
      }
      onDeleted(rule.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`${editor.section} ${s.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={editor.title}>{rule.label}</h3>
            {rule.isSystem ? (
              <span className="border border-border-soft px-1.5 py-0.5 text-xs text-muted">
                자동 발송 연동됨
              </span>
            ) : (
              <span className="border border-border-soft px-1.5 py-0.5 text-xs text-muted">
                안내용(자동 발송 미연동)
              </span>
            )}
            {!rule.enabled && <span className="text-xs font-bold text-danger">꺼짐</span>}
          </div>
        </div>
        {!rule.isSystem && (
          <button type="button" onClick={remove} disabled={deleting} className={REMOVE_BTN}>
            {deleting ? "삭제 중…" : "삭제"}
          </button>
        )}
      </div>

      <RuleFields
        draft={draft}
        automatic={rule.isSystem}
        onChange={setDraft}
        placeholderHelp={PLACEHOLDER_HELP[rule.typeCode]}
        thresholdLabel={rule.isSystem ? "며칠 전부터 발송(D-n, 간격형은 비워둠)" : "며칠 전부터 발송(D-n)"}
      />

      <div className={editor.saveBar}>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty || !draft.label || !draft.description || !draft.messageTemplate}
          className={editor.saveButton}
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  );
}

function NewRuleCard({ onCreated }: { onCreated: (rule: NotificationRule) => void }) {
  const { request } = useContentTransport();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <div className={editor.tableAdd}>
      <button type="button" onClick={() => setOpen(true)}>
        + 안내용 트리거 추가
      </button>
      </div>
    );
  }

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const res = await request("/api/admin/notification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: draft.label,
          description: draft.description,
          enabled: draft.enabled,
          thresholdDays: draft.thresholdDays === "" ? null : Number(draft.thresholdDays),
          repeatIntervalDays: draft.repeatIntervalDays === "" ? null : Number(draft.repeatIntervalDays),
          messageTemplate: draft.messageTemplate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "추가에 실패했습니다.");
        return;
      }
      onCreated(data.rule);
      setDraft(BLANK_DRAFT);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${editor.section} ${s.card}`}>
      <p className="text-s font-bold">새 알림 트리거</p>
      <p className={`mt-1 ${HELP}`}>
        여기서 추가하는 항목은 카탈로그 성격의 안내용 항목입니다 — 조건 판정 로직을 새로 만들어야
        실제 자동 발송에 연동되므로, 개발 필요 사항으로 남겨두는 용도로 씁니다.
      </p>
      <RuleFields draft={draft} onChange={setDraft} thresholdLabel="며칠 전부터 발송(D-n, 해당 없으면 비워둠)" />
      <div className={editor.saveBar}>
        <button type="button" onClick={() => setOpen(false)} className={btnClass("tertiary", "md")}>취소</button>
        <button
          type="button"
          onClick={create}
          disabled={saving || !draft.label || !draft.description || !draft.messageTemplate}
          className={editor.saveButton}
        >
          {saving ? "추가 중…" : "추가"}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  );
}

export function NotificationRulesManager({ initialRules }: { initialRules: NotificationRule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [active,setActive]=useState("automatic");

  return (
    <div className={`${editor.workspace} ${s.workspace}`}>
      <div className={editor.venueTabs} role="tablist" aria-label="알림 트리거 분류">{[["automatic","자동 발송 트리거"],["reference","안내용 트리거"]].map(([key,label])=><button key={key} type="button" role="tab" id={`notification-tab-${key}`} aria-controls={`notification-panel-${key}`} aria-selected={active===key} onClick={()=>setActive(key)}>{label}<span className={s.count}>{rules.filter(rule=>key==="automatic"?rule.isSystem:!rule.isSystem).length}</span></button>)}</div>
      <div role="tabpanel" id="notification-panel-automatic" aria-labelledby="notification-tab-automatic" hidden={active!=="automatic"}>
        <h2 className={editor.title}>자동 발송 트리거</h2>
        <p className={editor.description}>
          매일 오전 9시 아래 조건에 따라 신청자와 운영자에게 알림을 보냅니다. 변경한 설정은 저장 후 다음 자동 발송부터 적용됩니다.
        </p>
        <div className={s.cards}>
          {rules
            .filter((r) => r.isSystem)
            .map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onSaved={(next) => setRules((prev) => prev.map((r) => (r.id === next.id ? next : r)))}
                onDeleted={() => {}}
              />
            ))}
        </div>
      </div>

      <div role="tabpanel" id="notification-panel-reference" aria-labelledby="notification-tab-reference" hidden={active!=="reference"}>
        <h2 className={editor.title}>안내용 트리거</h2>
        <p className={editor.description}>
          발송 조건과 문구를 기록해 두는 항목입니다. 저장하거나 사용으로 설정해도 실제 알림은 발송되지 않습니다.
        </p>
        <div className={s.cards}>
          {rules
            .filter((r) => !r.isSystem)
            .map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onSaved={(next) => setRules((prev) => prev.map((r) => (r.id === next.id ? next : r)))}
                onDeleted={(id) => setRules((prev) => prev.filter((r) => r.id !== id))}
              />
            ))}
          <NewRuleCard onCreated={(rule) => setRules((prev) => [...prev, rule])} />
        </div>
      </div>
    </div>
  );
}
