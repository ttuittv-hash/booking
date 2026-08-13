import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getInquiryById } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { AnswerInquiryForm } from "@/components/AnswerInquiryForm";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const { id } = await params;
  const inquiry = await getInquiryById(id);
  if (!inquiry) notFound();
  const author = await findUserById(inquiry.userId);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/inquiries" user={user} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/admin/inquiries" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 1:1 문의
        </Link>

        <h1 className="mt-4 text-[20px] font-semibold">{inquiry.title}</h1>
        <p className="mt-1 text-[12px] text-muted">
          {author?.name ?? "-"} ({author?.companyName ?? "-"}, {author?.email ?? "-"}) ·{" "}
          {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
        </p>

        <div className="mt-4 whitespace-pre-wrap rounded border border-border bg-background p-5 text-[13.5px] leading-7">
          {inquiry.content}
        </div>

        {inquiry.answer ? (
          <div className="mt-4 rounded border border-accent/30 bg-accent-soft p-5">
            <div className="text-[12px] font-semibold text-accent">등록된 답변</div>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-7">{inquiry.answer}</p>
            {inquiry.answeredAt && (
              <p className="mt-2 text-[11.5px] text-muted">
                {new Date(inquiry.answeredAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        ) : (
          <AnswerInquiryForm inquiryId={inquiry.id} />
        )}
      </main>
    </div>
  );
}
