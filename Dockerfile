# 서울아레나 대관 시스템 — 판교 k8s(arena namespace) 배포용 이미지
#
# node:sqlite 를 플래그 없이 쓰기 위해 Node 24 를 사용한다(22 에서는 --experimental-sqlite 필요).
# 런타임은 `next start` — Render 에서 돌던 것과 같은 실행 방식이라 소스 수정이 필요 없다.
# SQLite 파일과 업로드 첨부는 DATA_DIR(=/data, PVC 마운트) 아래에 쌓인다.

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
RUN mkdir -p /data && chown -R node:node /data /app/.next
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
