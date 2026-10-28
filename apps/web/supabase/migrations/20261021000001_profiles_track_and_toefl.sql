-- 학생별 프로그램 저장 구조: 트랙(서로 겹치지 않음) + TOEFL 여부(다른 트랙과 함께 가능)
--
-- 허용 조합 7가지:
--   단독  : TOEFL / Hi-내신 / 중학(중학내신+중학일반) / Jr.
--   복수  : TOEFL+Hi-내신 / TOEFL+중학 / TOEFL+Jr.
--   → track 은 하나만 가질 수 있고(hi_naesin | middle | jr | null), TOEFL 은 별도 불리언이다.
--      그래서 허용되지 않는 조합(예: Hi-내신+중학)은 저장 자체가 불가능하다.
--
-- 추가만 한다: 기존 profiles.program (gap | toefl | lexiox) 은 그대로 두고 계속 사용한다.
-- 여러 번 실행해도 안전하다.

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS track text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_toefl boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_track_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_track_check CHECK (track IS NULL OR track IN ('hi_naesin', 'middle', 'jr'));

-- 기존 TOEFL/GAP 학생은 TOEFL 여부만 채운다.
-- track 은 자동으로 채우지 않는다: 같은 학생이 Hi-내신(H*)과 중학(M*) 지문을 둘 다 받을 수 있어
-- 배정 데이터만으로는 판별되지 않으므로 관리자가 학생별로 지정한다.
UPDATE public.profiles SET has_toefl = true WHERE program IN ('toefl', 'gap') AND has_toefl = false;

COMMIT;
