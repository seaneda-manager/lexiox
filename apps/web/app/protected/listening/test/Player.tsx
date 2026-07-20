'use client';

import { useRef, useState } from 'react';

type Props = {
  audioSrc: string;
  sessionId: string;
};

export default function Player({ audioSrc, sessionId }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePlayClick = async () => {
    if (hasPlayed || !audioSrc || loading) return;
    const el = audioRef.current;
    if (!el) return;

    setLoading(true);

    // 소비(consume) 기록 남기기
    const res = await fetch('/api/listening/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // 인증 헤더가 필요하면 여기서 추가
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) {
      setLoading(false);
      if (res.status === 409) {
        alert('이미 재생된 세션입니다. 다시 재생할 수 없어요.');
      } else {
        alert('재생 준비 중 오류가 발생했습니다.');
      }
      return;
    }

    // 실제 재생 (브라우저 자동재생 정책 대응)
    try {
      // 사용자 제스처 내에서 호출됨
      el.muted = false;
      await el.play();
      setHasPlayed(true);
    } catch (err) {
      // 자동재생 정책 등에 의해 실패할 수 있음
      console.error(err);
      alert('재생이 차단되었어요. 한 번 더 눌러주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={audioSrc} preload="none" />
      <button
        onClick={handlePlayClick}
        disabled={hasPlayed || loading}
        className="rounded-xl px-4 py-2 border"
      >
        {loading ? '준비 중…' : hasPlayed ? '재생됨' : '재생'}
      </button>
    </div>
  );
}




