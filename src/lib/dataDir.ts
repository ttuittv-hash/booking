import path from "node:path";

// Render 등 배포 환경에서는 영구 디스크 마운트 경로를 DATA_DIR로 지정한다.
// 로컬 개발 환경에서는 프로젝트 루트의 data/ 디렉터리를 그대로 사용한다.
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
