# 문법 레벨 1~5 정의 + 통합 스키마 설계 (초안 — 확인 후 마이그레이션 작성)

전제(확정): 개념 72개 · 난이도순 — `GRAMMAR_NEURON_MIDDLE3_CONCEPTS.md`. 문법 엔진은 `grammar_concepts` 허브 하나로 통합. 이번 단계는 **additive(추가만)** — 기존 테이블/화면은 건드리지 않는다.

## 1. 레벨 1~5 정의 (제안)
레벨 = **학생이 받는 콘텐츠의 눈높이**. 개념 tier(개념 자체 난이도)와는 별개 축이다.

| 레벨 | 대상 | 설명 | 예문 | 퀴즈/문제 | 드릴 |
|---|---|---|---|---|---|
| L1 | 중1 / 문법 첫 접촉 | 한국어 위주, 용어 최소, 그림·표 중심, 한 번에 한 포인트 | 4~7단어, 초등 필수어휘 | 형태 확인(고르기·빈칸) | 따라 쓰기 + 쉬운 빈칸 |
| L2 | 중2 | 한국어 설명 + 핵심 영어 용어(주어·목적어 등) | 6~9단어, 교과서 어휘 | 형태 확인 + 간단한 오류 찾기 | 빈칸 + 틀린 곳 1개 고치기 |
| L3 | 중3 내신 표준 | 규칙 전체(예외 포함), 비교되는 짝을 나란히 | 8~12단어, 내신 기출 수준 | 오류 고치기·구별, 4유형(개수/맞는 것/다른 것/이유) | 빈칸 + 고치기 + 이유 쓰기 |
| L4 | 중3 상위 / 고1 진입 | 구문 전환·변형 원리, 한·영 병기 | 12~16단어, 복문 | 구문 전환, 헷갈리는 구문 구별, 서술형 | 문장 전환·영작 |
| L5 | 고등 내신/수능 대비 심화 | 영어 설명 + 예외·함정·문맥 판단 | 15단어 이상, 학술·논설 문체 | 개수 세기·복합 오류·어법 판단 지문형 | 지문 속 어법 + 서술형 |

- 현재 중학내신 레슨 4개(동아 M2, 문제 초급6/중급8/고급8)는 **L3 기준 내용**으로 보되, 한 레슨 안의 basic/intermediate/advanced는 "난이도 단계"이지 레벨이 아님. (임포트 시 레벨 지정 필요 — 미결정 1)
- 레벨을 바꾸는 것: 설명 문체·어휘, 예문 길이, 문항 유형 비중, 드릴 방식. **정답 규칙(사실)은 레벨과 무관하게 동일**해야 하므로 AI 생성 시 "개념 핵심 규칙 세트"를 공통 입력으로 고정한다.

### 어떤 개념에 어떤 레벨 콘텐츠를 만들까 (제안)
- 개념 tier(1~5)에 대해 **필수 레벨 = tier−1 ~ tier+1** (범위 1~5로 자름). 72개념 × 평균 3 = 약 215개 레슨 버전.
- 필수 밖 레벨은 선택(필요할 때 생성). 학생 레벨이 필수 범위 밖이면: 아래쪽(너무 쉬움)은 복습 카드, 위쪽(너무 어려움)은 "아직 이 개념은 잠김".
- 학생 레벨이 L 인 학생에게 개념 노출 조건: `tier ≤ L + 1`.

## 2. 스키마
설명 포맷은 기존 `GrammarLesson`(설명 → 예문 모음 → 깜지 → 빈칸 → Drill → 문제) JSON을 **그대로** 담는다 → 기존 4개 레슨을 변환 없이 이관, 검수 화면(`/admin/middle-naesin/.../grammar/[contentId]`) 로직 재사용.

```sql
-- 개념 허브 (교재/프로그램 중립)
grammar_concepts(
  id uuid pk, key text unique,            -- 'relative-object'
  title_ko text, title_en text,
  tier smallint check (tier between 1 and 5),
  difficulty_rank int,                    -- 전역 학습 순서
  category text,                          -- '시제','관계사' 등 챕터 그룹
  status text default 'draft'
)
grammar_concept_links(concept_id, related_id, relation text) -- 'contrast' | 'prereq'

-- 교재/단원 (목차)
grammar_books(id, key unique, title, publisher, grade, kind text) -- external | textbook | own
grammar_book_units(id, book_id, chapter_no, chapter_title, unit_no, title, page, sort_order)
grammar_unit_concepts(unit_id, concept_id, taught_level smallint null, sort_order) -- N:N

-- 레벨별 레슨 (개념 × 레벨)
grammar_lessons(
  id uuid pk, concept_id, level smallint check (level between 1 and 5),
  status text default 'draft',            -- draft | final (학생은 final만)
  lesson jsonb not null,                  -- 기존 GrammarLesson 포맷
  source text,                            -- ai | manual | imported
  ai_review jsonb, reviewed_by, reviewed_at,
  unique (concept_id, level)
)

-- 문항 은행 (Daily Test·퀴즈·약점분석이 개별 문항을 뽑을 수 있게 정규화)
grammar_items(
  id uuid pk, concept_id, level smallint, lesson_id null,
  kind text,        -- choice | fill | fix | count_wrong | reason | writing ...
  payload jsonb,    -- 문제문·보기·정답·해설
  status text, source text, ai_review jsonb
)

-- 학생
grammar_student_levels(student_id uuid pk, level smallint, set_by text, updated_at) -- 배치/선생님 지정
grammar_mastery(student_id uuid, concept_id, level, attempts int, correct int, last_at, state text,
                primary key (student_id, concept_id, level))
grammar_responses(id, student_id, item_id, answer jsonb, is_correct bool, created_at)
```

- `student_id` = **auth.users.id** 권장 (Daily Test·grammar_2026이 이미 사용, `academy_students.auth_user_id`로 연결).
- `grammar_lessons.lesson` 안의 `questions`는 저장 시 `grammar_items`로 **복사 동기화**(레슨 확정 시). 단일 출처는 lesson, items는 조회·채점·Daily Test용 사본.
- 기존 `grammar_quiz_items.element_code` ↔ 개념은 **매핑표**(`element_code → concept_id`)로 나중에 연결(이번엔 제외).
- 기존 `grammar_2026_*`, `jr_grammar_chapters`, 중학내신 `extra_data.lesson` 은 **유지**. 새 구조가 자리 잡으면 점진 이관.

## 3. 제작 파이프라인 (개념 × 레벨)
1. 공통 입력: 개념 핵심 규칙 세트(레벨 무관) + 해당 레벨 정의(1번 표) + `GRAMMAR_EXAMPLE_RULES.md`.
2. AI 생성 → `draft` 저장.
3. **다른 패스 AI 검수**(문법 정확성·정답 유일성·레벨 적합성) → `ai_review`.
4. 선생님 검수 → `final`.
5. 확정 시 `grammar_items` 동기화.

## 4. 마이그레이션 단계 (모두 additive)
- P0: 위 테이블 생성 (RLS: 읽기=final만 학생, 쓰기=admin/teacher). **수동 적용, 주말/저녁.**
- P1: 시드 — 책 1권 + 121유닛 + 72개념 + 유닛↔개념 (`scripts/grammar-toc/*.ts` 에서 생성).
- P2: 기존 중학내신 레슨 4개를 `grammar_lessons`(해당 개념, 지정 레벨, `imported`)로 이관.
- P3: 관리자 화면(개념 목록·레벨별 생성/검수), 학생 화면(레벨에 맞는 레슨 노출).
- P4: mastery 기록 → Daily Test 문법 섹션·약점분석 연결.

## 5. 미결정 (확정 필요)
1. 기존 동아 M2 레슨 4개를 몇 레벨로 이관할지 (제안: L3).
2. 레벨 정의 표 OK 여부 — 특히 L1~L5 대상 학년·문체.
3. 필수 레벨 범위 `tier±1` 적용 여부(콘텐츠 양 ≈ 215버전 — AI 생성+검수 부담).
4. 학생 레벨 결정 방식: 레벨테스트 연동 / 선생님 지정 / 개념별 자동 승급.
5. `student_id` = auth.users.id 로 통일 OK 여부.
6. 교재를 `grammar_books`로 새로 둘지, `middle_naesin_units` 확장할지 (제안: 새 테이블 — 외부교재·자체교재까지 수용).
