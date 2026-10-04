// 한국 휴대폰 번호 정규화/검증. DB 에는 숫자만('01012345678') 저장하고, 화면에서만 하이픈을 붙인다.

// strict 모드가 아닌 프로젝트 설정에서도 안전하게 쓰도록 단순한 형태로 둔다.
// ok=true 면 value/display 가 채워지고, ok=false 면 reason 이 채워진다(value/display 는 빈 문자열).
export type PhoneResult = {
  ok: boolean;
  value: string;
  display: string;
  reason: "" | "empty" | "invalid";
};

const fail = (reason: "empty" | "invalid"): PhoneResult => ({ ok: false, value: "", display: "", reason });

/**
 * 허용: 010-1234-5678 / 01012345678 / 010 1234 5678 / +82 10-1234-5678 / 82-10-1234-5678 / (010)1234-5678
 * 휴대폰만 받는다(문자·카톡 수신용): 01[016789] + 7~8자리. 010 은 반드시 총 11자리.
 */
export function normalizeKoreanMobile(input: string | null | undefined): PhoneResult {
  const raw = String(input ?? "").trim();
  if (!raw) return fail("empty");

  let digits = raw.replace(/\D/g, "");

  // 국가번호: +82 / 82 로 시작하면 앞의 0 이 빠진 형태(1012345678)이므로 0 을 붙여 복원
  if (/^\+?\s*82/.test(raw) || digits.startsWith("82")) {
    if (digits.startsWith("82")) {
      digits = digits.slice(2);
      // '+82 (0)10-...' 처럼 0 이 이미 있으면 중복 방지
      if (!digits.startsWith("0")) digits = `0${digits}`;
    }
  }

  if (!/^01[016789]\d{7,8}$/.test(digits)) return fail("invalid");
  if (digits.startsWith("010") && digits.length !== 11) return fail("invalid");

  return { ok: true, value: digits, display: formatKoreanMobile(digits), reason: "" };
}

/** '01012345678' -> '010-1234-5678', '0161234567' -> '016-123-4567' */
export function formatKoreanMobile(digits: string): string {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}
