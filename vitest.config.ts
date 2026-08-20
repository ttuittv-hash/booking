import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // e2e/ 는 실제 배포된 화면을 Playwright 로 훑는 별도 스크립트다(npm run e2e).
    // vitest 가 집어가면 브라우저를 띄우려다 실패한다.
    include: ["src/**/*.test.ts"],
  },
});
