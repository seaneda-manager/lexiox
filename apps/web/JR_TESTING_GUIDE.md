# Jr. Learning System 테스트 가이드

## 🚀 테스트 시나리오: Admin → Teacher → Student 전체 플로우

### 사전 준비

#### 1. 데이터베이스 마이그레이션 적용
```sql
-- Supabase SQL Editor에서 실행:
-- supabase/migrations/20260716000001_jr_content_management.sql 전체 복사 후 실행
```

#### 2. 테스트 계정 생성 (Supabase Auth)
- **Admin 계정**: admin@test.com / password123
- **Teacher 계정**: teacher@test.com / password123
- **Student 계정**: student@test.com / password123

각 계정에 해당하는 profiles 레코드 생성:
```sql
INSERT INTO profiles (id, role, full_name) VALUES
('admin_uuid', 'admin', 'Test Admin'),
('teacher_uuid', 'teacher', 'Test Teacher'),
('student_uuid', 'student', 'Test Student');

-- teacher_student_assignments 추가
INSERT INTO teacher_student_assignments (teacher_id, student_id)
VALUES ('teacher_uuid', 'student_uuid');
```

---

## 📝 테스트 절차

### STEP 1: Admin - Reading 지문 생성

**URL**: `http://localhost:3000/admin/jr/content/reading/new`

1. 로그인: admin@test.com / password123
2. 제목 입력: "The Benefits of Meditation"
3. 난이도 선택: Medium
4. 지문 입력:
   ```
   Meditation is an ancient practice that has been used for thousands of years
   to promote mental and physical well-being. In today's fast-paced world,
   many people are turning to meditation as a way to reduce stress and improve
   their overall quality of life. Research has shown that regular meditation
   can help lower blood pressure, reduce anxiety, and improve sleep quality.
   ```
5. "저장" 클릭 ✅ 
   - 예상: 목록 페이지로 이동, 지문 표시됨

### STEP 2: Admin - Grammar 단원 생성

**URL**: `http://localhost:3000/admin/jr/content/grammar/new`

1. (admin 로그인 유지)
2. 제목 입력: "Present Perfect Tense"
3. 레벨 선택: High
4. 내용 입력:
   ```
   The present perfect tense is used to describe actions that started in the past
   and continue to the present, or actions that happened in the recent past but
   have relevance to the present.
   
   Formation: have/has + past participle
   Examples:
   - I have lived in Seoul for 5 years.
   - She has studied English since 2020.
   ```
5. "저장" 클릭 ✅
   - 예상: 목록 페이지로 이동, 단원 표시됨

### STEP 3: Teacher - 과제 할당

**URL**: `http://localhost:3000/admin/jr/assignments`

1. 로그인: teacher@test.com / password123
2. 학생 선택 드롭다운에서 "Test Student" 선택
3. "📖 Reading" 탭 확인
   - 생성한 "The Benefits of Meditation" 지문이 표시됨
4. 오른쪽 "할당" 버튼 클릭 ✅
   - 예상: "Reading 과제가 할당되었습니다" 팝업
5. "📚 Grammar" 탭 이동
   - "Present Perfect Tense" 단원 표시
6. "할당" 버튼 클릭 ✅
   - 예상: "Grammar 과제가 할당되었습니다" 팝업

### STEP 4: Teacher - Dashboard에서 진도 확인

**URL**: `http://localhost:3000/dashboard`

1. (teacher 로그인 유지)
2. "Jr." 탭 클릭 (이미 선택되어 있음)
3. 확인 사항:
   - RC (Reading): 0/1 (할당됨, 미완료)
   - GR (Grammar): 0/1 (할당됨, 미완료)
   - 학생 "Test Student" 테이블에 표시됨 ✅

### STEP 5: Student - 학습 시작

**URL**: `http://localhost:3000/jr`

1. 로그인: student@test.com / password123
2. Jr. Hub 페이지에서 확인:
   - RC: "Session 1" 표시
   - GR: "Chapter 1" 표시
3. Reading Session 클릭:
   - **URL**: `http://localhost:3000/jr/reading/[sessionId]`
   - **1단계 (단어 책업)**: 지문에서 단어 클릭, 한 두 개 표시
   - "다음 단계로" 클릭
   - **2단계 (문법)**: "이해했습니다" 클릭
   - **3단계 (해석)**: 텍스트 입력 후 "다음 단계로"
   - **4단계 (이해)**: 라디오 버튼 선택 후 "다음 단계로"
   - **5단계 (토론)**: 텍스트 입력 후 "학습 완료" ✅
   - 예상: "Reading 완료! 🎉" 화면 표시

### STEP 6: Student - Grammar 학습

1. Jr. Hub로 돌아가기 (홈 버튼)
2. Grammar Session 클릭:
   - **1단계 (개념)**: "이해했습니다" 클릭
   - **2단계 (연습)**: 정답 선택 (점수 표시) → 다음 문제
   - 모든 문제 완료 후 "학습 완료" ✅

### STEP 7: Student - 개인 대시보드 확인

**URL**: `http://localhost:3000/student/dashboard`

1. 확인 사항:
   - 전체 진도: 50% (2/4)
   - RC: 1/1 ✅ (완료)
   - GR: 1/1 ✅ (완료)
   - 진행 바 표시 ✅

### STEP 8: Teacher - 최종 대시보드 확인

**URL**: `http://localhost:3000/dashboard`

1. (teacher 로그인)
2. "Jr." 탭 > 학생별 진도 테이블 확인:
   - Test Student: RC 1/1, GR 1/1, LC 0/0, SPK 0/0
   - 진도: 50% ✅

---

## 🔍 검증 체크리스트

- [ ] Admin에서 Reading 지문 생성 성공
- [ ] Admin에서 Grammar 단원 생성 성공
- [ ] Teacher에서 과제 할당 성공
- [ ] Jr. Hub에서 할당된 과제 표시됨
- [ ] Student가 Reading 5단계 모두 완료 가능
- [ ] Student가 Grammar 2단계 모두 완료 가능
- [ ] Teacher Dashboard에서 진도 업데이트됨
- [ ] Student Dashboard에서 개인 진도 표시됨

---

## ⚠️ 예상 이슈 및 해결 방법

### 이슈 1: "Table not found" 에러
**원인**: 마이그레이션 미적용
**해결**: Supabase SQL Editor에서 migration 수동 실행

### 이슈 2: 로그인 실패
**원인**: 계정 미생성
**해결**: Supabase Auth + profiles 테이블에서 테스트 계정 생성

### 이슈 3: 과제 할당 후 Jr. Hub에 표시 안 됨
**원인**: 세션 생성 실패
**해결**: 브라우저 새로고침 (F5)

---

## 📊 테스트 완료 후

모든 단계 완료 시:
- ✅ Admin: 콘텐츠 관리 기능 동작
- ✅ Teacher: 과제 할당 & 진도 추적 기능 동작
- ✅ Student: 학습 & 개인 대시보드 기능 동작

**결론**: Jr. Learning System MVP 완성! 🎉
