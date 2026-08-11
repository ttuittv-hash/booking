import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import { deleteAttachment, getAttachmentById, getQuoteById } from "@/lib/db";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

async function authorize(quoteId: string, attachmentId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };

  const quote = await getQuoteById(quoteId);
  if (!quote) return { error: NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 }) };
  if (!(await canAccessQuote(user, quote))) {
    return { error: NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 }) };
  }

  const attachment = await getAttachmentById(attachmentId);
  if (!attachment || attachment.quoteId !== quoteId) {
    return { error: NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 }) };
  }

  return { user, attachment };
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await ctx.params;
  const result = await authorize(id, attachmentId);
  if ("error" in result) return result.error;

  const filePath = path.join(UPLOAD_ROOT, id, result.attachment.storedName);
  const buffer = await fs.readFile(filePath).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "파일이 존재하지 않습니다." }, { status: 404 });

  const encodedName = encodeURIComponent(result.attachment.originalName);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": result.attachment.mimeType,
      "Content-Disposition": `inline; filename="attachment"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(result.attachment.size),
    },
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await ctx.params;
  const result = await authorize(id, attachmentId);
  if ("error" in result) return result.error;

  const filePath = path.join(UPLOAD_ROOT, id, result.attachment.storedName);
  await fs.unlink(filePath).catch(() => {});
  await deleteAttachment(attachmentId);

  return NextResponse.json({ ok: true });
}
