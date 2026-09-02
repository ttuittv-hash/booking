# 서울아레나 대관 시스템 — 판교 k8s(arena namespace) 배포용 이미지
#
# 런타임은 `next start` — Render 에서 돌던 것과 같은 실행 방식이라 소스 수정이 필요 없다.
# DB는 PostgreSQL — DATABASE_URL 환경변수로 접속 문자열을 주입해야 한다.
# (AUTH_SECRET, SEED_ADMIN_PASSWORD 도 운영 기동에 필수 — .env.example 참고)
# 업로드 첨부파일은 DATA_DIR(=/data, PVC 마운트) 아래에 쌓인다.
# scripts/migrate-sqlite-to-pg.mjs(1회성 데이터 이관)가 node:sqlite 를 쓰므로 Node 24 유지.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data
# next.config.ts(TS 설정) 로딩에 devDependencies 가 필요할 수 있어 node_modules 를 통째로 옮긴다.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json next.config.ts tsconfig.json ./
# 운영 점검용 스크립트. 외부 연동은 아웃바운드 IP 기준으로 열리므로 클러스터 안에서 돌려야 한다
# (예: scripts/biztalk-check.mjs — DKT 비즈메시지 방화벽·토큰·경로 확인).
COPY scripts ./scripts
# 시드 자산(첫 공지의 공고문 PDF) — 기동 때 업로드 폴더로 한 번 복사한다.
COPY assets ./assets
RUN mkdir -p /data && chown -R node:node /data /app/.next
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
