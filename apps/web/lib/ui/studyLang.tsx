"use client";

/**
 * Study 모드 UI 언어 전환 (EN 기본 / KO 선택).
 * - 시험(Test) 모드는 실제 시험처럼 영어 고정이므로 이 훅을 쓰지 않는다.
 * - 선택은 localStorage에 저장되고, 같은 탭의 모든 컴포넌트가 함께 바뀐다.
 */
import { useCallback, useEffect, useState } from "react";

export type StudyLang = "en" | "ko";
const KEY = "toefl-study-lang";
const EVT = "toefl-study-lang-change";

function read(): StudyLang {
  try {
    return window.localStorage.getItem(KEY) === "ko" ? "ko" : "en";
  } catch {
    return "en";
  }
}

export function useStudyLang() {
  // SSR/첫 렌더는 항상 en → hydration mismatch 방지
  const [lang, setLang] = useState<StudyLang>("en");

  useEffect(() => {
    setLang(read());
    const sync = () => setLang(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next: StudyLang = read() === "ko" ? "en" : "ko";
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* 저장 실패 시에도 이번 세션 상태는 바꾼다 */
    }
    setLang(next);
    window.dispatchEvent(new Event(EVT));
  }, []);

  /** t("English", "한국어") */
  const t = useCallback((en: string, ko: string) => (lang === "ko" ? ko : en), [lang]);

  return { lang, toggle, t };
}

export function StudyLangToggle({ className }: { className?: string }) {
  const { lang, toggle } = useStudyLang();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className={
        className ??
        "rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
      }
    >
      {lang === "ko" ? "English" : "한국어"}
    </button>
  );
}
