"use client";

import editor from "./AdminEditor.module.css";
import { useState } from "react";
import { AddAdminForm } from "./AddAdminForm";
import { AdminPasswordForm } from "./AdminPasswordForm";
import { MasterTransferForm } from "./MasterTransferForm";
import { PromoteUserForm } from "./PromoteUserForm";
import { SECTION_TITLE, THEAD_ROW, TH, TR, TD, TAB_BAR, tabCls } from "./adminUi";

const candidates = [{ id: "preview-pro", name: "예시 프로 관리자", email: "pro@example.invalid" }];

export function AdminSettingsPreview() {
  const [section, setSection] = useState("운영자 계정");
  return <div className={`admin-page ${editor.workspace}`} style={{ minHeight: "auto", background: "transparent" }}>
    <nav className={TAB_BAR} aria-label="설정 메뉴">{["운영자 계정", "계정 설정"].map(label => <button key={label} type="button" className={tabCls(section === label)} aria-pressed={section === label} onClick={() => setSection(label)}>{label}</button>)}</nav>
    <p className="mb-6 text-xs text-muted">예시 계정입니다. 아래 실제 관리 양식은 디자인 검토용으로 표시되며 변경 기능은 비활성화되어 있습니다.</p>
    {section === "계정 설정" ? <fieldset disabled className="m-0 min-w-0 border-0 p-0"><AdminPasswordForm /></fieldset> : <>
      <section className={`${editor.section} ${editor.paddedSection}`}><h2 className={SECTION_TITLE}>운영자 계정 (2)</h2><div className="mt-4 overflow-x-auto"><table className="admin-table w-full text-left"><thead><tr className={THEAD_ROW}><th scope="col" className={TH}>이름</th><th scope="col" className={TH}>이메일</th><th scope="col" className={TH}>휴대폰 번호</th><th scope="col" className={TH}>등급</th></tr></thead><tbody><tr className={TR}><td className={TD}>예시 마스터 관리자 (나)</td><td className={TD}>master@example.invalid</td><td className={TD}>미등록</td><td className={TD}>마스터 관리자</td></tr><tr className={TR}><td className={TD}>{candidates[0].name}</td><td className={TD}>{candidates[0].email}</td><td className={TD}>미등록</td><td className={TD}>프로 관리자</td></tr></tbody></table></div></section>
      <fieldset disabled className="m-0 mt-8 min-w-0 space-y-8 border-0 p-0"><MasterTransferForm candidates={candidates} /><PromoteUserForm /><AddAdminForm /></fieldset>
    </>}
  </div>;
}
