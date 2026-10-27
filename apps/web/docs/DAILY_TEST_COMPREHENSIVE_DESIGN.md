# 종합 Daily Test 설계안 (초안 — 확인 후 구현)

## 확정된 결정 (2026-10-28)
- 구성: **자동 생성 + 선생님 조정** — 학생의 커리큘럼·진도로 매일 초안을 자동 구성하고, 선생님이 섹션/문항을 바꾸거나 승인한다.
- 채점: Writing(서술형)·Speaking은 **AI 1차 채점 + 선생님 확인**.
- 범위: 설계안 먼저. DB 스키마 변경이 있으므로 이 문서 확인 후 구현.

## 현재 상태 (코드 확인)
- `daily_tests` 테이블: `complete_words_ids / daily_life_ids / academic_passage_ids`(+ listening 컬럼) 만 가짐 → **TOEFL Reading/Listening 문제은행 전용**.
- 학생 화면 `/student/daily-tests`, 풀이 `DailyTaskPlayer`, API `/api/daily-task/generate`·`[id]/submit` 모두 위 3~5개 문제 종류만 처리.
- 단어(`student_vocab_assignments`/`vocab_set_items`), 문법(`grammar_quiz_items`), 말하기(`speaking_attempts`), 쓰기(2026 writing)는 **각자 따로 있고 Daily Test와 연결 안 됨**.
- `curriculum-router.ts`의 TOEFL phase에만 `daily_tests`가 있고 lexiox_*/hi_naesin phase엔 없음.

## 목표 구조
하루치 Daily Test = **섹션 목록**. 섹션은 `vocab / reading / grammar / writing / speaking` 중 커리큘럼별로 선택.

| 커리큘럼 | 기본 섹션 (초안) |
|---|---|
| toefl | 단어, Reading(문제은행), Grammar(grammar-2026 퀴즈), Writing, Speaking |
| lexiox_jr | 단어, Reading, Grammar, Writing(문장 단위 서술형), Speaking(짧은 답) |
| lexiox_middle | 단어, Reading, Grammar, Writing, Speaking |
| lexiox_high | 단어, Reading, Grammar, Writing, Speaking |
| hi_naesin | 단어, Reading(내신 지문), Grammar, Writing(서술형) — Speaking 선택 |

섹션별 문제 출처(자동 생성 시 뽑는 곳):
- 단어: 그날 학습 완료한 Day 범위 + 최근 오답 단어 (기존 vocab test 로직 재사용)
- Reading: TOEFL=문제은행, 그 외=해당 레벨 지문 (출처 테이블은 구현 전 확인 필요)
- Grammar: `grammar_quiz_items`에서 학생 track/요소(element_code) 기준 + 약한 요소 우선
- Writing: 서술형 프롬프트 은행(없으면 신설) → AI 채점
- Speaking: `speaking_attempts` 프롬프트 재사용 → 녹음→전사→AI 채점

## 데이터 모델 (변경안, 마이그레이션 = 수동 적용 필요)
기존 `daily_tests`는 유지(TOEFL 호환)하고 신규 확장:
1. `daily_test_sets` — 학생·날짜별 1건: `student_id, curriculum, test_date, status(draft|published|in_progress|submitted|graded), created_by, auto_generated bool`
2. `daily_test_sections` — `set_id, kind(vocab|reading|grammar|writing|speaking), position, items jsonb(출처 id 목록), status, score, max_score`
3. `daily_test_responses` — `section_id, item_ref, answer jsonb, auto_score, ai_score, teacher_score, ai_feedback, teacher_comment, audio_url, transcript`
- 객관식·단어는 즉시 자동 채점, 서술형·말하기는 `ai_score` → 선생님 확인 시 `teacher_score` 확정.

## 흐름
1. 매일 새벽 크론(또는 선생님 "오늘 것 생성" 버튼)이 학생별 draft 세트 생성.
2. 선생님이 `/admin/daily-tests`·`/teacher/...`에서 섹션/문항 교체, 섹션 제외(예: 시험기간), 게시.
3. 학생은 `/student/daily-tests`에서 섹션 순서대로 풀이 (기존 TOEFL 과제도 같은 목록에 계속 표시).
4. 제출 시 객관식 즉시 채점, 서술형·말하기는 AI 채점 후 "선생님 확인 대기".
5. 선생님이 확인/수정 → 학생 결과·학부모 리포트에 반영.

## 단계 (제안)
- A. 마이그레이션 3개 + 타입 + 세트 생성 로직(vocab/grammar/reading 우선) + 학생 목록/풀이(객관식 섹션)
- B. 선생님 조정 UI(초안 검토·교체·게시)
- C. Writing 섹션 (프롬프트 은행 + AI 채점 + 선생님 확인)
- D. Speaking 섹션 (녹음·전사·AI 채점 + 선생님 확인)
- E. curriculum-router phase 연결, 대시보드 카드, 학부모 리포트 반영

## 구현 전 확인 필요 (미결정)
1. 섹션 문항 수/소요 시간 목표 (예: 하루 30분?) — 커리큘럼별 기본값.
2. lexiox_* / hi_naesin Reading·Writing·Speaking **실제 콘텐츠 출처**가 충분한지 (없으면 AI 생성 후 검수 필요 — 학원 콘텐츠 품질 기준).
3. 자동 생성 시점(매일 새벽 크론 vs 선생님 수동) 및 숙제·정규 스케줄과의 중복 방지.
4. 기존 `daily_tests`(TOEFL 문제은행 과제)를 새 구조로 이관할지, 병행할지.
5. 마이그레이션은 위험 작업이므로 적용 시점(주말/저녁) 지정.
