"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { WizardShell } from "./WizardShell";
import { WizardTextProvider } from "@/lib/content/wizardText";
import { buildBookingPreviewRates, previewScreenText, previewLiveHallContent } from "./bookingPreviewData";

import type { ScreenTextContent, VenueRateContent } from "@/lib/content/pageContent";

import s from "./BookingPreview.module.css";
import design from "./WizardDesign.module.css";

/** Uses the production forms, pricing and validation. Only storage/submission are isolated. */
export function BookingPreview({editorMode = false}: {editorMode?: boolean}) {
  const [selectMode,setSelectMode]=useState(editorMode);
  const root=useRef<HTMLDivElement>(null);
  const [rateTable, setRateTable] = useState(buildBookingPreviewRates);
  const [text, setText] = useState<ScreenTextContent>(previewScreenText);
  const textFields=useRef<Record<string,string>>({});
  const lookup=useCallback((key:string,fallback:string)=>{textFields.current[key]=fallback;},[]);
  useEffect(()=>{
    if(!editorMode)return;
    let last="";
    const timer=window.setInterval(()=>{const next=JSON.stringify(textFields.current);if(next!==last){last=next;window.parent.postMessage({type:"wizard-preview-fields",fields:textFields.current},window.location.origin);}},300);
    return()=>window.clearInterval(timer);
  },[editorMode]);
  const [liveHall,setLiveHall]=useState<VenueRateContent>(previewLiveHallContent);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent || window.parent === window) return;
      if(event.data?.type === "admin-wizard-select-mode")setSelectMode(event.data.enabled===true);
      if (event.data?.type === "admin-wizard-preview" && event.data.content?.wizardSteps && event.data.content?.wizardStrings) {
        setText(event.data.content);
        if(event.data.rateTable?.packages) setRateTable(event.data.rateTable);
        if(event.data.liveHallRateContent) setLiveHall(event.data.liveHallRateContent);
      }
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "wizard-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [editorMode]);
  useEffect(()=>{
    if(!editorMode)return;
    function receive(event:MessageEvent){
      if(event.origin!==window.location.origin || event.source!==window.parent || event.data?.type!=="admin-wizard-focus" || typeof event.data.key!=="string")return;
      const key=event.data.key as string;
      const fieldKey=key.replace(/^validationMessage\./, "");
      const nodes=Array.from(root.current?.querySelectorAll<HTMLElement>("[data-field-key], [data-wizard-text], [data-preview-group], [data-preview-heading], [data-preview-slot]")??[]);
      const matches=(node:HTMLElement,value:string)=>[node.dataset.fieldKey,node.dataset.wizardText,node.dataset.previewGroup,node.dataset.previewHeading,node.dataset.previewSlot].includes(value);
      let target=nodes.find(node=>matches(node,key)) || nodes.find(node=>matches(node,fieldKey));
      // Conditional fields may not be present until an option is chosen. Show their nearest visible group.
      let parentKey=fieldKey;
      while(!target && parentKey.includes(".")){
        parentKey=parentKey.slice(0,parentKey.lastIndexOf("."));
        target=nodes.find(node=>matches(node,parentKey));
      }
      if(!target){
        const value=text.wizardStrings[key] ?? textFields.current[key] ?? text.wizardSteps[key as keyof typeof text.wizardSteps];
        if(value)target=Array.from(root.current?.querySelectorAll<HTMLElement>("h2,h3,p,label,input,textarea,button,span")??[]).find(node=>node.textContent?.trim()===value || node.getAttribute("placeholder")===value || node.getAttribute("aria-label")===value);
      }
      if(!target && key.startsWith("slot."))target=root.current?.querySelector<HTMLElement>("[data-preview-group]")??undefined;
      if(!target)return;
      let ancestor:HTMLElement|null=target;
      while(ancestor){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement;}
      root.current?.querySelectorAll("[data-editor-selected]").forEach(node=>node.removeAttribute("data-editor-selected"));
      target.setAttribute("data-editor-selected", "");
      const selectedTarget=target;
      requestAnimationFrame(()=>window.scrollTo({top:window.scrollY+selectedTarget.getBoundingClientRect().top-Math.max(24,(window.innerHeight-selectedTarget.getBoundingClientRect().height)/2),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
    }
    window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
  },[editorMode,text]);
  useEffect(()=>{
    if(!editorMode || !selectMode)return;
    function select(event:MouseEvent){
      if(!(event.target instanceof Element))return;
      const target=event.target;
      const textNode=target.closest<HTMLElement>("[data-wizard-text]");
      const group=target.closest<HTMLElement>("[data-field-key], [data-preview-group]");
      const groupKey=group?.dataset.previewGroup || group?.dataset.fieldKey;
      const value=target.textContent?.trim();
      const heading=target.closest<HTMLElement>("[data-preview-heading]")?.dataset.previewHeading || (target.closest("h2,h3,p") ? Object.entries(text.wizardSteps).find(([,v])=>v && v===value)?.[0] : undefined);
      const attribute=target.getAttribute("placeholder") || target.getAttribute("aria-label");
      const textKey=Object.entries(textFields.current).find(([key,fallback])=>(text.wizardStrings[key]??fallback)===(attribute||value))?.[0];
      const key=heading || textNode?.dataset.wizardText || textKey || groupKey;
      if(!key)return;
      event.preventDefault();event.stopPropagation();
      root.current?.querySelectorAll("[data-editor-selected]").forEach(el=>el.removeAttribute("data-editor-selected"));
      (textNode||group||target).setAttribute("data-editor-selected","");
      window.parent.postMessage({type:"wizard-preview-select",kind:heading?"heading":textNode||textKey?"text":"group",key,label:text.wizardStrings[key] || textFields.current[key] || value},window.location.origin);
    }
    const node=root.current;node?.addEventListener("click",select,true);
    return()=>node?.removeEventListener("click",select,true);
  },[editorMode,selectMode,text]);
  return <div ref={root} data-editor-select-mode={selectMode || undefined} className={`${s.shell} ${s.complete} ${design.theme}`}>
    <header className={s.header}><Link href="/" prefetch={false}>SEOUL ARENA<span>대관 신청</span></Link><span className={s.preview}>디자인 미리보기</span></header>
    <div className={s.previewNotice}>로컬 미리보기 · 원본 코드의 전체 신청 흐름과 기본 콘텐츠를 사용합니다. 일정·요금은 검토용이며, 제출과 첨부는 서버로 전송되지 않습니다.</div>
    <WizardTextProvider selectable={editorMode} overrides={text.wizardStrings} onLookup={editorMode ? lookup : undefined}>
      <WizardShell editorPreview={editorMode} startFresh={editorMode} designPreview rateTable={rateTable} currentUser={null}
        weekDemand={[]} dateBlocks={[{date:"2027-07-20",venueId:"arena",reason:"선택 불가 예시"},{date:"2027-07-15",venueId:"medium-hall",reason:"선택 불가 예시"}]}
        applicantPrefill={{companyName:"미리보기 기획사",businessRegistrationNumber:"000-00-00000",representativeName:"예시 대표",contactName:"",contactPhone:"",contactEmail:""}}
        liveHallRateContent={liveHall} wizardStepText={text.wizardSteps}
        wizardSlotOrders={text.wizardSlotOrders} publicInterestDisabledItems={text.publicInterestDisabledItems}
        publicInterestDisabledGroups={text.publicInterestDisabledGroups} wizardFieldOrders={text.wizardFieldOrders}
        wizardDisabledFields={text.wizardDisabledFields} wizardCustomOptions={text.wizardCustomOptions}
        calendarMonthBounds={{start:"2027-07",end:"2027-12"}} />
    </WizardTextProvider>
  </div>;
}
