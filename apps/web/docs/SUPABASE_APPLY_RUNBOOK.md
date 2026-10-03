# 운영 DB 적용 실행 순서 (사용자가 직접 실행)

작성일: 2026-10-03. 모든 명령은 **`apps/web` 에서** 실행. **`supabase db push` 는 쓰지 않는다** (옛 SQL 103개 재실행 위험).
각 단계 후 검증을 통과해야 다음 단계로 간다. 문제가 있으면 멈추고 알려 달라.

## 0. 롤백 자료 (이미 준비됨)
- 현재 정책 정의: `docs/supabase-snapshot-2026-10-03/policies-before-fix.json` (57개)
- 이력 스냅샷: `docs/supabase-snapshot-2026-10-03/migration-list.txt`

## 1. 보안 수정 적용 (가장 급함)  — `20260923000001`

현재 운영에는 새 정책 0/17, 무제한 정책 19개가 남아 있다. 파일 전체가 `BEGIN/COMMIT`이라 실패하면 전부 취소된다.

```bash
supabase db query --linked -f supabase/migrations/20260923000001_fix_linter_permissive_rls_and_buckets.sql
```

검증 (읽기 전용):
```bash
supabase db query --linked "select count(*) as new_policies from pg_policies where policyname in ('lectures_staff_insert','vocab_tracks_staff_insert','middle_naesin_units_staff_insert','student_vocab_plans_own_or_staff_insert')"
```
기대값: 4

화면 확인: 관리자로 강의 / 어휘 트랙 / 중학내신 단원 저장, 학생(테스트 계정)으로 단어 학습 진행 저장.
(계정 구성: 학생 20명 + 관리자 1명 → `is_staff()` 가 빠뜨리는 역할 없음, 확인 완료)

## 2. 드릴 결과 정책  — `20261003000001`
1단계가 다루지 않은 `middle_naesin_drill_results` 의 `open` 정책 교체.
```bash
supabase db query --linked -f supabase/migrations/20261003000001_fix_middle_naesin_drill_results_rls.sql
```
화면 확인: 학생으로 중학내신 드릴 1개 풀고 저장 → 교사/관리자 `middle-naesin-drill-results` 에서 보이는지.

## 3. TOEFL 연습 테이블  — `20260626000003`
테이블 2개 신규 생성 (기존 데이터 영향 없음, 의존 enum 존재 확인 완료).
```bash
supabase db query --linked -f supabase/migrations/20260626000003_toefl_practice_content.sql
```
화면 확인: 관리자 TOEFL 연습 콘텐츠 저장, 학생 챕터 연습 열기.

## 4. 이력 맞추기 (Phase D) — 테이블/데이터 변경 없음, 이력 표만
1~3단계에서 적용한 3개 + 과거 수동 적용분 101개를 "적용됨"으로 기록한다.
`20260722103000_add_default_vocab_book` 은 **제외** (컬럼이 실제로 없음, 코드 미사용).

```bash
# 과거 수동 적용분 101개
supabase migration repair --status applied $(cat docs/supabase-snapshot-2026-10-03/repair-versions.txt)
# 이번에 적용한 3개 (1~3단계가 끝난 뒤에만)
supabase migration repair --status applied 20260923000001 20261003000001 20260626000003
```
※ PowerShell 이면 `$(cat ...)` 대신:
`supabase migration repair --status applied (Get-Content docs/supabase-snapshot-2026-10-03/repair-versions.txt).Split(' ')`

되돌리기(이력만): `supabase migration repair --status reverted <버전...>` — 스키마 영향 없음.

## 5. 최종 검증
```bash
npm run migrations:check     # 남는 것은 20260722103000 (의도된 미적용) 1개여야 함
```
그 뒤 `supabase/README.md` 의 "db push 금지" 경고를 지운다.

## 정책 롤백이 필요할 때
`policies-before-fix.json` 의 정의로 정책을 복원한다. (필요하면 이 JSON에서 복원 SQL 생성 가능 — 요청하면 만들어 드림)
