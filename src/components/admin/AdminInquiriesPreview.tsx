"use client";
import { useState } from "react";
import { AnswerInquiryForm } from "@/components/AnswerInquiryForm";
import { Pagination } from "@/components/Pagination";
import { ContentTransport, type ContentRequest } from "./ContentTransport";
import { PANEL, TABLE, THEAD_ROW, TH, TD, TR_HOVER } from "./adminUi";
import editor from "./AdminEditor.module.css";
import styles from "./AdminInquiriesPreview.module.css";

export type Inquiry = {id:string;title:string;name:string;company:string;email:string;createdAt:string;content:string;contactName:string;contactEmail:string;contactPhone:string;answer:string;answeredAt:string};
export const inquirySamples: Inquiry[] = [
  {id:"inquiry-1",title:"아레나 대관 일정 확인 문의",name:"김담당",company:"아레나기획",email:"arena@example.com",createdAt:"2026.10.02 · 14:30",content:"2027년 3월 공연을 준비하고 있습니다.\n준비일과 철수일을 포함한 대관 일정 확인 방법을 안내 부탁드립니다.",contactName:"김담당",contactEmail:"arena@example.com",contactPhone:"010-0000-0001",answer:"",answeredAt:""},
  {id:"inquiry-2",title:"중형공연장 부대시설 이용 문의",name:"박담당",company:"한강문화",email:"hangang@example.com",createdAt:"2026.10.02 · 11:10",content:"중형공연장 패키지에 포함된 부대시설과 추가 선택 항목을 확인하고 싶습니다.",contactName:"이실무",contactEmail:"staff@example.com",contactPhone:"010-0000-0002",answer:"",answeredAt:""},
  {id:"inquiry-3",title:"대관 신청 자료 확인 문의",name:"이담당",company:"서울라이브",email:"live@example.com",createdAt:"2026.10.01 · 16:00",content:"대관 신청 전에 준비할 자료는 어디서 확인할 수 있나요?",contactName:"이담당",contactEmail:"live@example.com",contactPhone:"010-0000-0003",answer:"대관 안내의 대관자료 페이지에서 관련 자료를 확인해 주세요.\n추가로 확인할 내용이 있으면 문의를 남겨 주세요.",answeredAt:"2026.10.02 · 09:30"},
];
function Status({answered}:{answered:boolean}) { return <span className="admin-tag" data-tone={answered ? "approved" : "pending"}>{answered ? "답변 완료" : "답변 대기"}</span>; }
export function AdminInquiriesPreview({ inquiries, onChange }: { inquiries: Inquiry[]; onChange: (items: Inquiry[]) => void }) {
  const [page, setPage] = useState(1);
  const pageSize = 2;
  const visibleInquiries = inquiries.slice((page - 1) * pageSize, page * pageSize);
  const [selected,setSelected] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const inquiry = inquiries.find(item=>item.id === selected);
  const request: ContentRequest = async (url,init) => {
    const answer = String(JSON.parse(String(init?.body ?? "{}")).answer ?? "").trim();
    if (!answer) return Response.json({error:"답변 내용을 입력하세요."},{status:400});
    const id = url.split("/").at(-2);
    onChange(inquiries.map(item=>item.id===id ? {...item,answer,answeredAt:new Date().toLocaleString("ko-KR")} : item));
    setMessage("시안에 답변을 등록했습니다. 실제 신청자에게 전송되지 않습니다.");
    return Response.json({ok:true});
  };
  return <div className={`${editor.workspace} ${styles.preview}`}>
    <p className={styles.note}>예시 문의로 구성한 시안입니다. 답변 등록은 이 화면에만 반영되며 실제 알림·메일은 발송되지 않습니다.</p>
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {inquiry ? <>
      <button className={styles.back} onClick={()=>{setSelected(null);setMessage("");}}>← 문의 목록</button>
      <section className={PANEL}>
        <div className={styles.heading}><h2 className={editor.title}>{inquiry.title}</h2><Status answered={!!inquiry.answer}/></div>
        <p className={styles.meta}>{inquiry.name} ({inquiry.company}, {inquiry.email}) · {inquiry.createdAt}</p>
        <div className={styles.body}><h3>문의 내용</h3><p>{inquiry.content}</p></div>
      </section>
      <section className={PANEL}><h2 className={editor.title}>답변받을 곳</h2><dl className={styles.contacts}>{[["이름",inquiry.contactName],["이메일",inquiry.contactEmail],["전화번호",inquiry.contactPhone]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      {inquiry.answer ? <section className={PANEL}><div className={styles.heading}><h2 className={editor.title}>등록된 답변</h2><span className={styles.meta}>{inquiry.answeredAt}</span></div><p className={styles.answer}>{inquiry.answer}</p></section> : <div className={styles.answerForm}><ContentTransport.Provider value={{request,isPreview:true}}><AnswerInquiryForm key={inquiry.id} inquiryId={inquiry.id}/></ContentTransport.Provider></div>}
    </> : <section className={PANEL}>
      <h2 className={editor.title}>문의 목록 ({inquiries.length})</h2><p className={styles.meta}>이 페이지 답변 대기 {visibleInquiries.filter(item=>!item.answer).length}건</p>
      <div className={styles.scroll}><table className={TABLE}><thead><tr className={THEAD_ROW}><th className={TH}>제목</th><th className={TH}>작성자</th><th className={TH}>등록일시</th><th className={TH}>상태</th><th className={TH}><span className={styles.srOnly}>상세 보기</span></th></tr></thead><tbody>{visibleInquiries.map(item=><tr key={item.id} className={`${TR_HOVER} cursor-pointer`} onClick={event => { if ((event.target as HTMLElement).closest("button,a") || window.getSelection()?.toString()) return; setSelected(item.id); }}><td className={TD}><button className={styles.title} onClick={()=>setSelected(item.id)}>{item.title}</button></td><td className={TD}>{item.name}<small>{item.company}</small></td><td className={styles.date}>{item.createdAt}</td><td className={TD}><Status answered={!!item.answer}/></td><td className={TD}><button className={styles.back} aria-label={`${item.title} 상세`} onClick={()=>setSelected(item.id)}>상세 →</button></td></tr>)}</tbody></table></div>
      <div onClickCapture={event => {
        const link = (event.target as HTMLElement).closest("a");
        if (!link) return;
        event.preventDefault();
        const next = Number(new URL(link.href).searchParams.get("page") || "1");
        setPage(next);
      }}>
        <Pagination page={page} totalPages={Math.ceil(inquiries.length / pageSize)} total={inquiries.length} basePath="/admin/inquiries" />
      </div>
    </section>}
  </div>;
}
