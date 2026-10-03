# Supabase 마이그레이션 폴더 통합 계획

상태: **Phase A, B, C 완료 (2026-10-03). Phase D(이력 repair)는 미실행 — 별도 승인 필요.** 각 단계(Gate)마다 승인 후 진행.

- A: 백업 브랜치 `backup/pre-supabase-consolidation`, 스냅샷 `docs/supabase-snapshot-2026-10-03/`
- B: 루트 103개 중 repair 대상 101개, 제외 2개(`20260626000003`, `20260722103000`). 결과 `phaseB-result.md`
- C: 루트 103개를 `apps/web/supabase/migrations`로 복사(191개, 버전 중복 0, 해시 일치). 충돌 3개는 새 버전으로 복사. 루트 원본은 그대로.
- 현재 `npm run migrations:check` 미적용 104개 = 루트 복사분 103 + `20260923000001`(RLS/버킷 보안 수정, 별도 확인 필요)
작성일: 2026-10-03

## 1. 현황 (조사 결과)

| | 루트 `supabase/migrations` | `apps/web/supabase/migrations` |
|---|---|---|
| 파일 수 | 103 | 88 |
| 주 사용 시기 | 2025-09 ~ 2026-06, 그리고 9/27~28 3개 | 2026-07 ~ 2026-09 |
| 운영 DB 이력(`schema_migrations`) | **기록 없음** (콘솔에서 수동 적용) | 88개 전부 일치 |
| 같은 파일명 | 0개 | 0개 |

- 두 폴더 모두 같은 프로젝트(`efpghmqpitukeisugkmt`)에 연결됨.
- **두 폴더를 합친 191개가 DB의 완전한 역사**다. 한쪽만으로는 불완전하다.
- 6월 이후 루트 마이그레이션이 만드는 테이블을 운영 DB와 대조한 결과, 2개만 없음
  (`toefl_practice_passages`, `toefl_practice_questions` ← `20260626000003_toefl_practice_content.sql`).
  코드는 이 테이블을 쓰고 있음 → 별도 처리(§5).
  ※ `CREATE TABLE`만 대조했음. 컬럼/함수/정책/6월 이전은 미검증(§4 Phase B에서 확장).

## 2. 통합 시 실제로 터질 수 있는 지점

1. **`db push` 재실행 사고 (가장 위험).** 루트 파일을 복사한 직후 이력(repair) 없이 `supabase db push`를 하면
   CLI가 103개를 "미적용"으로 보고 옛 SQL을 다시 실행하려 한다. 비멱등 SQL(ALTER, DROP, INSERT 등)이면 실패하거나 데이터가 바뀐다.
   → **repair(이력 표시)가 반드시 먼저, push는 그 뒤.**
2. **버전 번호 충돌.** 같은 버전이 두 번 존재하면 CLI가 거부한다.
   - `20260821000001`: 루트 `middle_naesin_assignments` ↔ web `level_test_adaptive` (서로 다른 파일)
   - 루트 내부 중복 `20260722`: `create_student_progress` / `disable_rls_vocab_set_items`
   → 충돌하는 쪽만 **새 버전으로 복사**(원본은 그대로). 새 버전은 실행 시점에 빈 번호인지 재확인.
3. **과거 순서 삽입.** 루트의 옛 버전(2025-09~2026-06)은 운영 최신 이력보다 과거라서
   CLI가 "최신 이력보다 이전 파일" 오류를 낸다. repair로 해소되며, `--include-all`은 쓰지 않는다.
4. **"적용됨" 오표시.** 실제로는 안 들어간 마이그레이션을 repair로 "적용됨"이라고 표시하면
   이후 영원히 안 들어간다. → 검증 통과한 것만 repair, 애매하면 사람 검토 목록으로.

## 3. 원칙

- **삭제 없음.** 루트 폴더와 그 안의 모든 파일(`sql/`, `supabase/`, 이상한 이름의 파일 포함)은 그대로 둔다. 복사만 한다.
- **운영 DB의 데이터·스키마는 건드리지 않는다.** 바꾸는 것은 이력 표(`supabase_migrations.schema_migrations`)뿐이며,
  `repair`로 추가한 행은 `repair --status reverted`로 되돌릴 수 있다.
- 실행 시각은 저녁/주말(트래픽 낮을 때). 이력 변경 직전에 백업을 남긴다.
- 단계마다 멈추고 결과 보고 → 승인 → 다음 단계.

## 4. 단계

### Phase A — 안전망 (읽기 전용 + 로컬)  ·  위험: 없음
1. git 백업 태그/브랜치 생성: `backup/pre-supabase-consolidation`
2. 현재 이력 스냅샷 저장: `supabase migration list --linked` 결과, 운영 스키마 타입(`gen types`)
3. 루트/웹 파일 목록과 해시(sha256) 목록 저장 → 나중에 "복사본이 원본과 동일한지" 검증용

### Phase B — 적용 여부 정밀 검증 (읽기 전용)  ·  위험: 없음
- 루트 103개 각각에서 만들거나 바꾸는 객체(테이블, **컬럼**, 함수, 인덱스, 정책)를 추출해
  운영 스키마와 대조한다. (현재는 테이블만 확인됨)
- 결과를 3분류: ✅ 모두 존재 / ❌ 일부 없음 / ❓ 자동 판단 불가(INSERT·UPDATE 데이터 변경 등)
- ❌/❓는 repair 대상에서 제외하고 사용자와 개별 검토.

### Phase C — 복사 (로컬 파일만)  ·  위험: 낮음
1. 루트 → `apps/web/supabase/migrations/` 로 **복사** (원본 유지)
2. 충돌 2건만 새 버전으로 이름 변경 후 복사 (§2-2)
3. 복사본 해시가 원본과 동일한지 검증, 버전 중복 0개 확인
4. `apps/web/supabase/README.md` 에 규칙 추가 (§6)
- 아직 DB에는 아무 영향 없음. `git diff`로 리뷰 가능.

### Phase D — 이력 맞추기 (운영 DB 이력 표 변경)  ·  위험: 중간 ← **별도 승인, 저녁/주말**
1. 직전 이력 스냅샷 재저장
2. Phase B에서 ✅ 로 분류된 버전만 `supabase migration repair --status applied <버전...>` (소량씩 배치)
3. 배치마다 `migration list`로 반영 확인
4. 문제 시: `repair --status reverted <버전>` 으로 해당 행 제거 (스키마 영향 없음)

### Phase E — 최종 검증  ·  위험: 없음
- `npm run migrations:check` → 미적용이 **의도한 것(§5)만** 남았는지
- `supabase db push --dry-run` → 의도한 것 외에 실행 예정 항목이 0개인지 (**dry-run만, 실제 push 금지**)
- `gen types` 결과가 Phase A 스냅샷과 동일한지 (= DB가 그대로임을 증명)

### Phase F — 재발 방지
- 새 마이그레이션은 `apps/web/supabase/migrations` 에서만 생성
- `migrations:check` 에 "루트 `supabase/migrations` 에 새 파일이 있으면 경고" 추가
- 적용은 콘솔 수동 대신 `supabase db push` (이력이 자동으로 남음)

## 5. 별도 처리: TOEFL 연습 테이블 2개

`toefl_practice_passages`, `toefl_practice_questions`는 운영 DB에 없고 코드(관리자 TOEFL 연습 저장, 학생 챕터 연습)는 사용 중.
- 통합과 분리해서 먼저/나중에 처리 가능. SQL 내용을 검토해 안전성 보고 후 적용 시점 결정.
- 이 마이그레이션은 Phase D의 repair 대상에서 제외(적용 전까지는 "미적용"으로 남아야 정상).

## 6. 폴더 규칙 (README에 넣을 내용)

- 마이그레이션의 정본은 `apps/web/supabase/migrations/` 하나다.
- 저장소 루트 `supabase/` 는 과거 기록 보존용. 새 파일을 만들지 않는다.
- 버전은 `YYYYMMDDNNNNNN_설명.sql`, 중복 금지.
- CLI는 반드시 `apps/web` 에서 실행한다.

## 7. 알려진 한계

- Phase B의 자동 대조는 SQL을 정적으로 읽는 방식이라 100%는 아니다. 데이터 변경(INSERT/UPDATE) 마이그레이션은 사람이 판단해야 한다.
- 루트 `supabase/sql/*.sql` 과 `ALL_IN_ONE_idempotent.sql` 은 마이그레이션이 아니라 초기 스키마 스냅샷으로 보이며 이번 범위에서 제외.
