// 서버에서만 부른다(리포트 페이지의 서버 컴포넌트) — 자격증명이 클라이언트로 새지 않는다.

/**
 * [신규 2026-09-10] 백오피스 「모니터링」 탭이 쓰는 AWS 지표 — 서버 상태·차단 현황.
 *
 * 앱이 CloudWatch·WAF 를 **읽기 전용**으로 호출한다(태스크 역할 arena-task 에 읽기 권한만
 * 추가했다). 쓰기 권한은 주지 않았으므로 이 화면 때문에 인프라가 바뀌는 일은 없다.
 *
 * 조회 실패는 화면을 막지 않는다 — 권한이 없거나(로컬 개발) AWS 가 느릴 때도 리포트의
 * 나머지 탭은 그대로 떠야 한다. 실패하면 `available:false` 로 돌려주고 화면이 안내 문구를
 * 대신 보여준다.
 *
 * SDK 를 새로 넣지 않고 `fetch` + SigV4 서명을 직접 만든다 — 의존성이 늘면 이미지가 커지고
 * 배포 시간이 늘어난다. 필요한 API 가 CloudWatch 두 개뿐이라 서명 코드가 더 짧다.
 */

import crypto from "node:crypto";

const REGION = process.env.AWS_REGION || "ap-northeast-2";
const CLUSTER = "arena-cluster";
const SERVICE = "arena-app";
const WEB_ACL = "arena-waf";

export interface AwsMonitoring {
  available: boolean;
  /** 못 읽었을 때 화면에 보여줄 이유 */
  reason?: string;
  /** 현재 떠 있는 태스크 수(자동 확장 결과) */
  runningTasks: number | null;
  cpuAvg: number | null;
  cpuMax: number | null;
  memoryAvg: number | null;
  /** 기간 내 WAF 가 막은 요청 수 */
  blockedRequests: number | null;
  allowedRequests: number | null;
  /** ALB 5xx / 4xx */
  serverErrors: number | null;
  clientErrors: number | null;
  /** 평균 응답시간(초) */
  responseTime: number | null;
  /** DB */
  dbCpu: number | null;
  dbConnections: number | null;
}

const EMPTY: AwsMonitoring = {
  available: false,
  runningTasks: null,
  cpuAvg: null,
  cpuMax: null,
  memoryAvg: null,
  blockedRequests: null,
  allowedRequests: null,
  serverErrors: null,
  clientErrors: null,
  responseTime: null,
  dbCpu: null,
  dbConnections: null,
};

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

/** CloudWatch GetMetricData 한 번 호출 — SigV4 서명은 이 함수 안에서만 쓴다. */
async function getMetricData(
  queries: unknown[],
  startTime: Date,
  endTime: Date,
): Promise<Record<string, number[]>> {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  // ECS 태스크는 컨테이너 자격증명 엔드포인트로 키를 받는다 — 환경변수에 키가 없으면
  // 그 엔드포인트에서 임시 자격증명을 먼저 가져온다.
  let creds = { accessKey, secretKey, sessionToken };
  if (!creds.accessKey || !creds.secretKey) {
    const relative = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
    if (!relative) throw new Error("AWS 자격증명이 없습니다(로컬 개발 환경).");
    const res = await fetch(`http://169.254.170.2${relative}`, {
      signal: AbortSignal.timeout(3000),
    });
    const json = (await res.json()) as {
      AccessKeyId: string;
      SecretAccessKey: string;
      Token: string;
    };
    creds = {
      accessKey: json.AccessKeyId,
      secretKey: json.SecretAccessKey,
      sessionToken: json.Token,
    };
  }

  const host = `monitoring.${REGION}.amazonaws.com`;
  const body = JSON.stringify({
    MetricDataQueries: queries,
    StartTime: Math.floor(startTime.getTime() / 1000),
    EndTime: Math.floor(endTime.getTime() / 1000),
  });
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const target = "GraniteServiceVersion20100801.GetMetricData";
  const payloadHash = crypto.createHash("sha256").update(body).digest("hex");

  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.0",
    host,
    "x-amz-date": amzDate,
    "x-amz-target": target,
  };
  if (creds.sessionToken) headers["x-amz-security-token"] = creds.sessionToken;
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${REGION}/monitoring/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${creds.secretKey}`, dateStamp), REGION), "monitoring"),
    "aws4_request",
  );
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CloudWatch ${res.status}`);
  const json = (await res.json()) as { MetricDataResults?: { Id: string; Values?: number[] }[] };
  const out: Record<string, number[]> = {};
  for (const r of json.MetricDataResults ?? []) out[r.Id] = r.Values ?? [];
  return out;
}

const sum = (v?: number[]) => (v && v.length ? v.reduce((a, b) => a + b, 0) : null);
const avg = (v?: number[]) => (v && v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const max = (v?: number[]) => (v && v.length ? Math.max(...v) : null);
const round = (n: number | null, digits = 1) =>
  n === null ? null : Math.round(n * 10 ** digits) / 10 ** digits;

/** 기간(from~to, KST 날짜)의 서버·차단 지표를 한 번에 읽는다. */
export async function getAwsMonitoring(opts: { from: string; to: string }): Promise<AwsMonitoring> {
  const start = new Date(`${opts.from}T00:00:00+09:00`);
  const end = new Date(`${opts.to}T23:59:59+09:00`);
  const now = new Date();
  const endTime = end > now ? now : end;
  // 기간이 길면 구간을 넓혀 데이터 포인트 수를 줄인다(CloudWatch 응답 상한 회피).
  const spanHours = (endTime.getTime() - start.getTime()) / 3_600_000;
  const period = spanHours > 24 * 14 ? 86400 : spanHours > 24 * 2 ? 3600 : 300;

  const dim = (name: string, value: string) => ({ Name: name, Value: value });
  const query = (
    id: string,
    namespace: string,
    metricName: string,
    dimensions: { Name: string; Value: string }[],
    stat: string,
  ) => ({
    Id: id,
    MetricStat: {
      Metric: { Namespace: namespace, MetricName: metricName, Dimensions: dimensions },
      Period: period,
      Stat: stat,
    },
    ReturnData: true,
  });

  try {
    const ecsDims = [dim("ClusterName", CLUSTER), dim("ServiceName", SERVICE)];
    const wafDims = [dim("WebACL", WEB_ACL), dim("Region", REGION), dim("Rule", "ALL")];
    const albDims = [dim("LoadBalancer", "app/arena-alb/d022c62825ed08b5")];
    const rdsDims = [dim("DBInstanceIdentifier", "arena-db")];

    const data = await getMetricData(
      [
        query("cpuavg", "AWS/ECS", "CPUUtilization", ecsDims, "Average"),
        query("cpumax", "AWS/ECS", "CPUUtilization", ecsDims, "Maximum"),
        query("memavg", "AWS/ECS", "MemoryUtilization", ecsDims, "Average"),
        query("tasks", "ECS/ContainerInsights", "RunningTaskCount", ecsDims, "Average"),
        query("blocked", "AWS/WAFV2", "BlockedRequests", wafDims, "Sum"),
        query("allowed", "AWS/WAFV2", "AllowedRequests", wafDims, "Sum"),
        query("e5xx", "AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", albDims, "Sum"),
        query("e4xx", "AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", albDims, "Sum"),
        query("rt", "AWS/ApplicationELB", "TargetResponseTime", albDims, "Average"),
        query("dbcpu", "AWS/RDS", "CPUUtilization", rdsDims, "Average"),
        query("dbconn", "AWS/RDS", "DatabaseConnections", rdsDims, "Maximum"),
      ],
      start,
      endTime,
    );

    return {
      available: true,
      runningTasks: round(avg(data.tasks), 0),
      cpuAvg: round(avg(data.cpuavg)),
      cpuMax: round(max(data.cpumax)),
      memoryAvg: round(avg(data.memavg)),
      blockedRequests: round(sum(data.blocked), 0),
      allowedRequests: round(sum(data.allowed), 0),
      serverErrors: round(sum(data.e5xx), 0),
      clientErrors: round(sum(data.e4xx), 0),
      responseTime: round(avg(data.rt), 3),
      dbCpu: round(avg(data.dbcpu)),
      dbConnections: round(max(data.dbconn), 0),
    };
  } catch (error) {
    return {
      ...EMPTY,
      reason:
        error instanceof Error && error.message.includes("자격증명")
          ? "이 환경에서는 AWS 지표를 읽을 수 없습니다(로컬 개발)."
          : `AWS 지표를 불러오지 못했습니다 — ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}
