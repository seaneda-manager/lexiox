# 가맹점 · 역할 · 권한 설계서 (개발용)

> 상태: **1단계(UI) 완료, 2단계(DB·계정) 계획 단계** — 작성 2026-11-05
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
- 가맹점(지점)을 구분하는 컬럼이 **어디에도 없다**: `academy_students`, `academy_classes`, 배정·시험·출석 테이블 전부.
- 그래서 선생님은 전체 학생을 본다(예: `/api/teacher/vocab-exams/meta`는 전체 활성 학생 반환).

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

## 3. 데이터 모델 (안 — 승인 전 초안)

> 아래 SQL은 방향을 보여주는 **스케치**다. 실제 마이그레이션은 §6 순서대로, 승인 후 작성한다.

```sql
-- 가맹점(지점). 기존 데이터는 모두 '본점' 하나로 이관한다.
create table branches (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,            -- 예: HQ-001
  name          text not null,                   -- 예: 본점
  kind          text not null default 'franchise' check (kind in ('direct','franchise')),
  status        text not null default 'active'   check (status in ('active','paused','closed')),
  owner_id      uuid references profiles(id),    -- 원장 계정
  contract_start date,
  phone         text,
  address       text,
  created_at    timestamptz not null default now()
);

-- 선생님 직급과 권한 (원장이 정함)
create table branch_positions (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references branches(id) on delete cascade,
  name         text not null,
  permissions  text[] not null default '{}',     -- permissions.ts 의 키
  sort_order   int  not null default 0,
  is_default   boolean not null default false,
  unique (branch_id, name)
);

-- 소속
alter table profiles          add column branch_id   uuid references branches(id);
alter table profiles          add column position_id uuid references branch_positions(id);
alter table academy_students  add column branch_id   uuid references branches(id);
alter table academy_classes   add column branch_id   uuid references branches(id);
create index on profiles (branch_id);
create index on academy_students (branch_id);
create index on academy_classes (branch_id);

-- 권한·직급 변경 기록 (누가 누구에게 무엇을)
create table account_audit_log (
  id          bigserial primary key,
  actor_id    uuid not null,
  target_id   uuid,
  branch_id   uuid,
  action      text not null,                     -- role_change | position_change | account_create | deactivate ...
  detail      jsonb,
  created_at  timestamptz not null default now()
);
```

- 반(`academy_classes`)에 가맹점이 붙으면 수업 회차·출석은 반을 통해 자동으로 가맹점이 정해진다(별도 컬럼 불필요).
- 학생에 연결된 학습 기록(`vocab_*`, 시험, 숙제 제출 등)은 `academy_students`/`profiles`를 통해 가맹점이 정해진다. **새 컬럼을 늘리지 않는 것**이 원칙(원천은 한 곳).
- 이후 단계(공지·문의·교육·자료실) 테이블은 §6의 2-E에서 별도 설계한다.

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
  branchId: string | null;          // admin/hq_staff 는 null 가능
  permissions: PermissionKey[];     // 역할 기본값 ∪/∩ 직급 권한
  canViewAllBranches: boolean;      // 'branches.view_all'
};
getAccessScope(): Promise<AccessScope>                 // 서버에서만
requirePermission(perm): Promise<AccessScope>          // 없으면 throw → 403
scopeByBranch(query, scope, column = 'branch_id')      // 가맹점 조건 자동 부착
```
- **view-as는 메뉴에만** 영향. `getAccessScope()`는 view-as를 **절대 읽지 않는다**(진짜 역할 기준).
- 기존 `requireStaff` / `requireTeacherOrAdmin` / admin layout은 이 헬퍼로 **점진 교체**한다(한 번에 바꾸지 않는다).

### 4.2 서비스 키 우회 위험 (가장 중요)
- 서비스 키(`getServiceSupabase`, `getServiceRoleClient`)로 만든 쿼리는 **RLS를 무시**한다. 이 코드베이스에는 그런 쿼리가 매우 많다.
- 따라서 격리는 "RLS를 켜면 끝"이 아니다. **서비스 키 쿼리마다 가맹점 조건을 직접 붙여야 한다.**
- 대책: ① `scopeByBranch` 사용을 강제하는 린트/리뷰 체크 ② 도메인별 인벤토리(§4.3)로 빠짐없이 ③ 격리 자동 테스트(§8) ④ 새 테이블은 처음부터 RLS + 가맹점 조건.

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
| Super / 본사 | 가맹점 + **원장 계정** | 가맹점 등록 화면 → 원장 초대(이메일/임시 비밀번호), `role='franchisee'`, `branch_id` 지정 |
| 원장 | **선생님 계정** + 직급 | `/franchise/staff`: 이름·이메일·직급 선택 → 계정 생성(`role='teacher'`, `branch_id`, `position_id`) |
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
| **2-A** 스키마(추가만) | `branches`, `branch_positions`, `account_audit_log` + `profiles/academy_students/academy_classes`에 nullable `branch_id`(+`position_id`). **'본점' 시드 + 기존 행 전부 본점으로 채움** | 마이그레이션 SQL | **없음** | 컬럼 nullable → 무시/삭제 가능 | 소 |
| **2-B** 접근 헬퍼·가드 | `getAccessScope/requirePermission`, 새 역할을 아는 가드. admin/teacher layout·`requireStaff` 점진 교체 | `lib/auth/access.ts` + 테스트 | 없음(모두 본점) | 헬퍼 미사용으로 복귀 | 중 |
| **2-C** 계정 발급·직급 관리 | 가맹점 등록, 원장 초대, `/franchise/staff`, `/franchise/positions` | 화면 + 서버 액션 + 감사 기록 | 원장·선생님 계정 생성 가능 | 기능 숨김 | 중 |
| **2-D** 데이터 격리 | §4.3 순서대로 도메인별 `scopeByBranch` 적용 + **격리 테스트** | 도메인별 PR | 가맹점 계정은 자기 데이터만 보임 | 도메인별 되돌리기 | **대** |
| **2-E** 본사 허브 실데이터 | 가맹점별 표, 공지·문의·교육·자료실 테이블과 화면 | 설계 별도 | 허브 "준비 중" → 실제 기능 | 기능별 | 대 |

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
| 4 | 가맹점이 **자기 교재(콘텐츠)** 를 만들 수 있나? | 처음엔 **본사 콘텐츠만**. 가맹점 전용 콘텐츠는 이후 `branch_id` 컬럼으로 확장 |
| 5 | **본사 직원** 세부 권한은? | Super가 직원별로 조정(기본값은 §2.2) |
| 6 | **학부모 계정**(자녀 열람)이 필요한가? | 별도 기획(설계서 `CYCLE2_PARENT_COMMUNICATION_DESIGN.md`와 연계) |
| 7 | **원장이 여러 가맹점**을 운영하나? | 처음엔 1:1. 확장은 `branches.owner_id` 다대일로 가능 |

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
