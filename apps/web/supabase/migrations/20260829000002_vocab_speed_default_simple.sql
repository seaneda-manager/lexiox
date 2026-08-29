-- 단어 학습(/vocab/session)의 speed 단계 기본값을 '간략(simple)'으로 전환.
--   simple = 모든 단어 1회씩만, 오답 재도전 없이 바로 깜지 (학습에 충실)
--   full   = 70% 통과 게이트 + 오답 재도전 (교사가 Track/학생 단위로 명시 선택 시에만)
-- 엄격한 점검은 별도의 '단어 시험'(/vocab/test)이 담당한다.

ALTER TABLE vocab_tracks ALTER COLUMN speed_mode SET DEFAULT 'simple';

-- 현재 모든 트랙이 이전 기본값 'full' 상태(기능 도입 1일차, 의도적 설정 없음) → 일괄 전환.
UPDATE vocab_tracks SET speed_mode = 'simple' WHERE speed_mode = 'full';

COMMENT ON COLUMN vocab_tracks.speed_mode IS 'Speed 단계 기본 버전: simple(간략, 기본) | full(정식, 70% 게이트+재도전)';
