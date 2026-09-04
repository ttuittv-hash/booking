import { describe, expect, it } from "vitest";
import { countInlineImages, uploadInlineImages } from "./inlineImages";

// 1x1 PNG
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("uploadInlineImages — 본문의 base64 이미지를 업로드 파일로 바꾼다", () => {
  it("data: 이미지를 세고, 업로드된 URL 로 src 를 바꾼다(다른 속성은 유지)", async () => {
    const html = `<p>앞</p><img class="x" src="data:image/png;base64,${PNG}" alt="캡처"><p>뒤</p>`;
    expect(countInlineImages(html)).toBe(1);
    const calls: { type: string; name: string; size: number }[] = [];
    const r = await uploadInlineImages(html, async (blob, name) => {
      calls.push({ type: blob.type, name, size: blob.size });
      return "/api/notices/image/abc.png";
    });
    expect(calls).toEqual([{ type: "image/png", name: "pasted-1.png", size: 70 }]);
    expect(r.remaining).toBe(0);
    expect(r.html).toBe(`<p>앞</p><img class="x" src="/api/notices/image/abc.png" alt="캡처"><p>뒤</p>`);
    expect(countInlineImages(r.html)).toBe(0);
  });

  it("업로드가 실패하거나 지원하지 않는 형식이면 그대로 두고 남은 수를 돌려준다", async () => {
    const html = `<img src="data:image/png;base64,${PNG}"><img src="data:image/svg+xml;base64,${PNG}">`;
    const r = await uploadInlineImages(html, async () => {
      throw new Error("network");
    });
    expect(r.remaining).toBe(2);
    expect(r.html).toBe(html);
  });

  it("data: 이미지가 없으면 그대로 돌려준다", async () => {
    const html = `<p>글</p><img src="/api/notices/image/a.png">`;
    const r = await uploadInlineImages(html, async () => "/x");
    expect(r).toEqual({ html, remaining: 0 });
  });
});
