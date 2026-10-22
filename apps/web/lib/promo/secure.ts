import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 외부 플랫폼 토큰 암호화와 OAuth state 서명.
 * PROMO_TOKEN_KEY: 32바이트 키를 base64로 (예: `openssl rand -base64 32`)
 */
function key(): Buffer {
  const raw = process.env.PROMO_TOKEN_KEY;
  if (!raw) throw new Error("PROMO_TOKEN_KEY 환경변수가 없어요.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("PROMO_TOKEN_KEY는 32바이트(base64)여야 해요.");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}

export function decrypt(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1") throw new Error("알 수 없는 토큰 형식");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

type State = { orgId: string; userId: string; ts: number; n: string };

export function signState(orgId: string, userId: string): string {
  const body = Buffer.from(JSON.stringify({ orgId, userId, ts: Date.now(), n: randomBytes(8).toString("hex") })).toString("base64url");
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string | null, maxAgeMs = 15 * 60 * 1000): State {
  if (!state) throw new Error("잘못된 요청이에요.");
  const [body, sig] = state.split(".");
  const expect = createHmac("sha256", key()).update(body ?? "").digest();
  const got = Buffer.from(sig ?? "", "base64url");
  if (got.length !== expect.length || !timingSafeEqual(got, expect)) throw new Error("잘못된 요청이에요.");
  const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as State;
  if (Date.now() - s.ts > maxAgeMs) throw new Error("연결 시간이 지났어요. 다시 시도해주세요.");
  return s;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
