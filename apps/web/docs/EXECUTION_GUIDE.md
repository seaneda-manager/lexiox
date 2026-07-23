# Learning Stage 실행 가이드 (Step-by-Step)

## 📋 체크리스트

- [ ] **Step 1**: 마이그레이션 실행 (Supabase)
- [ ] **Step 2**: 테스트 데이터 생성
- [ ] **Step 3**: API 테스트
- [ ] **Step 4**: 프론트엔드 확인
- [ ] **Step 5**: Admin 대시보드 확인
- [ ] **Step 6**: 배포

---

## Step 1️⃣: 마이그레이션 실행 (5분)

### 준비물
- Supabase 대시보드 접근 권한
- `db/migrations/add_learning_stage.sql` 파일

### 실행 방법

**Option A: Supabase 콘솔 (권장)**

```
1. https://app.supabase.com 접속
2. 프로젝트 선택
3. "SQL Editor" 열기
4. "+ New query" 클릭
5. db/migrations/add_learning_stage.sql 전체 복사
6. 콘솔에 붙여넣기
7. "Run" 클릭 (또는 Ctrl+Enter)
```

**Option B: CLI**

```bash
cd C:\dev\toefl-project-25-9-3\apps\web

# 마이그레이션 확인
cat db/migrations/add_learning_stage.sql

# Supabase CLI로 실행 (설치 필요)
supabase db push
```

### 확인

마이그레이션 완료 후 Supabase 대시보드 → Table Editor에서:

```
✅ learning_stage_items (테이블)
✅ learning_stage_attempts (테이블)
✅ learning_stage_flags (테이블)
```

모두 보여야 함.

---

## Step 2️⃣: 테스트 데이터 생성 (3분)

### 준비물
- 마이그레이션 완료
- 기존 words 테이블 데이터 있음

### 실행 방법

**Supabase 콘솔에서:**

```
1. SQL Editor 열기
2. "New query" 클릭
3. db/seeds/learning_stage_seed.sql 전체 복사
4. 콘솔에 붙여넣기
5. "Run" 클릭
```

### 확인

SQL 실행 후 결과 확인:

```
✅ total_learning_items: 10 (또는 생성된 개수)
✅ clean: 10
✅ with_mojibake: 0
✅ total_attempts: 5 (또는 생성된 개수)
✅ total_flags: 0
```

---

## Step 3️⃣: API 테스트 (5분)

### 준비물
- 로컬 dev 서버 실행 중
- wordId 알고 있음 (Step 2에서 생성된)
- Supabase 인증 쿠키

### 실행 방법

**Terminal에서:**

```bash
# 1. 개발 서버 실행
cd C:\dev\toefl-project-25-9-3\apps\web
npm run dev

# 2. 다른 터미널에서 API 테스트
# 주의: [wordId]와 [authCookie]를 실제 값으로 변경

bash scripts/test-learning-stage-api.sh [wordId] [authCookie]

# 예시:
bash scripts/test-learning-stage-api.sh 12345678-1234-1234-1234-123456789012 "sb-xxx-xxx"
```

### 확인

테스트 스크립트 실행 결과:

```
1️⃣ GET /api/vocab/learning-stage/[wordId]
✅ 성공! (또는 ⚠️ 응답)

2️⃣ POST /api/vocab/learning-stage/attempt (Spelling)
✅ 성공! (또는 ⚠️ 응답)

3️⃣ POST /api/vocab/learning-stage/attempt (Meaning)
✅ 성공! (또는 ⚠️ 응답)

4️⃣ GET /api/vocab/learning-stage/progress
✅ 성공! (또는 ⚠️ 응답)
```

---

## Step 4️⃣: 프론트엔드 확인 (5분)

### 준비물
- 로컬 dev 서버 실행 중
- 학생 계정으로 로그인

### 실행 방법

**브라우저에서:**

```
1. http://localhost:3000 접속
2. 학생 계정으로 로그인
3. URL 이동: /student/learning-stage/[wordId]

예: http://localhost:3000/student/learning-stage/12345678-1234-1234-1234-123456789012
```

### 확인 사항

```
✅ 페이지 로드 성공
✅ 진도 표시 (3/40 등)
✅ 3개 탭 (Spelling, Meaning, Quiz) 모두 표시
✅ Spelling 탭: 입력창 + Check/Hear 버튼
✅ Meaning 탭: 뜻 + Related Words + Definition
✅ Quiz 탭: 선택지 + 정답 확인
✅ 우측 사이드바: 오늘의 진도 + Streak + 진행률
```

---

## Step 5️⃣: Admin 대시보드 확인 (5분)

### 준비물
- 로컬 dev 서버 실행 중
- Admin 계정으로 로그인

### 실행 방법

**브라우저에서:**

```
1. http://localhost:3000/admin/learning-stage/flags 접속
2. 플래그 리스트 확인 (현재 없어야 함)
3. 아무 플래그 클릭 → 상세 페이지 확인 (선택)
```

### 확인 사항

```
✅ Admin 페이지 접근 가능
✅ 플래그 리스트 표시
✅ 통계 (전체, 대기, 심각도별) 표시
✅ 필터 버튼 작동
```

---

## Step 6️⃣: 배포 (10분)

### 준비물
- 모든 단계 완료 (✅)
- 코드 커밋 완료

### 실행 방법

**Terminal에서:**

```bash
# 1. 코드 확인
git status

# 2. 모든 변경사항 추가
git add .

# 3. 커밋
git commit -m "feat: Add Learning Stage implementation

- DB: 3 tables (items, attempts, flags)
- API: 5 endpoints
- UI: 7 components
- Admin: Flag management dashboard
- Validation: 7 utility functions

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# 4. 푸시
git push origin main

# 5. Vercel 대시보드에서 배포 모니터링
# https://vercel.com/dashboard
```

### 확인

```
✅ GitHub 커밋 완료
✅ Vercel 배포 시작 (자동)
✅ 배포 완료 (5-10분)
✅ Preview URL 테스트
✅ Production URL 테스트
```

---

## 🎯 최종 확인

모든 단계 완료 후:

```bash
# 배포된 프로덕션에서 API 테스트
bash scripts/test-learning-stage-api.sh [wordId] [prodAuthCookie]

# 학생이 접근 가능한지 확인
# https://[domain]/student/learning-stage/[wordId]

# Admin이 접근 가능한지 확인
# https://[domain]/admin/learning-stage/flags
```

---

## 🆘 문제 발생 시

### API 401 Unauthorized
→ 인증 쿠키 확인 또는 로그인

### API 404 Not Found
→ wordId가 올바른지 확인

### 페이지 로드 안 됨
→ Console 탭에서 에러 메시지 확인

### Admin 접근 불가
→ Admin 권한 확인

### 마이그레이션 실패
→ Supabase 대시보드에서 에러 메시지 확인

---

## ✅ 완료!

모든 단계를 완료하면 **Learning Stage가 완전히 운영 가능**합니다! 🎉

학생들이 `/student/learning-stage/[wordId]`에서 학습할 수 있고,
Admin이 `/admin/learning-stage/flags`에서 데이터를 관리할 수 있습니다.
