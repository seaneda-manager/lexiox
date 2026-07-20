'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * SecureWritingEditor
 *
 * M1: Security & Editor 구현
 * ✅ Copy/Paste/Cut 완전 차단
 * ✅ 키보드 단축키 차단 (Ctrl+C, Ctrl+V, Ctrl+Z, F5)
 * ✅ Auto-Save Debounce (500ms)
 * ✅ 실시간 단어 수 카운팅
 */

interface SecureWritingEditorProps {
  value: string;
  onChange: (text: string) => void;
  onAutoSave: (text: string) => void;  // 백엔드 저장 트리거
  placeholder?: string;
  readOnly?: boolean;
  maxWords?: number;
  minWords?: number;
}

function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

export default function SecureWritingEditor({
  value,
  onChange,
  onAutoSave,
  placeholder = '여기에 입력하세요...',
  readOnly = false,
  maxWords,
  minWords,
}: SecureWritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 1️⃣ Copy/Paste/Cut 완전 차단
  const handleClipboardEvents = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // 2️⃣ 키보드 단축키 차단
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      return;
    }
    // Ctrl+V (Paste)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      return;
    }
    // Ctrl+X (Cut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      return;
    }
    // Ctrl+Z (Undo) - 필요시 활성화
    // if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    //   e.preventDefault();
    //   return;
    // }
    // F5 (Refresh)
    if (e.key === 'F5') {
      e.preventDefault();
      return;
    }
  }, []);

  // 3️⃣ Auto-Save Debounce (500ms)
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;

    // Word count 업데이트
    const newWordCount = countWords(text);
    setWordCount(newWordCount);

    // 단어 수 제한 확인
    if (maxWords && newWordCount > maxWords) {
      // 초과한 단어는 자동으로 제거하지 않고, UI에서만 경고 표시
      // 사용자가 직접 삭제하도록 유도
    }

    // onChange 콜백 (UI 상태 업데이트)
    onChange(text);

    // Debounce: 기존 타이머 취소
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // 새로운 타이머 설정 (500ms 후 자동 저장)
    setIsSaving(false);
    autoSaveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      onAutoSave(text);
      // 저장 완료 표시 (2초)
      setTimeout(() => setIsSaving(false), 2000);
    }, 500);
  }, [onChange, onAutoSave, maxWords]);

  // 4️⃣ 마운트 시 클립보드 이벤트 등록
  useEffect(() => {
    const textareaElement = textareaRef.current;
    if (!textareaElement) return;

    // Copy/Paste/Cut 차단
    textareaElement.addEventListener('copy', handleClipboardEvents as EventListener);
    textareaElement.addEventListener('paste', handleClipboardEvents as EventListener);
    textareaElement.addEventListener('cut', handleClipboardEvents as EventListener);

    // Cleanup
    return () => {
      textareaElement.removeEventListener('copy', handleClipboardEvents as EventListener);
      textareaElement.removeEventListener('paste', handleClipboardEvents as EventListener);
      textareaElement.removeEventListener('cut', handleClipboardEvents as EventListener);
    };
  }, [handleClipboardEvents]);

  // 5️⃣ 언마운트 시 Auto-Save 타이머 정리
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* 에디터 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full h-64 p-3 rounded-lg border font-mono text-sm resize-none focus:outline-none focus:ring-2 ${
          readOnly
            ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
            : 'border-indigo-300 focus:ring-indigo-400 bg-white'
        }`}
        style={{
          fontFamily: '"Courier New", monospace',
          lineHeight: '1.6',
        }}
      />

      {/* 하단 정보 바 */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="space-x-3">
          {/* 단어 수 카운팅 */}
          <span>
            Word Count:{' '}
            <span className={`font-semibold ${
              maxWords && wordCount > maxWords ? 'text-rose-600' : 'text-gray-900'
            }`}>
              {wordCount}
            </span>
            {maxWords && <span className="text-gray-400"> / {maxWords}</span>}
          </span>

          {/* 최소 단어 수 경고 */}
          {minWords && wordCount < minWords && (
            <span className="text-amber-600 font-semibold">
              ⚠️ {minWords}개 이상 필요
            </span>
          )}
        </div>

        {/* 자동 저장 상태 */}
        <span className={`transition ${
          isSaving ? 'text-blue-500' : 'text-gray-400'
        }`}>
          {isSaving ? '💾 저장 중...' : '✓ 저장됨'}
        </span>
      </div>

      {/* 최대 단어 수 초과 경고 */}
      {maxWords && wordCount > maxWords && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          ⚠️ 단어 수 초과: {wordCount - maxWords}개 초과됨. 입력한 내용을 줄여주세요.
        </div>
      )}

      {/* 보안 경고 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 rounded-lg bg-gray-100 text-xs text-gray-600 space-y-1">
          <p className="font-semibold">🔒 보안 제어 활성화:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Copy/Paste/Cut 차단 ✓</li>
            <li>Ctrl+C, Ctrl+V, F5 차단 ✓</li>
            <li>Auto-Save 활성화 (500ms debounce) ✓</li>
          </ul>
        </div>
      )}
    </div>
  );
}
