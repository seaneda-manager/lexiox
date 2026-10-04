// 학부모 읽기 전용 리포트 링크의 토큰 처리. 서버에서만 쓴다(node:crypto).
//
// 보안 규칙
//  - 토큰은 256비트 난수. 주소(URL)에 들어가는 것은 이 토큰뿐이고 학생 정보는 들어가지 않는다.
//  - DB 에는 토큰 자체가 아니라 SHA-256 해시만 저장한다. DB 가 유출돼도 링크를 만들 수 없다.
//  - 해시 비교는 DB 의 등치 조회(해시는 고정 길이 hex)로 하고, 토큰 형식이 틀리면 DB 조회 전에 거절한다.

import { createHash, randomBytes } from "node:crypto";

/** URL 에 안전한 43자 토큰 (32바이트 base64url). */
export function generateReportToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 저장용 해시 (64자 hex). */
export function hashReportToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** 형식이 맞는 토큰인지(길이·문자). 틀리면 DB 조회 없이 바로 거절해 불필요한 조회와 추측 시도를 줄인다. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_SHAPE.test(token);
}

export const DEFAULT_LINK_DAYS = 14;

export function computeExpiry(now: Date = new Date(), days: number = DEFAULT_LINK_DAYS): Date {
  const d = Math.min(Math.max(Math.floor(days), 1), 90);
  return new Date(now.getTime() + d * 86_400_000);
}

export type LinkState = { expires_at: string | Date; revoked_at: string | Date | null };

/** 폐기되지 않았고 만료 전이면 유효. 만료 시각 '정각'부터는 무효. */
export function isLinkActive(link: LinkState, now: Date = new Date()): boolean {
  if (link.revoked_at) return false;
  return new Date(link.expires_at).getTime() > now.getTime();
}
