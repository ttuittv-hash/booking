import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getInquiryById } from "@/lib/db";
import { Badge, Label } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import { AnswerInquiryForm } from "@/components/AnswerInquiryForm";
import { HELP, LINK_BTN, PANEL, SECTION_TITLE } from "@/components/admin/adminUi";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { id } = await params;
  const inquiry = getInquiryById(id);
  if (!inquiry) notFound();
  const author = findUserById(inquiry.userId);

  const answered = inquiry.status === "ANSWERED";

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/inquiries" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:py-10">
        <Link href="/admin/inquiries" className={LINK_BTN}>
          ← 1:1 문의
        </Link>

        <header className="mt-5 border-b border-border/20 pb-6">
          <Label className="mb-3 text-muted">Inquiry</Label>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="type-kr-heading text-h5-m sm:text-h5">{inquiry.title}</h1>
            <Badge tone={answered ? "good" : "warn"}>
              {answered ? "답변 완료" : "답변 대기"}
            </Badge>
          </div>
          <p className="mt-2 text-s text-muted">
            {author?.name ?? "-"} ({author?.companyName ?? "-"}, {author?.email ?? "-"}) ·{" "}
            <span className="tabular-nums">
              {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
            </span>
          </p>
        </header>

        <div className={`mt-6 ${PANEL}`}>
          <h2 className={SECTION_TITLE}>문의 내용</h2>
          <p className="mt-3 whitespace-pre-wrap text-s leading-7">{inquiry.content}</p>
        </div>

        <div className="mt-6">
          {inquiry.answer ? (
            <div className={PANEL}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-l-2 border-accent pl-3">
                <h2 className={SECTION_TITLE}>등록된 답변</h2>
                {inquiry.answeredAt && (
                  <p className={`tabular-nums ${HELP}`}>
                    {new Date(inquiry.answeredAt).toLocaleString("ko-KR")}
                  </p>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-s leading-7">{inquiry.answer}</p>
            </div>
          ) : (
            <AnswerInquiryForm inquiryId={inquiry.id} />
          )}
        </div>
      </main>
    </div>
  );
}
