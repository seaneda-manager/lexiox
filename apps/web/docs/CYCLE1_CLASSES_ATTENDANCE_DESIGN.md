# Cycle 1 설계 (v3): 반 + 출석 체크 + 수업 진행 보드

상태: **설계안. DB는 바꾸지 않음.** 마이그레이션 파일 `supabase/migrations/20261004000001_classes_attendance_core.sql` 작성됨(미적용).
작성일: 2026-10-03 / v3: "자동 출석 불필요" 결정 반영 (v2의 IP·접속 신호·학원 네트워크 전부 삭제)

## 0. 확정된 사실

1. **수업 = 같은 시간에 여러 명이 강의실에 들어옴.** 학생마다 흐름이 있다:
   `숙제 검사 → 오답 체크·수정 → 하브루타 준비 → (나중에) 하브루타 1:1 질문 받기`
   → **출석만이 아니라 "수업 안의 진행 단계"가 핵심 데이터.**
2. **출석은 교사가 체크한다. 자동 출석은 하지 않는다.** (기본 전원 출석, 예외만 수정)
3. **지각 기준은 5분, 최종 판단은 교사.**
4. **시간표는 지금은 크게 쓰지 않지만, 장차 학원별 커스터마이즈 가능해야 함.**

## 1. 목표 (북극성 지표)

- 한 반 출석 체크: **교사 30초 이내** (기본값이 전원 출석이므로 예외만 탭)
- 교사가 "지금 누가 어느 단계인가"를 **한 화면**에서 확인
- 원장이 "오늘 누가 안 왔나 / 어느 반 출석이 안 찍혔나"를 한 화면에서 확인
- 결석·지각 데이터가 남고, Cycle 2의 학부모 알림이 이를 트리거로 사용

범위 밖: 수납, 급여, 알림 발송(Cycle 2), 지점 분리, 보강 자동 배정, 단계 자동 판정, **자동 출석**.

## 2. 현황 (운영 DB 읽기 전용 조회)

| 자산 | 상태 |
|---|---|
| `academy_classes` / `academy_class_students` / `academy_class_meetings` | 존재, **0행**, 교사·관리자 RLS 있음. `daily_tests`·`lecture_assignments`·`vocab_test_sessions` 가 `class_id`로 이미 참조 |
| `deepcheck_sessions`, `review_items`, `homework_results` | 하브루타 준비 / 오답 복습 / 숙제 데이터 존재 (후속 단계 자동 판정에 활용 가능) |
| `organizations` | 있음. `academy_classes.org_id` 가 참조 → 학원별 커스터마이즈 기반 존재 |
| 출석 / 수업 회차 테이블 | **없음** |

> **학생 ID 규칙(스키마 대조로 확정):** 새 테이블의 `student_id` 는 모두 `profiles(id)` (= auth user id).
> 기존 `academy_class_students.student_id` 가 `profiles(id)` 를 참조하므로 반 소속과 매핑 없이 연결된다.
> (`student_vocab_*` 등은 `academy_students.id` 를 쓰므로 그쪽과 연결할 때만 변환 필요.)
> 기존 PK `(class_id, student_id)` 때문에 같은 반 재입반은 새 행이 아니라 `left_on` 을 null로 되돌리는 방식.

## 3. 설계 원칙

1. 기존 테이블 확장, 신규는 최소: 신규 테이블 **4개** (수업 회차 / 출석 / 진행 단계 정의 / 학생별 진행).
2. **expand-only** 마이그레이션 (컬럼·테이블 추가만). 나중에 자동 출석이 필요해지면 컬럼만 추가하면 된다.
3. **템플릿(`academy_class_meetings`)과 실제 회차(`class_sessions`) 분리**: 시간표를 바꿔도 과거 기록 불변. 휴강/보강/임시수업은 회차에서 처리.
4. **진행 단계는 학원별 설정값**: 4단계는 *기본 템플릿*일 뿐, 정의 테이블로 분리해 학원마다 바꿀 수 있게.
5. RLS는 교사/관리자 전용. 무제한 `true` 정책 금지.

## 4. 데이터 모델

마이그레이션 파일 그대로: `supabase/migrations/20261004000001_classes_attendance_core.sql`

| 변경 | 내용 |
|---|---|
| `academy_classes` 확장 | `teacher_id`, `is_active`, `flow_key` |
| `academy_class_students` 확장 | `joined_on`, `left_on` (반 이동해도 과거 맥락 보존) |
| `class_sessions` (신규) | 날짜가 있는 실제 수업. `kind`(regular/makeup/extra), `status`(scheduled/held/cancelled), `unique(class_id, session_date, start_time)` 로 자동 생성 멱등 |
| `attendance_records` (신규) | `status`(present/late/absent/excused), `note`, `marked_by`, `notified_at`(Cycle 2용, 비움). `unique(session_id, student_id)` |
| `session_flow_steps` (신규) | 단계 정의 (org_id NULL = 기본). 기본 4단계 시드 포함 |
| `session_student_steps` (신규) | 수업 안에서 학생이 어느 단계를 완료했나 (`done_at`, `done_by`, `note`) |

## 5. 회차 생성

> **구현됨(DB 불필요):** `lib/classes/generateSessions.ts` (순수 함수) + 테스트 23개. 요일은 프로젝트 공통 규칙
> `weekday: 0=일 .. 6=토` (JS `getDay()`), 날짜 계산은 UTC 라 KST 로컬 실행에서도 같은 결과(검증함).
> `academy_class_meetings.weekday` 도 이 규칙으로 저장한다.

- `academy_class_meetings`(요일·시작시간) → 앞으로 **14일치** `class_sessions` 멱등 insert.
- 실행 시점: 교사가 수업 화면을 열 때 그 날짜 보장 + 매일 크론 1개(기존 Vercel 크론 3개 옆에 추가).
- 휴강은 회차의 `status='cancelled' + cancel_reason`. 이미 만든 회차는 템플릿을 바꿔도 불변.

## 6. 화면: 수업 진행 보드 (이 사이클의 핵심)

교사가 수업 중 보는 한 화면: **학생(행) × 단계(열)** 격자.
- **출석 열**: 기본 🟢 출석. 탭하면 지각/결석/사유결석으로 변경, 메모 가능. **저장하지 않은 수업은 "미체크" 배지** (누락 방지).
- **단계 열**: 탭해서 완료 표시 (Cycle 1은 수동). 한 줄 메모 가능.
- **하브루타 1:1 대기 정렬**: 준비 완료한 학생이 위로 올라와 다음 호출 대상이 바로 보임.
- 후속(범위 밖): 기존 데이터로 단계 자동 완료 — `homework_results`(숙제 검사) / `review_items`(오답 수정) / `deepcheck_sessions`(하브루타 준비). 실제 사용 데이터를 본 뒤 정확도를 판단하고 도입.

## 7. 구현 순서와 게이트

| 단계 | 내용 | 게이트 |
|---|---|---|
| 1 | 마이그레이션 작성 + **운영 스키마 전수 대조** | ✅ 완료 (충돌 0, 타입 일치) |
| 2 | **DB 적용** (사용자가 직접 실행) + RLS 검증 | **별도 승인** |
| 3 | `/admin/classes` CRUD (현재 TODO 교체), 진행 단계 설정 | 로컬 확인 |
| 4 | 회차 생성(14일치 멱등) + 크론 + **단위 테스트(멱등성)** | |
| 5 | `/teacher/session/[sessionId]` 진행 보드 | 사용자가 실제 수업에서 확인 |
| 6 | `/admin/attendance` 오늘 현황판 + 학생 상세 출석 이력 | |

## 8. 열린 질문 (구현 중 자연스럽게 확인, 막지 않음)

1. 수업 시간은 반마다 다른가요? (기본값 90분으로 시드, 반별로 수정 가능하게 구현)
2. 하브루타 1:1은 교사가 한 명씩 호출하는 방식인가요? (보드의 "대기 정렬" 우선순위 결정)

## 9. 위험

| 위험 | 대응 |
|---|---|
| 교사가 출석/보드를 안 씀 | 출석은 기본 전원 출석 + 예외 탭만, 미체크 배지, 첫 2주 실사용 피드백 필수 |
| 단계 정의가 학원마다 다름 | 정의 테이블 분리, 하드코딩 금지 |
| RLS 실수 | 오늘 확립한 절차: 스키마 대조 → 직접 실행 → 읽기 전용 검증 → repair |
| 나중에 자동 출석 요구 | expand-only 라 컬럼/테이블 추가로 대응 가능 |
