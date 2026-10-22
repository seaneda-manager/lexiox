# 학원 홍보센터 (promo) 설정 가이드

가맹점 원장님이 쓰는 홍보센터(`/promo`)와 본사 관리 화면(`/admin/franchise/marketing`)의 설정 방법입니다.

## 1. 구성

| 화면 | 경로 | 누가 |
|---|---|---|
| 오늘 · 컨펌 · 문구 생성 · 캘린더 · 상담 · 성과 · 트렌드 · 채널·자동화 · 학원 정보 | `/promo` | 가맹점 원장·실장 (`memberships.role` = owner/manager) |
| 가맹점 홍보 현황 · 가맹점·원장 관리 · 브랜드 가이드 · 시즌 캠페인 | `/admin/franchise/marketing` | 본사 관리자 (`profiles.role` = admin) |

코드 위치: `apps/web/app/promo`, `apps/web/lib/promo`, `apps/web/app/api/promo`, `apps/web/app/api/cron/promo-*`,
`apps/web/app/protected/admin/franchise/marketing`. 기존 학습 화면은 건드리지 않았고 새 패키지도 없습니다.

## 2. 콘텐츠 흐름

```
매일 03:00  promo-daily   학습 통계 스냅샷 집계 → 자동 일정에 맞춰 다음 7일 콘텐츠 생성
매주 월 05:00 promo-weekly 네이버 검색 추이 + 시즌 + 학습 통계 → 2주 플랜 → 게시물 초안
             ↓
         컨펌 대기 (원장님 승인 · 수정 · 반려)
             ↓
매시 정각   promo-publish  승인된 글을 예약 시간에 자동 업로드
             · 인스타그램 / 페이스북 페이지 (Meta 연결)
             · 유튜브 / 구글 비즈니스 프로필 (Google 연결)
             · 네이버 블로그·플레이스·카카오 채널·문자 → '오늘' 탭에서 복사 후 열기
```

학원 정보 탭의 "컨펌 없이 바로 예약"을 켜면 승인 단계를 건너뜁니다.

## 3. 데이터베이스

`supabase/migrations/20261023000001_promo_marketing_hub.sql`

- 기존 테이블 변경: `organizations.kind`('hq'|'branch'), `organizations.parent_id`, `academy_students.org_id` — 모두 기본값/NULL 허용 컬럼 추가만
- 새 테이블: `promo_org_profiles`, `promo_channels`, `promo_automations`, `promo_posts`, `promo_leads`,
  `promo_campaigns`, `promo_brand_guides`, `promo_connections`, `promo_trend_reports`,
  `promo_learning_snapshots`, `promo_ai_runs`
- Storage 버킷 `promo-media` (public — 인스타그램이 공개 URL에서 이미지를 가져가기 때문)
- RLS: 가맹점 운영자는 자기 가맹점 행만, 본사 관리자는 전체. 캠페인·브랜드 가이드는 본사만 쓰고 소속 가맹점은 읽기만.

학습 통계는 개인 식별 정보 없이 가맹점·월 단위 숫자만 저장합니다 (재원생 수, 어휘 드릴 정답률, 완료 세트, 과제 제출, 리딩 응시).
학생 소속은 `academy_students.org_id`, 비어 있으면 `academy_classes.org_id`가 지정된 반을 통해 판단합니다.

## 4. 환경변수

| 변수 | 용도 | 필수 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 문구 생성 (기존 사용 중) | 예 |
| `CRON_SECRET` | cron 인증 (기존 사용 중) | 예 |
| `PROMO_TOKEN_KEY` | 외부 플랫폼 토큰 암호화 키. `openssl rand -base64 32` | 자동 업로드 시 |
| `NEXT_PUBLIC_APP_URL` | OAuth 콜백 주소 기준 (예: `https://lexiox.com`) | 자동 업로드 시 |
| `META_APP_ID`, `META_APP_SECRET` | 인스타그램·페이스북 연결 | 자동 업로드 시 |
| `PROMO_META_GRAPH_VERSION` | Graph API 버전 (기본 `v23.0`) | 선택 |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | 유튜브·구글 비즈니스 프로필 연결 | 자동 업로드 시 |
| `NAVER_DATALAB_CLIENT_ID`, `NAVER_DATALAB_CLIENT_SECRET` | 네이버 검색어 트렌드 | 트렌드 분석 시 |
| `NAVER_DATALAB_URL` | 데이터랩 엔드포인트 (기본: 개발자센터 주소. API HUB로 옮기면 교체) | 선택 |

키가 없으면 해당 기능만 꺼집니다: 연결 버튼에 "본사 설정 전"이 보이고, 트렌드 분석은 검색 추이 없이 시즌·학습 데이터만으로 플랜을 짭니다.

## 5. 플랫폼 앱 등록 (본사 1회)

**Meta (인스타그램·페이스북)**
1. developers.facebook.com에서 비즈니스 앱 생성, Facebook 로그인 추가
2. 리디렉션 URI: `{NEXT_PUBLIC_APP_URL}/api/promo/oauth/meta/callback`
3. 권한: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`
4. 가맹점(외부 계정)이 쓰려면 앱 검수와 비즈니스 인증이 필요합니다. 인스타그램은 프로페셔널 계정이어야 하고 페이스북 페이지와 연결돼 있어야 합니다.
5. 인스타그램은 이미지(JPEG)·릴스·캐러셀만 올릴 수 있어 글만 있는 게시물은 실패합니다 → 게시물에 이미지 첨부 필요.

**Google (유튜브·구글 비즈니스 프로필)**
1. Google Cloud 프로젝트에서 YouTube Data API v3, Business Profile API들(My Business Account Management, Business Information, My Business v4) 사용 설정. Business Profile API는 별도 접근 신청이 필요합니다.
2. OAuth 클라이언트(웹) 생성, 리디렉션 URI: `{NEXT_PUBLIC_APP_URL}/api/promo/oauth/google/callback`
3. 범위: `business.manage`, `youtube.upload`, `youtube.readonly`. 외부 사용자에게 열려면 OAuth 동의 화면 검수가 필요하고, YouTube 업로드는 API 감사를 통과하기 전까지 공개 범위가 제한될 수 있습니다.
4. 유튜브는 영상 파일 첨부가 필요합니다 (AI는 제목·설명·쇼츠 대본을 씁니다).

**네이버 데이터랩**
- 신규 신청은 네이버 클라우드 API HUB에서 받습니다. 받은 키와 엔드포인트를 위 변수에 넣어주세요. 값은 상대 지수입니다.
- 네이버 블로그 글쓰기 API는 종료돼 자동 업로드가 불가능합니다. 브라우저 자동 조작은 계정 제재 위험이 있어 넣지 않았습니다.

## 6. Cron (`apps/web/vercel.json`)

| 경로 | 주기 (UTC) | KST |
|---|---|---|
| `/api/cron/promo-daily` | `0 18 * * *` | 매일 03:00 |
| `/api/cron/promo-publish` | `0 * * * *` | 매시 정각 |
| `/api/cron/promo-weekly` | `0 20 * * 0` | 월요일 05:00 |

Netlify로 배포한다면 같은 주기로 Scheduled Function이나 외부 cron에서 `Authorization: Bearer $CRON_SECRET` 헤더로 호출하세요.

## 7. 가맹점 온보딩 순서

1. 본사 `/admin/franchise/marketing/branches`에서 가맹점 생성 → 원장님 가입 이메일로 원장 연결 → 학생 배정
2. 원장님 `/promo/settings`에서 학원 정보 입력
3. `/promo/channels`에서 채널 등록, Meta·Google 연결 후 채널별 업로드 계정 선택, 자동 일정 추가
4. 이후 매일·매주 생성되는 콘텐츠를 `/promo/review`에서 승인

## 8. 비용 관리

가맹점당 하루 AI 호출 40회 제한 (`DAILY_AI_LIMIT`, `lib/promo/constants.ts`). 모든 호출은 `ai_usage_logs`에 `promo/*` 경로로 기록됩니다.
