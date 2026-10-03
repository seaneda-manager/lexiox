# Supabase 마이그레이션 (정본 폴더)

이 폴더 `apps/web/supabase/migrations/` 가 마이그레이션의 **정본**이다.

## ⚠️ 지금은 `supabase db push` 금지 (통합 진행 중)

2026-10-03에 저장소 루트 `supabase/migrations/` 의 103개를 이 폴더로 **복사**했다.
이 파일들은 과거에 콘솔에서 수동 적용되어 운영 DB의 이력 표(`schema_migrations`)에 기록이 없다.
이력을 맞추기(Phase D) 전에 `db push`를 하면 옛 SQL이 **다시 실행**된다.

- 진행 상황과 계획: `docs/SUPABASE_MIGRATION_CONSOLIDATION.md`
- 현재 상태 확인(읽기 전용): `npm run migrations:check`
- Phase D 완료 후 이 경고를 지운다.

## 규칙

- 새 마이그레이션은 **이 폴더에만** 만든다. 저장소 루트 `supabase/` 는 과거 기록 보존용이며 새 파일을 만들지 않는다.
- 파일명: `YYYYMMDDNNNNNN_설명.sql`. **버전(앞 숫자)은 중복 금지.**
- Supabase CLI는 반드시 `apps/web` 에서 실행한다 (루트에서 실행하면 다른 폴더를 본다).
- 적용은 콘솔 수동 대신 `supabase db push`를 쓴다 (이력이 자동으로 남는다). 단, 위 경고가 풀린 뒤.

## 복사 시 이름이 바뀐 파일 (버전 충돌 해소)

| 원본(루트) | 이 폴더 |
|---|---|
| `20260722_create_student_progress.sql` | `20260722000001_create_student_progress.sql` |
| `20260722_disable_rls_vocab_set_items.sql` | `20260722000002_disable_rls_vocab_set_items.sql` |
| `20260821000001_middle_naesin_assignments.sql` | `20260821000003_middle_naesin_assignments.sql` |

## 운영 DB에 실제로는 없는 마이그레이션 (의도된 미적용)

- `20260626000003_toefl_practice_content.sql` — TOEFL 연습 테이블 2개 (코드는 사용 중, 적용 필요)
- `20260722103000_add_default_vocab_book.sql` — 코드가 쓰지 않는 컬럼 (사실상 폐기)

이 둘은 "적용됨"으로 표시(repair)하지 않는다.
