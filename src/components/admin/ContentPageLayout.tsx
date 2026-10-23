"use client";
import { Children, Fragment, isValidElement, useState, type ReactNode } from "react";
import styles from "./ContentEditor.module.css";

const pages: Record<string,string> = {screenText:"화면 문구",seoularena:"서울아레나",features:"시설 제원",guide:"대관 절차",rates:"대관료",rules:"대관 규약",documents:"대관 자료"};
function flatten(nodes:ReactNode):ReactNode[] {
  return Children.toArray(nodes).flatMap(node => isValidElement<{children?:ReactNode}>(node) && node.type === Fragment ? flatten(node.props.children) : [node]);
}
function summarize(value:unknown):string[] {
  if (typeof value === "string") return value.trim() && !/^(https?:|\/)/.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(summarize).slice(0,3);
  if (value && typeof value === "object") return Object.entries(value).filter(([key])=> !/image|href|url|color|id/i.test(key)).flatMap(([,entry])=>summarize(entry)).slice(0,3);
  return [];
}
function excerpts(nodes:ReactNode):string[] {
  return Children.toArray(nodes).flatMap(node => {
    if (!isValidElement<{value?:unknown;children?:ReactNode;items?:unknown[]}>(node)) return [];
    const {value,children,items} = node.props;
    if(typeof value === "string" && value.trim() && !value.startsWith("/")) return [value];
    if(items) return [`등록된 항목 ${items.length}개`, ...summarize(items).slice(0,2)];
    if(value && typeof value === "object") return summarize(value);
    return children ? excerpts(children) : [];
  }).slice(0,3);
}
export function ContentPageLayout({page,children}:{page:string;children:ReactNode}) {
  const [selected,setSelected] = useState(0);
  if(!pages[page] || (page==="screenText" && flatten(children).length===1)) return <>{children}</>;
  const sections = flatten(children);
  const active = Math.min(selected, sections.length-1);
  return <div className={styles.workspace}>
    <header className={styles.header}><div><h2>{pages[page]} {page==="screenText" ? "편집" : "페이지 편집"}</h2><p>{page==="screenText" ? "왼쪽에서 사용 위치를 선택하면 해당 화면에 표시되는 문구를 수정할 수 있습니다." : "구성도에서 수정할 영역을 선택하세요. 위치와 문구를 요약해 보여줍니다."}</p></div>{page!=="screenText" && <a href={`/${page}`} target="_blank" rel="noreferrer">공개 페이지 보기 ↗</a>}</header>
    <div className={styles.layout}>
      <aside className={`${styles.map} ${page==="screenText" ? styles.locationMap : ""}`} aria-label={`${pages[page]} 페이지 구성도`}><div className={styles.mapHeading}><strong>{page==="screenText" ? "문구 사용 위치" : "페이지 구성"}</strong><span>{page==="screenText" ? "화면별로 선택하여 수정" : "영역별 편집 위치 · 실제 화면의 축약 구성"}</span></div>
        {sections.map((section,index)=>{
          const props=isValidElement<{title?:string;help?:string;children?:ReactNode}>(section)?section.props:{};
          return <button key={index} type="button" className={styles.previewBlock} aria-pressed={active===index} onClick={()=>setSelected(index)}><span className={styles.location}>{String(index+1).padStart(2,"0")} · {props.title?.includes("탭")?"공간별 탭":"콘텐츠 영역"}</span><strong>{props.title ?? "페이지 설정"}</strong>{props.help && <span className={styles.excerpt}>{props.help}</span>}{page!=="screenText" && excerpts(props.children).map((text,i)=><span key={i} className={styles.excerpt}>{text}</span>)}</button>;
        })}
      </aside>
      <div className={styles.inspector}><div className={styles.inspectorHeading}><span>{pages[page]} / 선택 영역 {active+1}</span><strong>선택한 영역 편집</strong></div>{sections.map((section,index)=><div key={index} hidden={active!==index} className={styles.sectionBody}>{section}</div>)}</div>
    </div>
  </div>;
}
