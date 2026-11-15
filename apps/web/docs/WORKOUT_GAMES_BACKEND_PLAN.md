# Workout 게임 백엔드 계획 (2026-11-15)

> 상태: **1단계(읽기 전용)만 구현됨. 2~5단계는 DB 스키마 변경이 필요해서 승인 후 진행(계획만).**
> 앞선 합의: 스키마 변경/마이그레이션은 즉시 적용하지 않고 계획을 먼저 보여 준 뒤 승인 시점에 적용한다.

## 1. 확정된 규칙 (사용자 결정)
1. **게임 = 보상(perk)**. 숙제 완료 후, 또는 학원 학습 완료 후에만 열린다. 게임은 숙제 완료로 **인정되지 않는다**.
2. **플레이 양은 시간(분)**. 적립된 분만큼 놀 수 있고, 플레이하면 차감된다.
3. **학원 학습 완료 = 선생님 체크**(수업 후 선생님이 체크). 자동 판정은 나중에.
4. **스테이지 = 단어장의 세트(Day)**, 세계 = 과정(track). 단어는 학생에게 배정된 범위.
5. **이어하기(save)** 필요: 긴 게임(오목·Rescue·드리프트)은 도중 저장, 짧은 게임은 스테이지 진행만 저장.
6. **복습 스테이지**를 게임 안에 둔다: 틀린 문제가 복습 목록에 쌓이고, 때가 되면 복습 스테이지가 열린다. 클리어하면 보너스 분. 기존 단어 복습 규칙(prescreen 모름·speed 오답 무조건 복습)과 같은 목록으로 합친다.
7. 문법·리딩·리스닝도 같은 구조(배정 범위 → 어댑터 → 게임). 먼저 보카, 다음 문법(4지선다), 그다음 리딩/리스닝.

## 2. 이미 있는 것 (코드 확인)
- 학생 ID = 로그인 사용자 ID (`student_vocab_assignments.student_id = user.id`).
- `student_vocab_plans`(track, cursor_day_index) / `student_vocab_assignments`(day_index, set_id, status ASSIGNED·STARTED·COMPLETED, completed_at) / `vocab_sets`(track_id, order_index) / `vocab_set_items`(set_id, word_id, sort_order) / `words`(text, pos, meanings_ko[], meanings_en_simple[], meaning_pos[], pronunciation_ko, difficulty) / `word_synonyms`(word_id, synonym_word_id, tier).
- 숙제 완료 신호: `POST /api/vocab/complete-day`(assignment → COMPLETED).

## 3. 1단계 (구현됨, 스키마 변경 없음)
- `GET /api/workout/stages` — 내 과정과 Day 목록(상태 포함).
- `GET /api/workout/words?setId=` — 한 Day의 단어를 `{ id, word, ko, def, pos, pron, synonyms[] }`로. 접근은 **그 세트가 내게 배정된 학생 또는 직원(admin/teacher/hq_staff/franchisee)**만.
- 플레이 페이지 "단어" 선택(데모 30개 / 내 Day). 단어가 4개 미만이면 데모로 대체, 16개 미만이면 오답 보기만 데모 단어로 보충.
- **미확인**: 개발 환경의 로그인이 실제 Supabase 세션이 아니라서 실제 단어가 내려오는 흐름은 못 봤다(401/400 처리는 확인). 운영/실계정에서 확인 필요.
- **아직 없음**: 숙제/학원 완료 잠금(perk). 현재는 플레이 페이지를 직접 열면 누구나 데모 단어로 놀 수 있다 → 2단계 전에는 허브를 학생 메뉴에 연결하지 않는 것을 권장.

## 4. 스키마 초안 (미적용 — 승인 후 마이그레이션으로 만든다)
```sql
-- (A) 플레이 시간 장부: +적립 / -사용 (분)
create table public.game_perk_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  day date not null,                 -- 적립 기준일
  minutes integer not null,          -- + 적립, - 사용
  reason text not null,              -- homework_done | academy_checked | review_stage | teacher_grant | teacher_revoke | play_used
  ref_type text, ref_id uuid,        -- 관련 숙제/체크/스테이지
  granted_by uuid,                   -- 선생님이 부여/회수한 경우
  created_at timestamptz not null default now()
);
create index on public.game_perk_ledger (student_id, day);

-- (B) 선생님의 학원 학습 체크
create table public.academy_study_checks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  day date not null,
  checked_by uuid not null,
  minutes_award integer,             -- 비우면 학원 기본값
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, day)
);

-- (C) 풀이 기록 (복습 재료)
create table public.game_item_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  game text not null,
  stage_key text,                    -- 예: vocab:<set_id>
  item_type text not null,           -- vocab | grammar | reading | listening
  item_id uuid not null,
  correct boolean not null,
  ms integer,
  created_at timestamptz not null default now()
);

-- (D) 복습 큐: 간격 반복(1·3·7일), 연속 정답으로 졸업
create table public.game_review_queue (
  student_id uuid not null,
  item_type text not null,
  item_id uuid not null,
  due_at timestamptz not null,
  step smallint not null default 0,
  streak smallint not null default 0,
  graduated_at timestamptz,
  primary key (student_id, item_type, item_id)
);

-- (E) 이어하기 저장 / (F) 스테이지 진행
create table public.game_saves (
  student_id uuid not null, game text not null, stage_key text not null,
  state jsonb not null, updated_at timestamptz not null default now(),
  primary key (student_id, game, stage_key)
);
create table public.game_stage_progress (
  student_id uuid not null, game text not null, stage_key text not null,
  stars smallint not null default 0, best_score integer not null default 0,
  plays integer not null default 0, cleared_at timestamptz,
  primary key (student_id, game, stage_key)
);
```
- RLS: 학생은 자기 행만 읽기/쓰기, 선생님/직원은 담당 학생 읽기. (리딩/리스닝 결과에서 직원 읽기 정책이 빠져 있었던 전례가 있으니 정책을 처음부터 포함한다.)
- 시간 차감은 서버 기준: 클라이언트가 30초마다 `play tick`을 보내고, 서버가 적립 잔액 안에서만 허용한다(클라이언트 조작 방지).

## 5. 시간(분) 정책 (기본값 제안, 학원별 설정 가능하게)
| 적립 사유 | 기본 분 |
|---|---|
| 오늘 숙제 전부 완료 | 10 (사용자 확정) |
| 선생님 "학원 학습 완료" 체크 | 10 (사용자 확정, 선생님이 조정 가능) |
| 복습 스테이지 클리어 | +5 (사용자 확정) · 하루 상한 15는 제안값(미확정) |
| 선생님 임의 부여/회수 | 자유 |
- 하루가 지나면 미사용 분은 소멸(또는 이월 상한) — 결정 필요.

## 6. 단계
1. ✅ 읽기 전용 어댑터 + 단어 범위 선택
2. 플레이 시간 장부 + 선생님 체크 UI + 허브 잠금 (스키마 A·B)
3. 풀이 기록 + 복습 큐 + 복습 스테이지 (스키마 C·D)
4. 이어하기 + 스테이지 지도·진행 저장 (스키마 E·F)
5. 문법(4지선다) → 리딩/리스닝 어댑터

## 7. 결정 사항
- **2단계 마이그레이션은 주말에 적용(사용자 결정 2026-11-15).** 파일 준비됨, **미적용**: `supabase/migrations/20261116000001_game_perk_core.sql` (설정·학원 체크·시간 장부, RLS 포함, 되돌리기 SQL 주석 포함). 적용은 Supabase SQL 편집기에서 수동.
- 기본 분(사용자 확정 2026-11-15): **숙제 10분 / 학원 체크 10분 / 복습 보너스 5분**. 설정 테이블 기본값에 반영(나중에 변경 가능). 미확정(제안값 유지): 복습 보너스 하루 상한 15분, 미사용 분 이월 0(하루 지나면 소멸).
- 장부는 학생이 쓸 수 없고(RLS에 쓰기 정책 없음) 서버(서비스 롤)만 기록 → 시간 조작 방지.

## 7-1. 적용 결과 (2026-11-15, 운영 DB `TOEFL-TPO`)
- ✅ `20261116000001_game_perk_core.sql` 적용 완료(`supabase db query --linked -f`, BEGIN/COMMIT). 확인: 설정 1행(10/10/5/15/0), 표 3개 + 뷰 1개 생성·RLS 켜짐, 정책 6개, 장부 0행.
- ✅ 적용 직후 보안 보완: 잔액 뷰 `game_perk_balance`가 RLS를 우회해 타 학생 잔액이 보일 수 있어 `security_invoker=true` + anon 접근 회수. 파일에도 반영.
- `checked_by`는 NOT NULL + ON DELETE SET NULL 모순이라 nullable로 수정한 뒤 적용.
- 마이그레이션 이력(`supabase_migrations`) 정렬(runbook Phase D)은 별도 — 이 파일 버전은 아직 "applied"로 기록하지 않음.

## 7-2. 2단계 코드 구현 (브랜치 `feat/workout-perk-lock`, 2026-11-15)
- **선생님 "학습 완료 체크"**: `/teacher/study-check` + `GET/POST/DELETE /api/teacher/study-checks`. 새 권한 `study_check.write`(선생님·원장 기본 포함), 사이드바 "학습 완료 체크". 체크 → 장부 `academy_checked` +분(기본 10, 칸에서 조정). 취소 → 반대 부호 `teacher_revoke`로 회수(장부는 지우지 않음). 같은 학생·날짜 1회. 로그인 계정이 없는 학원 학생(15명 중 2명)은 "로그인 계정 없음".
- **숙제 완료 적립**: `vocab/session/actions.ts`의 `completeVocabDayAction`(깜지까지 끝낸 단 하나의 완료 지점) 끝에서 `awardHomeworkDoneIfComplete` 호출 → 오늘 완료한 Day 수가 하루 목표(plan.sets_per_day, 기본 1)에 도달하면 `homework_done` +분(기본 10), **하루 한 번**(결정적 ref UUID + 유니크 인덱스). 실패해도 숙제 완료에 영향 없음(try/catch). ※ 지금은 단어 숙제만 "오늘 숙제"로 셈.
- **잔액/차감**: `GET/POST /api/workout/perk`. 직원은 unlimited(미리보기). 학생은 플레이 시작 시 1분, 이후 60초마다 1분 차감(탭이 보일 때만), 50초 내 중복 호출은 차감하지 않음. 잔액 0이면 `locked`.
- **잠금 UI**: 게임 목록·플레이 페이지가 `usePerk`로 상태 확인 → 잠금이면 `PerkLock`(오늘 숙제/학원 체크 현황 + 숙제 링크). 플레이 중 0분이 되면 게임이 닫히고 잠금 화면. 개발(NODE_ENV!=='production')에서 세션 없음(401)이면 우회(배지 표시), `?perk=locked|login`으로 잠금 화면 확인 가능(운영 빌드에서는 사라짐).
- **버그 수정**: 단어 숙제 표의 `student_id`는 `academy_students.id`(로그인 계정 ID와 다름). 1단계 `/api/workout/stages`·`/words`가 계정 ID로 찾던 것을 `resolveAcademyStudentId`로 교정.
- 검증: 운영 DB에서 적립/중복차단/잔액계산/사용차감/잘못된 사유 거부/ID 변환/주입 안전/미완료 시 미적립 확인(테스트 행은 모두 삭제, 잔여 0). 화면: 잠금 화면 2종, 목록 우회 배지, 선생님 화면 비직원 리다이렉트, 선생님 API 401.
- **미확인**: 실제 선생님 세션으로 체크 화면 조작, 실제 학생이 Day를 끝냈을 때 적립되는 흐름(완료 지점 연동은 코드로만), 학생 세션으로 차감·잠금 전환. 운영 반영 전에 실계정으로 확인 필요.
- **알려진 한계**: 차감은 클라이언트의 틱 호출에 의존(요청을 막으면 무료 플레이 가능 — 서버 세션 방식은 후속). 단어 숙제만 "오늘 숙제". 마이그레이션 이력(`supabase migration repair`) 미기록.

## 8. 주말 적용 체크리스트 (완료됨, 위 7-1 참고)
1. 위 SQL을 Supabase SQL 편집기에서 실행 → 파일 맨 아래 "적용 후 확인" 쿼리 3개 확인.
2. 적용 후 개발할 것(스키마가 있어야 테스트 가능): 선생님 "학원 학습 완료" 체크 UI(`/teacher/...`) + API, 오늘 숙제 완료 판정과 적립(`/api/vocab/complete-day` 연동), 잔액 조회/플레이 tick API, 게임 허브 잠금.
3. 3~4단계(풀이 기록·복습 큐·이어하기·스테이지 진행) 스키마는 별도 마이그레이션으로 다음 차례에.
