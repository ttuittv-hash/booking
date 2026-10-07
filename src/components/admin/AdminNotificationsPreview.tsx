"use client";
import { useRef, useState } from "react";
import { ContentTransport, type ContentRequest } from "./ContentTransport";
import { NotificationRulesManager } from "./NotificationRulesManager";
import { notificationPreviewSeed } from "./notificationPreviewSeed";
import styles from "./AdminNotificationsPreview.module.css";

export function AdminNotificationsPreview() {
  const rules = useRef([...notificationPreviewSeed]);
  const [message, setMessage] = useState("");
  const request: ContentRequest = async (url, init) => {
    const id = url.split("/").pop();
    if (init?.method === "DELETE") {
      rules.current = rules.current.filter(rule => rule.id !== id);
      setMessage("시안에서 트리거를 삭제했습니다.");
      return Response.json({ok:true});
    }
    const draft = JSON.parse(String(init?.body ?? "{}"));
    const existing = rules.current.find(rule => rule.id === id);
    const rule = {...(existing ?? {id:crypto.randomUUID(),typeCode:"CUSTOM",isSystem:false,createdAt:new Date().toISOString()}), ...draft, updatedAt:new Date().toISOString()};
    rules.current = existing ? rules.current.map(item => item.id === id ? rule : item) : [...rules.current, rule];
    setMessage("시안에 저장했습니다. 실제 알림 설정과 발송에는 반영되지 않습니다.");
    return Response.json({rule});
  };
  return <div className={styles.preview}>
    <p className={styles.lead}>신청자·운영자에게 자동으로 나가는 알림의 조건과 문구를 관리합니다. 받은 알림 자체는 종 아이콘의 알림함에서 확인할 수 있습니다.</p>
    <p className={styles.note}>원본 기본값을 사용한 디자인 시안입니다. 수정·저장·삭제는 이 화면에만 반영됩니다.</p>
    {message && <p role="status" className={styles.message}>{message}</p>}
    <ContentTransport.Provider value={{request,isPreview:true}}><NotificationRulesManager initialRules={notificationPreviewSeed}/></ContentTransport.Provider>
  </div>;
}
