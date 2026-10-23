"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import type { ScreenTextContent, WizardStepTexts, VenueRateContent } from "@/lib/content/pageContent";
import { PUBLIC_INTEREST_GROUPS, PUBLIC_INTEREST_ITEM_LABEL } from "@/lib/pricing/types";
import type { RateTable } from "@/lib/pricing/types";
import { useContentTransport } from "./ContentTransport";
import catalog from "./wizardTextCatalog.json";
import textLabels from "./wizardTextLabels.json";

function textFieldLabel(key:string) {
  const known=(textLabels as Record<string,string>)[key];
  if(known)return known;
  const groups:Record<string,string>={applicantCompanyType:"신청 기업 유형",eventTypes:"행사 유형",ageRating:"공연 등급",seatingTypes:"객석 형태",stageTypes:"무대 형태",ancillaryBusinessPlans:"부대사업 계획",applicantContact:"담당자 정보"};
  const group=key.split(".").find(part=>groups[part]);
  if(group)return `${groups[group]} · ${key.startsWith("validationMessage.")?"미입력 안내":"선택지 이름"}`;
  return `${key.startsWith("calendar")?"일정 선택":key.startsWith("safety")?"안전 서약":key.startsWith("publicInterest")?"공공·공익": "신청 화면"} · ${/placeholder/i.test(key)?"입력 예시":/hint|note/i.test(key)?"도움말":"표시 문구"}`;
}
import s from "./WizardPreviewWorkspace.module.css";

const sections: { label: string; fields: [keyof WizardStepTexts, string][] }[] = [
  { label: "공간 · 일정", fields: [["venuePickerTitle", "공간 선택 제목"], ["venuePickerLead", "공간 선택 안내"]] },
  { label: "구성 · 옵션", fields: [["configArenaTitle", "아레나 제목"], ["configMidHallOnlyTitle", "중형공연장 제목"], ["configMidHallOnlyLead", "중형공연장 안내"], ["configSimultaneousTitle", "동시 대관 제목"], ["configSimultaneousLead", "동시 대관 안내"]] },
  { label: "신청 정보", fields: [["performanceInfoTitle", "신청자 정보 제목"], ["audienceTitle", "규모 제목"], ["audienceLead", "규모 안내"], ["publicInterestTitle", "공공 · 공익 제목"], ["marketingTitle", "마케팅 제목"], ["marketingLead", "마케팅 안내"], ["safetyPledgeTitle", "서약서 제목"], ["safetyPledgeLead", "서약서 안내"]] },
  { label: "확인 · 제출", fields: [["estimateTitle", "예상 대관료 제목"], ["submitNewTitle", "제출 제목"], ["submitNewLead", "제출 안내"], ["submitEditingTitle", "수정 제목"], ["submitEditingLead", "수정 안내"]] },
];

export function WizardPreviewWorkspace({ content, patch, rateTable, liveHallRateContent, section, onSectionChange, subIndex, onSubChange, subLabels, controls }: {
 content: ScreenTextContent; patch: (value: Partial<ScreenTextContent>) => void; rateTable: RateTable; liveHallRateContent: VenueRateContent;
 section:number; onSectionChange:(index:number)=>void; subIndex:number; onSubChange:(index:number)=>void; subLabels:string[]; controls:ReactNode;
}) {
  const inspector = useRef<HTMLElement>(null);
  const [selectMode,setSelectMode]=useState(true);
  const [selected,setSelected]=useState<{kind:string;key:string}|null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const {isPreview}=useContentTransport();
  const frameUrl=isPreview ? "/apply/design-preview?editor=1" : "/admin/content/wizard-frame";
  const [observed,setObserved]=useState<Record<string,string>>({});
  const [query,setQuery]=useState("");
  const previewStep=([[1],[2,2,2],[3,4,5,6,7],[8,9]][section] ?? [1])[subIndex] ?? 1;
  const venue=section===1 ? ["arena","medium-hall","simultaneous"][subIndex] : undefined;
  const visibleHeadings=sections[section].fields.filter(([key])=>section===1 ? key.startsWith(["configArena","configMidHallOnly","configSimultaneous"][subIndex]) : section===2 ? (subIndex===0 ? /^(performanceInfo|audience)/.test(key) : subIndex===1 ? key.startsWith("marketing") : subIndex===2 ? key.startsWith("publicInterest") : subIndex===3 ? key.startsWith("safetyPledge") : false) : section===3 ? subIndex===0 ? key==="estimateTitle" : key.startsWith("submit") : true);
  const strings=Object.entries({...catalog,...observed,...content.wizardStrings}).filter(([key,value])=>{
    const prefixes=[["venue","stepNav","wizardShell","calendar"],["configOptions","package","addons","venue"],["fieldLabel","performanceInfo","audience","marketing","publicInterest","safety","attachment"],["estimate","submit","competition","step5","step6"]][section];
    return (query ? `${key} ${textFieldLabel(key)} ${value}`.toLowerCase().includes(query.toLowerCase()) : prefixes.some(prefix=>key.startsWith(prefix)));
  });
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ type: "admin-wizard-preview", content, rateTable, liveHallRateContent }, window.location.origin);
    function receive(event: MessageEvent) {
      if(event.origin===window.location.origin && event.source===frame.current?.contentWindow && event.data?.type==="wizard-preview-fields")setObserved(event.data.fields);
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === "wizard-preview-ready") {
        setReady(true);
        send();
        frame.current?.contentWindow?.postMessage({type:"admin-wizard-navigate",step:previewStep,venue},window.location.origin);
      }
    }
    window.addEventListener("message", receive);
    send();
    return () => window.removeEventListener("message", receive);
  }, [content, rateTable, liveHallRateContent, previewStep, venue]);
  useEffect(()=>{
    if(ready) frame.current?.contentWindow?.postMessage({type:"admin-wizard-navigate",step:previewStep,venue},window.location.origin);
  },[ready,previewStep,venue]);
  useEffect(()=>{
    function receive(event:MessageEvent){
      if(!ready || event.origin!==window.location.origin || event.source!==frame.current?.contentWindow || event.data?.type!=="wizard-preview-step")return;
      const step=event.data.step;
      if(!Number.isInteger(step)||step<1||step>9)return;
      const group=step<=2?step-1:step<=7?2:3;
      const sub=group===2?[3,4,5,6,7].indexOf(step):group===3?step-8:group===1?(event.data.venue==="simultaneous"?2:event.data.venue==="medium-hall"?1:0):0;
      if(group!==section)onSectionChange(group);
      if(group!==section || sub!==subIndex)onSubChange(sub);
    }
    window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
  },[ready,section,subIndex,onSectionChange,onSubChange]);
  useEffect(()=>{
    frame.current?.contentWindow?.postMessage({type:"admin-wizard-select-mode",enabled:selectMode},window.location.origin);
  },[selectMode,ready]);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin || event.source!==frame.current?.contentWindow || event.data?.type!=="wizard-preview-select")return;
      const {kind,key}=event.data;
      if(!["text","heading","group"].includes(kind)||typeof key!=="string")return;
      if(kind==="text")setQuery(typeof event.data.label==="string" ? event.data.label : key);
      setSelected({kind,key});
    };
    window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
  },[]);
  useEffect(()=>{
    if(!selected)return;
    const target=Array.from(inspector.current?.querySelectorAll<HTMLElement>("[data-editor-key]")??[]).find(el=>el.dataset.editorKey===selected.key) ?? Array.from(inspector.current?.querySelectorAll<HTMLElement>("[data-editor-key]")??[]).find(el=>selected.kind==="group" && selected.key.startsWith(`${el.dataset.editorKey}.`));
    if(!target)return;
    let parent=target.parentElement;
    while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
    const timer=requestAnimationFrame(()=>{target.scrollIntoView({block:"center",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});target.querySelector<HTMLElement>("textarea,input,button")?.focus({preventScroll:true});});
    return()=>cancelAnimationFrame(timer);
  },[selected,query]);
  const hasControls=Children.toArray(controls).length>0 || (section===1&&subIndex===0) || (section===2&&subIndex===2);
  return <div className={s.workspace}>
    <div className={s.heading}><div><h2>위저드 미리보기 · 수정</h2><p>미리보기에서 편집할 문구나 영역을 선택하세요. 관련 편집창이 자동으로 열립니다.</p></div><button type="button" onClick={()=>void frame.current?.requestFullscreen()}>미리보기 확대 ↗</button></div>
    <div className={s.layout}>
      <div className={s.preview}>
        <div className={s.previewTools}><strong>신청자 화면</strong><div role="group" aria-label="미리보기 화면 크기"><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>데스크톱</button><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>모바일</button></div><div role="group" aria-label="미리보기 조작 모드"><button type="button" aria-pressed={selectMode} onClick={()=>setSelectMode(true)}>영역 선택</button><button type="button" aria-pressed={!selectMode} onClick={()=>setSelectMode(false)}>화면 사용</button></div><span>{ready ? "수정 내용 실시간 반영" : "화면 불러오는 중"}</span></div>
        <div className={s.canvas}><iframe ref={frame} className={mobile ? s.mobile : s.desktop} title="실제 대관 신청 위저드 미리보기" src={frameUrl} /></div>
      </div>
      <aside ref={inspector} className={s.inspector} onClick={event=>{
        const target=event.target instanceof Element ? event.target.closest<HTMLElement>("[data-editor-key]") : null;
        if(target?.dataset.editorKey)frame.current?.contentWindow?.postMessage({type:"admin-wizard-focus",key:target.dataset.editorKey},window.location.origin);
      }} onKeyUp={event=>{
        if(event.key!=="Tab")return;
        const target=event.target instanceof Element ? event.target.closest<HTMLElement>("[data-editor-key]") : null;
        if(target?.dataset.editorKey)frame.current?.contentWindow?.postMessage({type:"admin-wizard-focus",key:target.dataset.editorKey},window.location.origin);
      }}>
        <div className={s.inspectorHeading}><span>문구 수정</span><h3>{sections[section].label}</h3><p>선택한 영역의 제목과 안내 문구입니다. 저장하면 적용됩니다.</p></div>
        <label className={s.sectionPicker}>수정할 영역<select value={section} onChange={event => onSectionChange(Number(event.target.value))}>{sections.map((item, index) => <option key={item.label} value={index}>{String(index + 1).padStart(2, "0")} · {item.label}</option>)}</select></label>
        {subLabels.length>1 && <label className={s.sectionPicker}>세부 화면<select value={subIndex} onChange={event=>onSubChange(Number(event.target.value))}>{subLabels.map((label,index)=><option key={label} value={index}>{label}</option>)}</select></label>}
        <div className={s.fields}>{visibleHeadings.map(([key, label]) => <label key={key} data-editor-key={key}>{label}{key.startsWith("audience") && <small>현재는 신청자 정보에 통합되어 이 제목·안내가 표시되지 않습니다.</small>}<textarea rows={key.endsWith("Lead") ? 4 : 2} value={content.wizardSteps[key]} onChange={event => patch({ wizardSteps: { ...content.wizardSteps, [key]: event.target.value } })} /></label>)}</div>
        <details className={`${s.controlGroup} ${s.textFinder}`}><summary>문구 찾기</summary><p className={s.finderHint}>화면에 표시되는 문구와 입력 안내를 찾아 수정합니다.</p><div className={s.searchBox}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="문구 검색" value={query} onChange={event=>setQuery(event.target.value)} placeholder="제목 또는 문구 검색" />{query && <button type="button" aria-label="검색어 지우기" onClick={()=>setQuery("")}>×</button>}</div><p className={s.resultCount}>{query ? "전체 단계 검색 결과" : "현재 단계의 문구"} <strong>{strings.length}개</strong></p>{strings.length===0 && <p className={s.emptyResult}>일치하는 문구가 없습니다.<br/>다른 검색어를 입력해 주세요.</p>}<div className={s.stringFields}>{strings.map(([key,fallback])=><label key={key} data-editor-key={key}><span>{textFieldLabel(key)}</span><textarea rows={2} value={content.wizardStrings[key] ?? fallback} onChange={event=>patch({wizardStrings:{...content.wizardStrings,[key]:event.target.value}})} /></label>)}</div></details>
        {hasControls && <details className={s.controlGroup}><summary>항목 구성 · 순서 · 노출</summary><div className={s.advanced}>{controls}
          {section===1 && subIndex===0 && <label><input type="checkbox" checked={!content.wizardDisabledFields.includes("configOptions.arenaSummaryLead")} onChange={event=>patch({wizardDisabledFields:event.target.checked?content.wizardDisabledFields.filter(key=>key!=="configOptions.arenaSummaryLead"):[...content.wizardDisabledFields,"configOptions.arenaSummaryLead"]})}/>아레나 제목 아래 안내 표시</label>}
          {section===2 && subIndex===2 && PUBLIC_INTEREST_GROUPS.map(group=><div key={group.key}><label><input type="checkbox" checked={!content.publicInterestDisabledGroups.includes(group.key)} onChange={event=>patch({publicInterestDisabledGroups:event.target.checked?content.publicInterestDisabledGroups.filter(key=>key!==group.key):[...content.publicInterestDisabledGroups,group.key]})}/>{group.label}</label>{group.items.map(item=><label key={item}><input type="checkbox" checked={!content.publicInterestDisabledItems.includes(item)} onChange={event=>patch({publicInterestDisabledItems:event.target.checked?content.publicInterestDisabledItems.filter(key=>key!==item):[...content.publicInterestDisabledItems,item]})}/>{PUBLIC_INTEREST_ITEM_LABEL[item]}</label>)}</div>)}
        </div></details>}
      </aside>
    </div>
  </div>;
}
