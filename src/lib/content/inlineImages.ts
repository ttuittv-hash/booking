/**
 * 본문 HTML 에 base64(data: URL)로 박힌 이미지를 업로드 파일로 바꿔 넣는다 (2026-09-04).
 *
 * 워드·페이지에서 붙여넣은 옛 공지는 이미지가 본문 안에 base64 로 들어 있어 몇 MB 가 되고,
 * 그 상태로 저장하면 앞단이 막는다. 편집기는 붙여넣기 시점에 그런 이미지를 걷어내지만
 * 이미 저장돼 있던 본문은 "수정 → 저장" 이 거부돼 운영자가 손을 못 대는 상태가 됐다.
 * 저장 직전에 여기서 이미지를 하나씩 업로드하고 src 를 그 URL 로 바꾸면 운영자는 아무것도
 * 안 해도 저장이 된다. 업로드가 안 되는 형식은 그대로 두고 남은 개수를 돌려줘 안내한다.
 */
const DATA_IMG_RE = /<img\b([^>]*?)\ssrc=["'](data:image\/([a-z0-9.+-]+);base64,([^"']+))["']([^>]*)>/gi;

const EXT_BY_SUBTYPE: Record<string, string> = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp", gif: "gif" };

export function countInlineImages(html: string): number {
  return (html.match(DATA_IMG_RE) ?? []).length;
}

export function dataUrlToBlob(subtype: string, base64: string): Blob {
  const bin = atob(base64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: `image/${subtype}` });
}

/**
 * @param upload  (blob, 파일명) → 업로드된 URL. 실패하면 예외를 던지거나 null 을 돌려준다.
 * @returns 바뀐 HTML 과 변환 못 한 이미지 수
 */
export async function uploadInlineImages(
  html: string,
  upload: (blob: Blob, filename: string) => Promise<string | null>,
): Promise<{ html: string; remaining: number }> {
  const matches = [...html.matchAll(DATA_IMG_RE)];
  if (matches.length === 0) return { html, remaining: 0 };
  let out = html;
  let remaining = 0;
  let n = 0;
  for (const m of matches) {
    const [whole, before, , subtype, base64, after] = m;
    const ext = EXT_BY_SUBTYPE[subtype.toLowerCase()];
    let url: string | null = null;
    if (ext) {
      n += 1;
      try {
        url = await upload(dataUrlToBlob(subtype.toLowerCase(), base64), `pasted-${n}.${ext}`);
      } catch {
        url = null;
      }
    }
    if (!url) {
      remaining += 1;
      continue;
    }
    out = out.replace(whole, `<img${before} src="${url}"${after}>`);
  }
  return { html: out, remaining };
}
