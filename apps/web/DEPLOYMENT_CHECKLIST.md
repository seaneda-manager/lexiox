# Jr. Learning System 배포 체크리스트

## 📋 배포 전 확인사항

### 1️⃣ 코드 상태
- [x] 모든 변경사항 커밋됨 (19 commits)
- [x] main branch에 있음
- [x] 최신 커밋: `feat: Jr. Learning 진입포인트 추가 및 네비게이션 개선`

### 2️⃣ 데이터베이스
```
필수 마이그레이션:
- [ ] 20260715000001_jr_learning_sessions.sql
- [ ] 20260716000001_jr_content_management.sql

Supabase에서 실행할 것:
1. SQL Editor 열기
2. 각 migration 파일 내용 복사
3. 순서대로 실행
4. 확인: tables 메뉴에서 jr_* 테이블 확인
```

### 3️⃣ 테스트 계정
```
Supabase에서 설정할 것:
1. TEST_ACCOUNTS_SETUP.sql 실행 (profiles + assignment)
2. Auth에서 계정 생성:
   - admin@test.com
   - teacher@test.com
   - student@test.com
3. 각 계정 로그인 테스트
```

### 4️⃣ 환경 변수
```
Vercel / 배포 환경에 설정:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

확인: .env.local에 이미 설정되어 있는가?
```

### 5️⃣ 빌드 테스트
```bash
npm run build      # 빌드 성공 여부 확인
npm run dev        # 로컬에서 한번 더 테스트
```

---

## 🚀 배포 방법별 가이드

### **Option 1: Vercel (권장 - Next.js 최적화)**

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. Vercel에 배포
vercel

# 3. 환경변수 설정
#    - Vercel 대시보드 > Settings > Environment Variables
#    - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY 추가

# 4. 재배포
vercel --prod
```

### **Option 2: Docker (자체 서버)**

```bash
# 1. 빌드
docker build -t jr-learning:latest .

# 2. 실행
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  jr-learning:latest

# 3. 확인
curl http://localhost:3000
```

### **Option 3: AWS (EC2/ECS)**

```bash
# 1. 빌드
npm run build

# 2. 시작 스크립트
npm run start

# 3. PM2로 프로세스 관리
pm2 start npm --name "jr-learning" -- start
```

---

## ✅ 배포 후 검증

### 🔐 인증 확인
```
1. 프로덕션 URL 접속
2. 로그인 페이지 확인 (/auth/login)
3. 테스트 계정으로 로그인
4. 역할별 자동 리다이렉트 확인:
   - Admin → /admin/jr/content ✅
   - Teacher → /dashboard ✅
   - Student → /jr ✅
```

### 📚 기능 테스트
```
Admin:
- [ ] Jr. 콘텐츠 관리 페이지 접근 가능
- [ ] Reading 지문 생성 가능
- [ ] Grammar 단원 생성 가능

Teacher:
- [ ] 대시보드 접근 가능
- [ ] 과제 할당 가능
- [ ] 진도 추적 가능

Student:
- [ ] Jr. Hub 접근 가능
- [ ] Reading/Grammar 학습 가능
- [ ] 개인 대시보드 진도 표시
```

### 🗄️ 데이터베이스 확인
```
Supabase에서 확인:
- [ ] jr_reading_passages 데이터 존재
- [ ] jr_grammar_chapters 데이터 존재
- [ ] 테스트 계정의 학습 기록 저장됨
```

### 🔗 링크 확인
```
모든 네비게이션 링크 작동:
- [ ] Student Hr. Hub의 "내 진도" 링크
- [ ] Student Jr. Hub의 "선생님용" 링크
- [ ] Teacher Dashboard의 "과제할당" 링크
- [ ] Teacher Dashboard의 "관리" 링크
- [ ] Admin의 "대시보드" 링크
```

---

## 📊 배포 전 최종 체크

```
코드 품질:
- [x] Type checking 통과 (TypeScript)
- [x] ESLint 검사 통과
- [x] 프로덕션 빌드 성공

기능:
- [x] 진입포인트 구현 (역할별 자동 리다이렉트)
- [x] 네비게이션 추가
- [x] 모든 Admin/Teacher/Student 페이지 완성
- [x] 데이터베이스 마이그레이션 정의됨

테스트:
- [x] 테스트 가이드 작성됨
- [ ] 실제 테스트 실행 (배포 후)
```

---

## 🎯 배포 단계

### **Stage 1: 사전 준비 (지금)**
1. 위 체크리스트 모두 확인
2. 마이그레이션 파일 준비
3. 환경변수 준비

### **Stage 2: 배포 (선택)**
1. 배포 환경 선택 (Vercel/Docker/AWS)
2. 배포 실행
3. 환경변수 설정

### **Stage 3: 검증 (배포 후)**
1. 프로덕션 URL에서 모든 기능 테스트
2. 테스트 계정으로 전체 플로우 검증
3. 에러 로그 모니터링

---

## ⚠️ 주의사항

### 마이그레이션 순서
```
1. jr_learning_sessions (20260715000001) 먼저
2. jr_content_management (20260716000001) 나중
(의존성 없으나 순서 권장)
```

### 환경변수 누수 방지
```
❌ .env.local을 git에 올리지 않기
✅ Vercel/배포환경 대시보드에서만 설정
```

### 프로덕션 사용자
```
테스트 계정은 배포 후 삭제 또는 권한 제한:
- admin@test.com 삭제
- teacher@test.com 권한 제한
- student@test.com 삭제
```

---

## 🤔 배포 환경 선택

| 환경 | 난이도 | 비용 | 권장 |
|------|--------|------|------|
| **Vercel** | ⭐ (쉬움) | Free/Pro | ✅ MVP |
| **Docker** | ⭐⭐ (중간) | 자체 서버 | 자체 인프라 |
| **AWS** | ⭐⭐⭐ (어려움) | EC2/ECS | 대규모 |

**추천**: Vercel (Next.js 최적화, 무료, 자동 배포)

