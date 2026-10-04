# Cycle 2 설계: 학부모 소통 (알림 + 리포트)

상태: **설계안. 아직 DB도 코드도 만들지 않았음** (단, `/api/notify/send-email` 권한 확인은 먼저 추가함 — §1).
작성일: 2026-10-04 / 선행: Cycle 1(반·출석·진행 보드) 구현 완료

## 0. 이 사이클이 풀 문제

학부모는 "우리 아이가 오늘 왔는지, 숙제는 했는지, 어디가 약한지"를 알고 싶고, 교사는 그걸 일일이 연락하느라 시간을 쓴다.
목표는 **교사의 수작업을 줄이면서, 틀린 사람에게 틀린 내용이 가는 사고는 0으로** 만드는 것.

북극성 지표
- 결석·지각 확정 후 학부모 안내까지 교사 조작 **2번 이내**
- 학부모 안내의 오발송(잘못된 대상·내용) **0건**
- 학부모 연락처가 등록된 학생 비율 **100%** (현재 66%)

## 1. 조사 결과 (2026-10-04, 운영 DB 읽기 전용 + 코드 확인)

| 사실 | 의미 |
|---|---|
| 학부모 **이메일 등록 0/15**, **전화번호 10/15** (`academy_students.parent_email/parent_phone`) | 이메일 중심으로 만들면 보낼 곳이 없다. **연락 수단은 전화번호(문자/카톡)가 현실.** |
| 알림톡·문자 발송 계정 없음, `lib/sms.ts`·`lib/email.ts` 는 빈 함수 | 자동 문자 발송은 공급사 계약 + **발신번호 사전등록**(통신사 규정)이 먼저 필요 |
| 이메일 발송: Resend 기반 `lib/utils/emailService.ts`, 호출처 3곳(숙제 채점, 시험모드 공지, 데일리태스크 수동 발송) | 학생에게 가는 알림용으로는 쓸 수 있음 |
| 알림 발송 기록 테이블 없음 (`vocab_assignment_notices` 는 숙제 공지 전용) | 누가 언제 무엇을 받았는지 알 수 없다 → **중복·누락·분쟁 대응 불가** |
| 학부모 계정/열람 권한 없음. `student_parent_links` 는 0행 | 학부모 포털은 계정 대신 **서명된 읽기 전용 링크**가 현실적 |

### 발견한 결함 (이미 조치/보고)
1. **`/api/notify/send-email` 이 인증 없이 열려 있었다.** 서비스 키로 아무 학생·학부모에게 메일을 보낼 수 있는 구조.
   → **교사/관리자 확인을 추가함(이 문서와 함께 변경).**
2. 같은 라우트가 `academy_students.name` 컬럼을 조회하는데 **그 컬럼이 없어** 지금은 항상 실패한다(= 우연히 막혀 있었음).
   데일리태스크 화면의 "이메일 발송"은 현재 동작하지 않을 가능성이 높다. **컬럼 수정은 하지 않았다** — 고치면 실제 메일이 나가기 시작하므로
   발신 도메인(`notifications@toefl-platform.com` 인증 여부)과 학생 이메일 실재 여부를 확인한 뒤 결정.
3. 템플릿에 `${studentName}`, `${message}` 가 **HTML 이스케이프 없이** 들어간다 → 새 템플릿은 반드시 이스케이프.
4. 링크가 `${APP_URL}/protected/student` (공개 주소는 `/student`), `APP_URL` 기본값이 남의 도메인(`app.toefl.com`)처럼 보임.

## 2. 설계 원칙

1. **채널과 내용을 분리한다.** "무엇을 알릴지"(템플릿)와 "어떻게 보낼지"(수동 복사 / 이메일 / 문자 / 알림톡)를 인터페이스로 갈라, 공급사가 정해지면 채널만 꽂는다.
2. **모든 발송은 `초안 → 교사 승인 → 발송`.** 이번 사이클에는 **완전 자동 발송을 만들지 않는다.** (결석 오탐이 학부모에게 바로 나가면 신뢰가 깨진다 — Cycle 1 과 같은 원칙)
3. **발송 기록(outbox)이 정본.** 모든 안내는 먼저 DB에 행으로 남고(대상·내용·상태·시각·누가 승인), 중복 방지 키로 같은 안내가 두 번 나가지 않게 한다.
4. **지금 가능한 것부터**: 공급사 없이도 쓸 수 있게 **"복사해서 직접 보내기"** 채널을 1호로 만든다(교사가 카톡/문자로 직접 전송 → '보냄' 표시). 한국 학원의 실제 방식과 같고, 이후 자동 채널이 붙어도 같은 흐름.
5. **수신 동의/연락처를 데이터로 관리.** 보호자 연락처 테이블 + 동의 기록. 미성년 학생 정보를 다루므로 최소 수집, 열람 로그.
6. RLS 는 교사/관리자 전용, 무제한 정책 금지. 학부모 열람은 서버 API(서명 링크)로만.

## 3. 데이터 모델 (초안)

```sql
-- 보호자 연락처 (기존 academy_students.parent_phone/parent_email 에서 1회 이관, 이후 이쪽이 정본)
create table public.guardian_contacts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,   -- Cycle 1 과 같은 학생 ID 규칙
  name        text,
  relation    text,                                  -- 어머니/아버지/기타
  phone       text,                                  -- 숫자만 정규화해 저장 (010xxxxxxxx)
  email       text,
  is_primary  boolean not null default false,
  notice_ok   boolean not null default true,         -- 학습·출결 안내 수신 동의
  consent_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- 발송함: 모든 안내의 정본
create table public.notification_outbox (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,                       -- 'attendance_absent' | 'attendance_late' | 'weekly_summary' | 'custom'
  student_id    uuid not null references public.profiles(id) on delete cascade,
  guardian_id   uuid references public.guardian_contacts(id) on delete set null,
  channel       text not null check (channel in ('manual','email','sms','alimtalk')),
  subject       text,
  body          text not null,                       -- 렌더링된 최종 문구 (발송 시점 그대로 보존)
  status        text not null default 'draft' check (status in ('draft','approved','sent','failed','cancelled')),
  dedupe_key    text unique,                         -- 예: attendance_absent:<session_id>:<student_id>
  ref_session_id uuid references public.class_sessions(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  approved_by   uuid references public.profiles(id) on delete set null,
  sent_at       timestamptz,
  provider_id   text,                                -- 공급사 메시지 ID (수동 채널은 null)
  error         text,
  created_at    timestamptz not null default now()
);
-- 두 테이블 모두 RLS: 교사/관리자 전용 (public.is_staff())
-- attendance_records.notified_at (Cycle 1 에서 미리 둠)은 outbox 가 'sent' 가 될 때 채운다.
```

## 4. 흐름 (이 사이클의 핵심)

```
교사가 수업 보드에서 결석/지각을 "확정"
   └─ [학부모에게 알리기] 버튼 (자동 아님)
        └─ 템플릿으로 문구 생성 → outbox(draft) 생성 (dedupe_key 로 중복 방지)
             └─ 미리보기에서 문구 확인/수정 → [승인]
                  └─ channel=manual : 문구 복사 → 교사가 카톡/문자로 직접 전송 → [보냄 표시]
                  └─ channel=email  : Resend 발송 (학부모 이메일이 있을 때만)
                  └─ channel=sms/alimtalk : 공급사 연동 후 (Phase C)
```

- 결석 안내는 **교사가 확정한 출석 기록**에서만 만든다(자동 판정 없음 — 오탐 방지).
- 사유결석(excused)은 기본적으로 알리지 않음(옵션).
- 한 수업에서 여러 명이 결석이면 **한 번에 초안 일괄 생성** 가능(원장 현황판 `/admin/attendance` 에서도).

## 5. 단계 구분

| 단계 | 내용 | 외부 의존 |
|---|---|---|
| **A** (먼저) | 보호자 연락처 정리·이관, outbox, **수동 복사 채널**, 결석/지각 안내 템플릿(테스트 포함), 보드·현황판에 버튼 | 없음 |
| **B** | 주간 요약(출석·숙제·진행) 초안 자동 생성(매주 크론) + **서명된 읽기 전용 리포트 링크**(학부모가 로그인 없이 열람, 만료·재발급) | 없음 |
| **C** | 문자/알림톡 자동 발송 채널 연결 | 공급사 계약, 발신번호 등록, 알림톡 템플릿 심사(수일) |

**C를 기다리지 않고 A·B를 만든다.** C가 준비되면 채널 구현체 하나만 추가하면 된다.

## 6. 순수 로직 (테스트 우선)

DB 없이 먼저 만들고 테스트할 것:
- `normalizePhone()` — 한국 휴대폰 번호 정규화/검증 (하이픈·공백·+82 처리)
- `renderAttendanceMessage()` — 결석/지각 안내 문구 (학생 이름·날짜·수업 시간, **이스케이프**, 길이 제한)
- `makeDedupeKey()` — 같은 수업·학생·종류가 두 번 초안으로 만들어지지 않게
- 템플릿에 개인 평가·민감 정보를 넣지 않는 규칙(출석 사실만)

## 7. 개인정보 / 위험

| 위험 | 대응 |
|---|---|
| 잘못된 학부모에게 발송 | 학생↔보호자 연결을 outbox 행에 고정 저장, 미리보기에 받는 사람 표시, 승인 필수 |
| 결석 오탐이 바로 나감 | 자동 발송 없음. 교사가 확정한 기록만 대상 |
| 같은 안내 중복 발송 | `dedupe_key` unique + 상태 머신(draft→approved→sent) |
| 연락처/내용 유출 | RLS 교사·관리자 전용, 서버 API 만 사용, 리포트 링크는 서명·만료·재발급 |
| 발송 공급사 장애/실패 | `failed` + `error` 기록, 재시도는 교사가 명시적으로 |
| 인증 없는 메일 라우트(§1) | 권한 확인 추가 완료. 다른 메일 호출처(`homework/grade`, `applyExamMode`)도 점검 필요 |
| 법적: 정보성 vs 광고성 | 출결·학습 안내는 정보성. 홍보 문구 금지(템플릿에서 강제), 동의 기록 보관 |

## 8. 사용자 결정이 필요한 것

1. **지금 학부모에게는 어떻게 연락하시나요?** (교사가 카톡/문자로 직접? 학원 대표번호?) → 수동 복사 채널의 문구 톤과 흐름을 맞춥니다.
2. **문자/알림톡 공급사 계약 계획이 있나요?** 없으면 A·B만 만들고 C는 보류합니다. (참고: 자동 발송은 발신번호 사전등록과 알림톡 템플릿 심사 때문에 준비에 수일~수주)
3. **학부모 이메일을 앞으로 받을 건가요?** 지금 0건이라, 받지 않을 거면 이메일 채널은 만들지 않고 전화번호 중심으로 갑니다.
4. **`/api/notify/send-email` 의 컬럼 오류(§1-2)** 를 고쳐서 데일리태스크 이메일 발송을 되살릴까요? (발신 도메인 인증과 학생 이메일 실재 확인 필요)
5. 데이터: 학부모 전화번호 5명이 비어 있습니다. 연락처 입력 화면을 같이 만들어 채우시겠어요?
