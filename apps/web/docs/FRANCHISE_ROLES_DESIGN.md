# 가맹점 · 역할 · 권한 설계서 (개발용)

> 상태: **1단계(UI) 완료 · 2-A(스키마) SQL 작성 완료 — 적용 대기** — 작성·갱신 2026-11-05
> 관련 문서: [영업·교육용 설명서](FRANCHISE_SALES_MANUAL.md) · `lib/auth/permissions.ts` · `components/dashboard/staffNav.ts`
> 이 문서는 "이 프로그램을 만들 때" 기준 문서다. 스키마 변경은 **승인 후** 진행한다(아래 §7).

---

## 0. 한 장 요약

| 항목 | 내용 |
|---|---|
| 목표 | 본사(직영 포함) · 가맹점 원장 · 선생님이 **각자 필요한 화면과 데이터만** 보게 한다 |
| 핵심 원칙 | ① 원장 ⊇ 선생님 ② 선생님 직급별 권한은 **원장이 정한다** ③ 메뉴는 역할이 아니라 **권한 키**에 건다 ④ 권한은 **서버에서 강제**한다 |
| 지금 되는 것 | 역할별 메뉴, Super의 역할 미리보기, 원장 홈·선생님 홈·본사 허브 (모두 권한 키 기반, **DB 변경 없음**) |
| 아직 안 되는 것 | 가맹점(지점) 구분, 직급·권한 저장, 계정 발급 화면, 데이터 격리(가맹점끼리 못 보게) |
| 가장 큰 위험 | 서비스 키(service role)를 쓰는 코드가 많아 **RLS를 우회**한다 → 격리는 앱 코드에서 직접 걸어야 한다 |

---

## 1. 현재 상태 (사실, 2026-11-05 확인)

### 1.1 계정과 역할
- `profiles.role` 값은 `student` / `teacher` / `admin` 세 가지만 쓴다. **CHECK 제약은 없다**(문자열 컬럼) → 새 역할 값을 추가해도 제약 변경은 필요 없다.
- 계정 21개: 학생 20 + 관리자 1(= **Super 계정**, 대표님). **선생님 계정은 0개** — 선생님 화면은 지금까지 Super 계정으로만 확인됐다.
- `profiles`에 이미 있는 관련 컬럼: `is_admin`, `can_produce`(콘텐츠 제작 권한), `must_change_password`, `is_active`, `program`, `grade`, `phone`, `parent_phone`.

### 1.2 권한 검사가 있는 곳 (바꿔야 할 지점)
| 위치 | 현재 규칙 |
|---|---|
| `app/protected/admin/layout.tsx` | `role === 'admin'` 만 통과 (그 외 `/auth/forbidden`) |
| `app/protected/teacher/layout.tsx` | `student`만 막음 (선생님·관리자 통과) |
| `lib/classes/requireStaff.ts` | `admin` 또는 `teacher` |
| `lib/auth/requireTeacherOrAdmin.ts` | `admin` 또는 `teacher` |
| 각종 API/서버 액션 | 대부분 위 둘 중 하나 또는 자체 검사 |
| DB RLS 정책 (여러 마이그레이션) | `profiles.role = 'admin'` 을 **하드코딩** |

→ 새 역할(`franchisee`, `hq_staff`)을 추가하면 위 지점들이 모두 새 역할을 모른다. **`admin`은 계속 Super로 두고** 새 역할을 추가하는 방식이어야 기존 RLS·가드가 깨지지 않는다.

### 1.3 데이터 구분
- **`organizations` 테이블이 이미 있다** (`id, name, plan, created_at`, 현재 1행 "Main Academy"). 반(`academy_classes.org_id`)과 수업 진행 단계(`session_flow_steps.org_id`)가 이미 이것을 쓴다 → **가맹점 = `organizations`** 로 확정(새 `branches` 테이블은 만들지 않는다. 개념이 둘로 갈라지는 것을 피함).
- 하지만 **학생·계정(`academy_students`, `profiles`)에는 org 소속 컬럼이 없고**, 배정·시험·출석 조회는 org 로 걸러지지 않는다.
- 그래서 선생님은 전체 학생을 본다(예: `/api/teacher/vocab-exams/meta`는 전체 활성 학생 반환).
- 현재 데이터 규모: 학생 `academy_students` 15명, `profiles` 21개, 반 0개(아직 반이 만들어지지 않음).

### 1.4 계정 발급 경로 (현재)
- 학생: `/admin/students` 서버 액션이 서비스 키로 `auth.admin.createUser`(+`profiles` upsert) — **관리자 전용**.
- 역할 변경: `/admin/users` → `POST /api/admin/set-role` — **관리자 전용**, 선생님·원장 계정을 만드는 전용 화면은 없다.

### 1.5 1단계에서 만든 것 (구현 완료)
| 파일 | 역할 |
|---|---|
| `lib/auth/permissions.ts` | 권한 키 16개, 역할별 기본 권한, `hasPermission` |
| `lib/auth/viewAs.ts` | Super의 **역할 미리보기**(쿠키 `lx_view_as`). 진짜 `admin`만 전환 가능 |
| `components/dashboard/staffNav.ts` | **하나의 메뉴 정의**에서 권한으로 걸러 4개 역할 메뉴 생성 |
| `components/dashboard/board.tsx` | 원장·선생님 홈 / 본사 허브가 공유하는 보드 구성요소 |
| `/franchise/home` | 원장 홈 "오늘 현황" |
| `/teacher/home` | 선생님 홈 "오늘 할 일" (가짜 mock 데이터 제거) |
| `/admin/franchise` | 본사 허브 (가짜 숫자 제거, 공지·문의·교육·자료실은 "준비 중") |

> 1단계의 메뉴 필터는 **UI일 뿐 보안이 아니다.** 메뉴에서 숨겨도 URL로 직접 열 수 있다. 보안은 §4의 서버 강제로 완성한다.

---

## 2. 목표 모델

### 2.1 역할
| 역할 | DB 값 | 누구 | 데이터 범위 |
|---|---|---|---|
| Super | `admin` | 대표님 (기존 관리자) | 전체 + 시스템 설정 |
| 본사 직원 | `hq_staff` | 본사 스태프 | 전체 열람 + 콘텐츠·본사 허브 (시스템·권한 관리는 불가) |
| 원장 | `franchisee` | 가맹점 원장 | **자기 가맹점** 전체 (선생님 기능 포함) |
| 선생님 | `teacher` | 학원 선생님 | 자기 가맹점, **직급 권한 범위** |
| 학생 | `student` | 수강생 | 본인 |

### 2.2 권한 키 (`lib/auth/permissions.ts`)
| 키 | 설명 | 선생님 기본 | 원장 | 본사직원 | Super |
|---|---|:-:|:-:|:-:|:-:|
| `today.sessions` | 오늘의 수업 보기 | ● | ● | | ● |
| `attendance.check` | 출석 체크·조회 | ● | ● | | ● |
| `homework.grade` | 숙제 관리(결과 확인) | ● | ● | | ● |
| `students.view` | 학생 현황 보기 | ● | ● | ● | ● |
| `assign.manage` | 숙제·단어·시험 배정 | ● | ● | | ● |
| `exam.create` | 시험 출제·시험 설정 | ● | ● | | ● |
| `reports.view` | 리포트 보기 | ● | ● | ● | ● |
| `lesson_log.write` | 수업 로그 작성 | ● | ● | | ● |
| `students.manage` | 학생 추가·수정 | | ● | | ● |
| `guardians.view` | 학부모 연락처 보기 | | ● | | ● |
| `classes.manage` | 반·시간표 관리 | | ● | | ● |
| `branch.settings` | 가맹점 설정 | | ● | | ● |
| `branch.staff` | 선생님 직급·권한 관리 | | ● | | ● |
| `content.produce` | 콘텐츠 제작 | | | ● | ● |
| `branches.view_all` | 모든 가맹점 열람 | | | ● | ● |
| `franchise.hq` | 본사 허브 | | | ● | ● |
| `system.admin` | 사용자·권한·시스템 설정 | | | | ● |

### 2.3 직급(선생님) — 원장이 정한다
- 직급은 **가맹점마다 원장이 만든다**: 이름(예: 부원장·정교사·조교) + 위 권한 키의 부분집합.
- 새 가맹점이 생길 때 **기본 직급 3개**를 시드한다(원장이 수정·삭제·추가 가능).

| 기본 직급 | 권한 (예시) |
|---|---|
| 부원장 | 선생님 기본 전부 + `students.manage`, `guardians.view` |
| 정교사 | 선생님 기본 전부 |
| 조교 | `today.sessions`, `attendance.check` |

- 원장이 **줄 수 있는 권한의 상한 = 원장 자신의 권한**(원장 기본값 안에서만). 원장도 `content.produce`·`system.admin`·`franchise.hq` 는 줄 수 없다.

---

## 3. 데이터 모델 (2-A 마이그레이션으로 확정)

> 실제 SQL: [`supabase/migrations/20261105000001_organizations_franchise_core.sql`](../supabase/migrations/20261105000001_organizations_franchise_core.sql)
> 자동 검사: `lib/auth/migration2a.test.ts` (expand-only · 여러 번 실행 안전 · 직급 권한 키가 코드와 일치)

### 3.1 변경 내용 (추가만 — 기존 데이터는 삭제·변경하지 않는다)

| 대상 | 변경 | 설명 |
|---|---|---|
| `organizations` (= 가맹점) | 컬럼 추가 `code`, `kind`(direct/franchise), `status`(active/paused/closed), `owner_id`(원장 계정), `contract_start`, `phone`, `address` | 기존 1행은 `kind='direct'`, `code='HQ-001'` 로 설정 |
| `profiles` | `org_id`, `position_id` 추가 | 학생·선생님·원장의 소속과 직급. **Super(admin)·본사 직원은 NULL** |
| `academy_students` | `org_id` 추가 | 학생 소속 |
| `academy_classes` | (이미 `org_id` 있음) 빈 값만 채움 | 반 → 수업 회차·출석은 반을 통해 자동으로 가맹점이 정해진다 |
| **`org_positions`** (새) | `org_id, name, permissions text[], sort_order, is_default`, `UNIQUE(org_id,name)` | 선생님 직급. **원장이 정한다** |
| **`account_audit_log`** (새) | `actor_id, target_id, org_id, action, detail jsonb, created_at` | 계정 생성·권한·직급 변경 기록 |

- 새 컬럼은 모두 NULL 허용(또는 기본값) → **앱이 아직 쓰지 않으므로 화면·동작이 달라지지 않는다.**
- 새 테이블 2개는 RLS를 켜 두고 정책은 두지 않는다(서버 키로만 접근). 앱이 직접 접근하게 될 때 정책을 추가한다.
- 기본 직급 3개를 본점에 시드: **부원장**(권한 10개: 선생님 기본 + 학생 추가·학부모 연락처), **정교사**(8개 = 선생님 기본), **조교**(2개: 오늘의 수업·출석).
- 학생에 연결된 학습 기록(`vocab_*`, 시험, 숙제 제출 등)은 학생을 통해 가맹점이 정해진다. **새 컬럼을 늘리지 않는 것**이 원칙(원천은 한 곳).
- 이후 단계(공지·문의·교육·자료실) 테이블은 2-E에서 별도 설계한다.

### 3.2 용어 대응
| 설계서 용어 | DB |
|---|---|
| 가맹점 / 지점 / branch | `organizations` |
| 가맹점 ID | `org_id` |
| 직급 | `org_positions` |
| 본점(직영) | `organizations` 의 기존 행 (`kind='direct'`) |

> 권한 키 이름(`branch.settings`, `branches.view_all` 등)은 코드에서 이미 쓰고 있어 **그대로 둔다**(의미상 "가맹점").

---

## 4. 접근 제어 구현 — 3겹

| 겹 | 무엇을 | 상태 |
|---|---|---|
| ① 메뉴 | 권한 키로 메뉴 숨김 | ✅ 1단계 완료 (보안 아님) |
| ② 라우트·API | 권한 없으면 403 / 리다이렉트 | ⏳ 2-B |
| ③ 데이터 | 쿼리에 **가맹점 조건**을 강제 | ⏳ 2-D |

### 4.1 공통 헬퍼 (2-B에서 구현)
```ts
// lib/auth/access.ts  (제안)
type AccessScope = {
  userId: string;
  role: AppRole;                    // 진짜 계정 역할 (view-as 무관)
  orgId: string | null;             // organizations.id (가맹점). admin/hq_staff 는 null 가능
  permissions: PermissionKey[];     // 역할 기본값 ∪/∩ 직급 권한
  canViewAllBranches: boolean;      // 'branches.view_all'
};
getAccessScope(): Promise<AccessScope>                 // 서버에서만
requirePermission(perm): Promise<AccessScope>          // 없으면 throw → 403
scopeByOrg(query, scope, column = 'org_id')            // 가맹점 조건 자동 부착
```
- **view-as는 메뉴에만** 영향. `getAccessScope()`는 view-as를 **절대 읽지 않는다**(진짜 역할 기준).
- 기존 `requireStaff` / `requireTeacherOrAdmin` / admin layout은 이 헬퍼로 **점진 교체**한다(한 번에 바꾸지 않는다).

### 4.2 서비스 키 우회 위험 (가장 중요)
- 서비스 키(`getServiceSupabase`, `getServiceRoleClient`)로 만든 쿼리는 **RLS를 무시**한다. 이 코드베이스에는 그런 쿼리가 매우 많다.
- 따라서 격리는 "RLS를 켜면 끝"이 아니다. **서비스 키 쿼리마다 가맹점 조건을 직접 붙여야 한다.**
- 대책: ① `scopeByOrg` 사용을 강제하는 린트/리뷰 체크 ② 도메인별 인벤토리(§4.3)로 빠짐없이 ③ 격리 자동 테스트(§8) ④ 새 테이블은 처음부터 RLS + 가맹점 조건.

### 4.3 도메인별 전환 순서 (민감도 높은 것부터)
| 순서 | 도메인 | 이유 | 대표 경로 |
|:-:|---|---|---|
| 1 | 학생 정보·학부모 연락처 | 개인정보 | `/admin/students`, `/admin/guardians`, 학생 목록 API |
| 2 | 반·출석 | 학생 소속이 드러남 | `/admin/classes`, `/admin/attendance`, `/teacher/session` |
| 3 | 숙제·시험 배정/결과 | 학생 성적 | `/admin/homework`, `/teacher/exam-schedule`, 시험 결과 |
| 4 | 단어(배정·복습·시험) | 학습 기록 | `/teacher/vocab-*`, `/admin/vocab/*`, `/api/vocab/*` |
| 5 | 리포트·현황 집계 | 집계가 전체를 읽음 | `/teacher/students`, `/admin/dashboard`, 복습 현황 |
| 6 | 콘텐츠 | 공용(가맹점 공통) — **제작은 `content.produce`만** | `/admin/content/*`, `/admin/jr/*` 등 |

---

## 5. 계정 발급 · 수명주기

| 누가 | 만드는 것 | 방법 (2-C에서 구현) |
|---|---|---|
| Super / 본사 | 가맹점(`organizations`) + **원장 계정** | 가맹점 등록 화면 → 원장 초대(이메일/임시 비밀번호), `role='franchisee'`, `org_id` 지정 + `organizations.owner_id` 연결 |
| 원장 | **선생님 계정** + 직급 | `/franchise/staff`: 이름·이메일·직급 선택 → 계정 생성(`role='teacher'`, `org_id`, `position_id`) |
| 원장 / 선생님(`students.manage`) | **학생 계정** | 기존 학생 등록 흐름을 가맹점 범위로 제한 |
| 원장 | **직급 만들기·권한 설정** | `/franchise/positions`: 직급 CRUD, 권한 키 체크, 상한 검증(§2.3) |

- 신규 계정은 임시 비밀번호 + `must_change_password = true`(컬럼 이미 있음).
- **퇴사·비활성**: 계정 삭제 대신 `is_active = false` → 로그인 차단 + 목록에서 제외. 기록은 보존.
- **직급 변경·계정 생성·비활성**은 모두 `account_audit_log`에 남긴다.
- **지점 이동(학생)**: 이력 보존 정책 결정 필요(§9-3).

---

## 6. 단계별 실행 계획

> 각 단계는 **그 자체로 배포 가능**하고 **되돌릴 수 있게** 나눈다. 스키마 변경 단계(2-A)는 승인 후, 가능하면 사용자가 적은 시간대에 진행한다.

| 단계 | 내용 | 산출물 | 사용자에게 보이는 변화 | 되돌리기 | 규모 |
|---|---|---|---|---|:-:|
| **2-A** 스키마(추가만) ✅ SQL 작성 | `organizations` 확장 + `profiles/academy_students`에 `org_id`(+`position_id`) + `org_positions`, `account_audit_log`. **기본 직급 시드 + 기존 행 전부 본점으로 채움** | `20261105000001_organizations_franchise_core.sql` + 자동 검사 | **없음** | 파일 맨 아래 "되돌리기" SQL (새로 추가한 것만 삭제) | 소 |
| **2-B** 접근 헬퍼·가드 | `getAccessScope/requirePermission`, 새 역할을 아는 가드. admin/teacher layout·`requireStaff` 점진 교체 | `lib/auth/access.ts` + 테스트 | 없음(모두 본점) | 헬퍼 미사용으로 복귀 | 중 |
| **2-C** 계정 발급·직급 관리 | 가맹점 등록, 원장 초대, `/franchise/staff`, `/franchise/positions` | 화면 + 서버 액션 + 감사 기록 | 원장·선생님 계정 생성 가능 | 기능 숨김 | 중 |
| **2-D** 데이터 격리 | §4.3 순서대로 도메인별 `scopeByOrg` 적용 + **격리 테스트** | 도메인별 PR | 가맹점 계정은 자기 데이터만 보임 | 도메인별 되돌리기 | **대** |
| **2-E** 본사 허브 실데이터 | 가맹점별 표, 공지·문의·교육·자료실 테이블과 화면 | 설계 별도 | 허브 "준비 중" → 실제 기능 | 기능별 | 대 |

### 6.1 2-A 적용 절차 (Supabase 수동 적용)

1. **백업 확인**: Supabase 대시보드 → Database → Backups 에서 최근 백업이 있는지 확인(없으면 먼저 수동 백업).
2. **SQL 편집기**에서 `20261105000001_organizations_franchise_core.sql` 전체를 붙여 넣고 실행. (하나의 트랜잭션이라 중간에 실패하면 전부 취소된다. 여러 번 실행해도 안전하다.)
3. 파일 맨 아래 **검증 SQL**을 실행해 결과 확인:
   - `organizations` 에 `HQ-001 / direct / active` 한 줄
   - `students_without_org`, `profiles_without_org`, `classes_without_org` 가 모두 **0**
   - 기본 직급 3개: 부원장 10 / 정교사 8 / 조교 2
4. **사이트 확인**: `/student/home`, `/teacher/home`, `/franchise/home`, `/admin/franchise` 가 평소처럼 열리는지.
5. 문제가 있으면 파일 맨 아래 **되돌리기 SQL** 실행(새로 추가한 컬럼·테이블만 삭제, 기존 데이터는 그대로).
6. 적용 결과를 알려 주면 2-B(접근 헬퍼·가드)로 진행한다.

> 이 단계에서는 앱 코드가 새 컬럼을 **아직 읽지도 쓰지도 않는다.** 그래서 적용 전·후로 사용자에게 보이는 변화가 없어야 정상이다.

**2-D 완료 기준(= 가맹점 오픈 가능 기준):** 가맹점 A 계정으로 가맹점 B의 학생·반·출석·성적·학부모 연락처가 **목록·상세·API 어디에서도** 보이지 않는다(§8 테스트 통과).

---

## 7. 선행 조건 · 위험

1. **테스트 환경 분리가 선행되어야 한다.** 지금은 로컬 개발 서버도 **운영 DB에 연결**된다. 격리 테스트(가맹점 2개 + 계정 여러 개)를 운영 데이터 위에서 할 수 없다 → **별도 Supabase 프로젝트(또는 브랜치)** 를 먼저 만든다. *(2-D 시작 전 필수)*
2. **마이그레이션은 수동 적용**이다(Supabase SQL 편집기). 단계마다 SQL 파일과 적용 확인 절차를 문서화한다.
3. **개인정보**: 학생·학부모 정보를 가맹점이 수집하고 본사가 열람하는 구조다. 본사 열람 범위와 위·수탁 관계는 **법무 확인** 후 확정한다(§9-1).
4. **기존 RLS**가 `role='admin'`을 가정한다 → 새 정책은 `admin`을 Super로 유지한 채 추가한다.
5. **서비스 키 쿼리 누락**이 곧 정보 노출이다 → §4.2 대책을 단계마다 점검한다.
6. 스키마 변경·권한 구조 변경은 **보안 핵심**이라 단계별 **사용자 승인**을 받는다.

---

## 8. 테스트 계획 (격리 매트릭스)

테스트 데이터: 가맹점 A·B(각각 원장 1, 선생님 2(직급 다름), 학생 3, 반 1) + 본사 직원 1 + Super.

| 확인 항목 | A 원장 | A 정교사 | A 조교 | B 원장 | 본사직원 | Super |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| A 학생 목록 | ○ | ○ | ○(권한 범위) | ✕ | ○ | ○ |
| B 학생 목록 | ✕ | ✕ | ✕ | ○ | ○ | ○ |
| 학부모 연락처(A) | ○ | ✕ | ✕ | ✕ | ✕ | ○ |
| A 반 출석 체크 | ○ | ○ | ○ | ✕ | ✕ | ○ |
| 학생 추가 | ○ | ✕ | ✕ | (B에만) | ✕ | ○ |
| 직급·권한 관리 | ○ | ✕ | ✕ | (B에만) | ✕ | ○ |
| 콘텐츠 제작 화면 | ✕ | ✕ | ✕ | ✕ | ○ | ○ |
| 시스템(사용자/권한) | ✕ | ✕ | ✕ | ✕ | ✕ | ○ |

- **직접 URL·API 호출**로도 같은 결과여야 한다(메뉴만 숨기는 것은 통과로 치지 않는다).
- 헬퍼 단위 테스트(가짜 클라이언트)는 이미 있는 방식으로, 격리 통합 테스트는 분리된 테스트 DB에서.
- **view-as 쿠키 조작 테스트**: 선생님·원장이 `lx_view_as=admin`을 넣어도 권한이 올라가지 않는다(1단계에서 단위 테스트 완료).

---

## 9. 결정이 필요한 사항 (미결정)

| # | 질문 | 추천 |
|:-:|---|---|
| 1 | 본사가 가맹점 학생·학부모 정보를 **어디까지** 볼 수 있나? | 통계는 전체, 개인 식별 정보(학부모 연락처)는 **가맹점 안에서만**. 법무 확인 후 확정 |
| 2 | 선생님이 **여러 가맹점**에 소속될 수 있나? | 처음엔 **불가**(한 가맹점). 필요해지면 소속 테이블로 확장 |
| 3 | 학생이 **다른 가맹점으로 이동**하면 학습 기록은? | 기록은 학생에게 귀속(따라감), 이전 가맹점 열람은 종료 |
| 4 | 가맹점이 **자기 교재(콘텐츠)** 를 만들 수 있나? | 처음엔 **본사 콘텐츠만**. 가맹점 전용 콘텐츠는 이후 콘텐츠 테이블에 `org_id` 컬럼을 두어 확장 |
| 5 | **본사 직원** 세부 권한은? | Super가 직원별로 조정(기본값은 §2.2) |
| 6 | **학부모 계정**(자녀 열람)이 필요한가? | 별도 기획(설계서 `CYCLE2_PARENT_COMMUNICATION_DESIGN.md`와 연계) |
| 7 | **원장이 여러 가맹점**을 운영하나? | 처음엔 1:1. 확장은 `organizations.owner_id`(원장 1명 → 여러 가맹점)로 가능 |

---

## 10. 부록

### 10.1 용어
- **Super**: 모든 것을 볼 수 있는 대표 계정(DB 값 `admin`).
- **역할 미리보기(View as)**: Super가 다른 역할 화면을 **메뉴 기준으로만** 미리 보는 기능. 권한은 바뀌지 않는다.
- **권한 키**: `today.sessions` 같은 기능 단위 문자열. 메뉴·API·직급이 모두 이것을 기준으로 한다.
- **직급**: 가맹점 안에서 원장이 정하는 선생님 등급(이름 + 권한 키 집합).

### 10.2 관련 코드 위치
- 권한/미리보기: `lib/auth/permissions.ts`, `lib/auth/viewAs.ts` (테스트 `lib/auth/roles.test.ts`)
- 메뉴: `components/dashboard/staffNav.ts` (테스트 `staffNav.test.ts`), `SidebarClient.tsx`, `TopbarClient.tsx`
- 레이아웃: `app/protected/layout.tsx`(진짜 역할·view-as 해석), `app/protected/_client/ProtectedLayoutClient.tsx`
- 홈 보드: `app/protected/franchise/home/page.tsx`, `app/protected/teacher/home/page.tsx`, `components/dashboard/board.tsx`
- 본사 허브: `app/protected/admin/franchise/*`, `components/dashboard/ComingSoon.tsx`
- 경로 연결: `middleware.ts`(rewrite), `components/layout/RootShell.tsx`(앱 경로 목록)에 `/franchise` 추가됨

### 10.3 알려진 한계 (1단계 시점)
- `/admin/*` 화면은 아직 `admin`만 열 수 있다 → 원장·본사직원 **실계정**이 생기면 2-B에서 접근 범위를 조정해야 한다.
- 원장 홈의 지표는 **전체 학생 기준**이다(가맹점 구분 전).
- 선생님 메뉴에서는 `/admin/*` 링크를 숨긴다(출석 현황·숙제 관리 등) — 2-B에서 라우트를 정리하면 복원한다.
