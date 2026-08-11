import { Pool, types, type QueryResultRow } from "pg";

// COUNT(*) 등 int8(bigint) 집계값을 문자열이 아니라 number로 받는다.
// (pg 는 기본적으로 bigint 를 정밀도 손실 우려로 문자열로 준다 — 이 앱의 집계는
//  전부 안전한 범위라 number 로 받는 편이 호출부가 단순하다.)
types.setTypeParser(types.builtins.INT8, (value: string) => Number(value));

declare global {
  // Next.js 개발 모드는 모듈을 리로드하므로, 전역에 붙여두지 않으면 커넥션 풀이
  // 요청마다 새로 생겨 커넥션이 고갈된다.
  var __arenaPgPool: Pool | undefined;
  var __arenaPgReady: Promise<void> | undefined;
}

export function getPool(): Pool {
  if (!globalThis.__arenaPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
    }
    globalThis.__arenaPgPool = new Pool({
      connectionString,
      max: Number(process.env.PGPOOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__arenaPgPool;
}

// 스키마 생성·시드는 프로세스당 한 번만 실행한다. 실패하면 캐시를 비워서
// 다음 요청 때 다시 시도한다(기동 시 DB가 아직 안 떠 있는 경우 대비).
async function ready(): Promise<void> {
  if (!globalThis.__arenaPgReady) {
    // 순환 import 를 피하려고 동적 import 를 쓴다 (initDb → pg.raw 를 다시 씀).
    globalThis.__arenaPgReady = import("./initDb")
      .then((m) => m.initSchema())
      .catch((err) => {
        globalThis.__arenaPgReady = undefined;
        throw err;
      });
  }
  await globalThis.__arenaPgReady;
}

// SQLite 스타일 `?` 자리표시자를 PostgreSQL 의 `$1..$n` 으로 바꾼다.
// (쿼리문을 그대로 옮겨오기 위한 얇은 호환 계층 — 이 앱의 SQL 에는 문자열 리터럴
//  안에 `?` 가 들어가는 쿼리가 없다.)
export function toPgPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// 스키마 초기화를 기다리지 않는 저수준 실행 — initDb 내부에서만 쓴다.
export async function raw<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  // 파라미터가 없으면 simple query 로 보낸다 — 확장 프로토콜은 한 번에 한 문장만 허용한다.
  const result = params.length
    ? await getPool().query<T>(toPgPlaceholders(sql), params as unknown[])
    : await getPool().query<T>(sql);
  return result.rows;
}

export async function all<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  await ready();
  return raw<T>(sql, params);
}

export async function one<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T | undefined> {
  const rows = await all<T>(sql, params);
  return rows[0];
}

export async function run(sql: string, params: readonly unknown[] = []): Promise<void> {
  await ready();
  await raw(sql, params);
}
