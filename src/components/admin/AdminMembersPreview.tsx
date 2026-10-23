"use client";
import { useState } from "react";
import { btnClass } from "@/components/admin/adminButton";
import { useDialog } from "@/components/ui/Dialog";
import { Pagination } from "@/components/Pagination";
import editor from "./AdminEditor.module.css";
import { FIELD, FIELD_LABEL, TABLE, TH, TD, THEAD_ROW, TR_HOVER, REMOVE_BTN } from "./adminUi";
import s from "./AdminMembersPreview.module.css";

type Status = "PENDING" | "HOLD" | "APPROVED" | "REJECTED";
export type Member = {id:string;name:string;company:string;brn:string;email:string;date:string;order:number;status:Status;master:boolean};
export const memberSamples:Member[] = [
 {id:"sample-1",name:"김담당",company:"아레나기획",brn:"000-00-00001",email:"arena@example.com",date:"2026.10.02",order:1,status:"PENDING",master:false},
 {id:"sample-2",name:"이담당",company:"아레나기획",brn:"000-00-00001",email:"live@example.com",date:"2026.10.02",order:2,status:"PENDING",master:false},
 {id:"sample-3",name:"박담당",company:"한강문화",brn:"000-00-00002",email:"hangang@example.com",date:"2026.10.01",order:1,status:"HOLD",master:false},
];
const labels:Record<Status,string>={PENDING:"일반인 (승인 대기)",HOLD:"보류 중",APPROVED:"기본 (승인됨)",REJECTED:"거절됨"};
export function AdminMembersPreview({members,setMembers}:{members:Member[];setMembers:React.Dispatch<React.SetStateAction<Member[]>>}){
 const [tab,setTab]=useState("승인 대기");
 const [companyQuery,setCompanyQuery]=useState("");
 const [selectedCompany,setSelectedCompany]=useState<string|null>(null);
 const [policy,setPolicy]=useState(true);
 const dialog=useDialog();
 const pending=tab!=="처리 완료";
 const rows=members.filter(m=>tab==="승인 대기"?m.status==="PENDING":tab==="보류"?m.status==="HOLD":m.status==="APPROVED"||m.status==="REJECTED").sort((a,b)=>a.company.localeCompare(b.company,"ko")||a.name.localeCompare(b.name,"ko")||a.id.localeCompare(b.id));
 async function decide(m:Member,status:Status){
  const first=!members.some(x=>x.company===m.company&&x.status==="APPROVED");
  if(status==="REJECTED") {if(!await dialog.prompt("반려 사유를 입력해주세요.\n신청자에게 그대로 안내됩니다.",{title:"가입 반려",okLabel:"반려",placeholder:"예: 사업자 정보가 확인되지 않습니다",multiline:true}))return;}
  else if(!await dialog.confirm(status==="HOLD"?`${m.name}님을 보류할까요?\n“보류” 탭으로 옮겨지며, 언제든 다시 승인·반려할 수 있습니다.`:first?`${m.name}님은 ${m.company}의 첫 승인 대상입니다.\n승인하면 이 분이 대표 담당자로 지정됩니다.\n대표 담당자는 소속 담당자를 초대하고 합류 신청을 승인·반려할 수 있습니다.\n\n대표 담당자로 지정하며 승인할까요?`:`${m.name}님을 승인할까요?`,{title:status==="HOLD"?"가입 보류":first?"대표 담당자 지정":"가입 승인",okLabel:status==="HOLD"?"보류":"승인"}))return;
  setMembers(prev=>prev.map(x=>x.id===m.id?{...x,status,master:status==="APPROVED"&&first}:x));
 }
 async function remove(m:Member){
  if(!await dialog.confirm(`${m.name}(${m.email}) 계정을 기록째 삭제합니다.\n\n이 사람의 신청서·알림 이력·초대가 함께 지워지고, 회사에 남는 담당자가 없으면 회사 정보도 지워집니다.\n삭제하면 같은 명의·휴대폰으로 처음부터 다시 가입할 수 있습니다.\n\n계속할까요?`,{title:"계정 삭제",okLabel:"삭제"}))return;
  if(m.status==="APPROVED"&&await dialog.prompt("승인된 계정입니다.\n정말 지우려면 담당자명을 그대로 입력하세요.",{title:"삭제 확인",okLabel:"삭제",placeholder:m.name})!==m.name)return;
  setMembers(prev=>prev.filter(x=>x.id!==m.id));
 }
 return <div className={`${editor.workspace} ${s.members}`}>
  <p className={s.lead}>신청자(대관사) 계정은 운영자 승인이 있어야 대관 패키지 안내와 견적 산출을 이용할 수 있습니다. 회사에서 <b>가장 먼저 승인된 분</b>이 대표 담당자가 되고, 이후 합류한 분은 소속 담당자가 됩니다. 아직 아무도 승인되지 않은 회사는 대표 담당자가 “미지정”으로 표시되며, 그 회사의 첫 승인은 운영자가 처리합니다.</p>
  <section className={`${editor.section} ${editor.paddedSection}`}><div className={s.policy}><div><h2 className={editor.title}>초대 담당자도 서울아레나가 승인</h2><p>{policy?"켜짐 — 대표 담당자가 초대한 사람도 승인 대기 목록에 올라옵니다. 운영자가 승인해야 이용할 수 있습니다.":"꺼짐 — 대표 담당자가 초대한 사람은 가입하는 즉시 이용할 수 있습니다."}</p></div><button className={`${btnClass(policy ? "primary" : "secondary", "md")} ${editor.actionButton}`} aria-pressed={policy} onClick={()=>setPolicy(!policy)}>{policy?"켜짐":"꺼짐"}</button></div></section>
  <nav className={editor.venueTabs} aria-label="회원 관리 탭">{["승인 대기","보류","처리 완료","회사별 담당자"].map(t=><button key={t} aria-pressed={t===tab} onClick={()=>setTab(t)}>{t}{(t==="승인 대기"||t==="보류")&&` (${members.filter(m=>m.status===(t==="보류"?"HOLD":"PENDING")).length.toLocaleString("ko-KR")})`}</button>)}</nav>
  {tab==="회사별 담당자"?<section className={`${editor.section} ${editor.paddedSection}`}><h2 className={editor.title}>회사별 담당자</h2><p>회사를 선택하면 소속 담당자와 승인 상태를 확인할 수 있습니다.</p>
<label className="mt-5 block"><span className={FIELD_LABEL}>회사 검색</span><input className={FIELD} value={companyQuery} onChange={e=>setCompanyQuery(e.target.value)} placeholder="회사명 또는 사업자등록번호" /></label>
<div className={s.scroll}><table className={TABLE}><thead><tr className={THEAD_ROW}>{["회사명","사업자등록번호","대표 담당자","담당자 수","승인 대기"].map(t=><th className={TH} key={t}>{t}</th>)}</tr></thead><tbody>{[...new Set(members.map(m=>m.company).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko")).filter(name=>members.some(m=>m.company===name&&(name.includes(companyQuery)||m.brn.includes(companyQuery)))).map(name=>{const group=members.filter(m=>m.company===name);return <tr key={name} className={`${TR_HOVER} cursor-pointer`} onClick={()=>setSelectedCompany(name)}><td className={TD}><button onClick={()=>setSelectedCompany(name)}>{name}</button></td><td className={TD}>{group[0].brn||"—"}</td><td className={TD}>{group.find(m=>m.master)?.name||"미지정"}</td><td className={TD}>{group.length}</td><td className={TD}>{group.filter(m=>m.status==="PENDING").length}</td></tr>;})}</tbody></table></div>
{selectedCompany&&<div className={editor.optionPanel}><h3 className={editor.title}>{selectedCompany} 담당자</h3>{members.filter(m=>m.company===selectedCompany).map(m=><div key={m.id} className="mt-4 flex flex-wrap items-center justify-between gap-3"><span>{m.name} · {m.email}</span><span>{labels[m.status]}</span>{(m.status==="PENDING"||m.status==="HOLD")&&<select className={FIELD} aria-label={`${m.name} 상태 변경`} value="" onChange={e=>void decide(m,e.target.value as Status)}><option value="" disabled>상태 변경</option><option value="APPROVED">승인</option><option value="HOLD">보류</option><option value="REJECTED">거절</option></select>}</div>)}</div>}
</section>:<section className={`${editor.section} ${editor.paddedSection}`}><h2 className={editor.title}>{tab} ({rows.length})</h2><p>{tab==="보류"?"승인·반려를 뒤로 미룬 신청입니다. 승인하거나 반려하면 이 목록에서 빠집니다.":pending?"승인해야 대관 패키지 안내와 견적 산출을 이용할 수 있습니다.":"이미 승인하거나 거절한 신청자 계정입니다."}</p><div className={s.scroll}><table className={TABLE}><thead><tr className={THEAD_ROW}>{["담당자명","회사명","사업자등록번호","이메일","가입일",...(pending?["가입순","대표 지정"]:["구분","처리자"]),"상태",...(pending?["상태 변경"]:[]),""].map((h,i)=><th key={i} className={TH}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map(m=><tr key={m.id} className={TR_HOVER}><td className={TD}><button className={s.link} onClick={()=>dialog.alert("회원 상세 화면은 다음 검토 단계에서 원본 기준으로 연결합니다.",{title:m.name})}>{m.name}</button></td><td className={TD}>{m.company}</td><td className={TD}>{m.brn}</td><td className={TD}>{m.email}</td><td className={TD}>{m.date}</td>{pending?<><td className={TD}>{m.order}번째</td><td className={TD}>{!members.some(x=>x.company===m.company&&x.status==="APPROVED")?<span className="admin-tag" data-tone="representative">대표 지정</span>:"—"}</td></>:<><td className={TD}>{m.status==="APPROVED"?(m.master?<span className="admin-tag" data-tone="representative">대표 담당자</span>:<span className="admin-tag" data-tone="staff">소속 담당자</span>):"—"}</td><td className={TD}>admin · 운영자</td></>}<td className={TD}><span className="admin-tag" data-tone={{PENDING:"pending",HOLD:"hold",APPROVED:"approved",REJECTED:"rejected"}[m.status]}>{labels[m.status]}</span></td>{pending&&<td className={TD}><select className={`${FIELD} ${s.statusSelect}`} aria-label={`${m.name} 상태 변경`} value="" onChange={e=>{const next=e.target.value as Status;if(next)void decide(m,next);}}><option value="" disabled>선택</option><option value="REJECTED">거절</option>{tab!=="보류"&&<option value="HOLD">보류</option>}<option value="APPROVED">승인</option></select></td>}<td className={TD}><button className={REMOVE_BTN} onClick={()=>remove(m)}>삭제</button></td></tr>):<tr><td colSpan={pending?10:9} className={s.empty}>{pending?"승인 대기 중인 신청이 없습니다.":"처리 내역이 없습니다."}</td></tr>}</tbody></table></div><Pagination page={1} totalPages={1} total={rows.length} basePath="/admin/applicants" /></section>}
  {tab==="승인 대기"&&<section className={`${editor.section} ${editor.paddedSection}`}><h2 className={editor.title}>회원 추가 (테스트/직원 계정)</h2><p>운영자가 직접 신청자(대관사) 계정을 생성합니다. 별도 승인 절차 없이 즉시 승인 완료 상태로 만들어지며, 비밀번호는 안전한 채널로 직접 전달해야 합니다.</p><form onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);const name=String(data.get("name"));const company=String(data.get("company"));setMembers(prev=>[...prev,{id:`sample-${Date.now()}`,name,company,brn:String(data.get("brn")),email:String(data.get("email")),date:"2026.10.02",order:1,status:"APPROVED",master:!!company&&!prev.some(x=>x.company===company&&x.status==="APPROVED")}]);form.reset();void dialog.alert(`${data.get("username")} 계정이 승인 완료 상태로 생성되었습니다.\n(예시 데이터에만 반영됩니다.)`);}}><div className={s.formGrid}>{[["username","아이디 (5~20자의 영문·숫자)","text"],["email","이메일","email"],["name","담당자명","text"],["password","임시 비밀번호 (8자 이상)","password"],["phone","휴대폰 번호 (선택)","tel"],["company","회사/기획사명 (선택, 비워두면 소속 없음)","text"],["brn","사업자등록번호 (회사명 입력 시, 선택)","text"]].map(([name,label,type],i)=><label key={name}><span className={FIELD_LABEL}>{label}</span><input name={name} type={type} aria-label={label} placeholder={label} className={FIELD} required={i<4} minLength={name==="password"?8:undefined} pattern={name==="username"?"[A-Za-z0-9]{5,20}":undefined}/></label>)}</div><div className={editor.saveBar}><button className={editor.saveButton} type="submit">회원 계정 생성</button></div></form></section>}
  <p className={s.note}>예시 데이터로 구성한 첫 화면 시안입니다. 변경은 이 화면에서만 적용되며 실제 회원·승인 정책·알림에는 반영되지 않습니다.</p>
 </div>;
}
