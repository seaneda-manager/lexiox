# Jr. Learning System 실행 테스트 계획

## 🔧 테스트 전 준비

### STEP 0: 데이터베이스 준비

1. **Supabase 대시보드 접속**
   - SQL Editor 열기
   - `TEST_ACCOUNTS_SETUP.sql` 전체 복사 & 실행
   - ✅ 확인: Profiles, Reading Passages, Grammar Chapters 조회 성공

2. **Auth 계정 생성** (Supabase Auth UI)
   - Email: admin@test.com / Password: password123
   - Email: teacher@test.com / Password: password123
   - Email: student@test.com / Password: password123

3. **Auth ID 확인**
   - Supabase Auth 메뉴에서 각 계정의 User ID 복사
   - SQL에서 생성한 profile ID와 일치하는지 확인
   - 만약 안 일치하면 SQL에서 ID 수정

---

## 📋 테스트 시작

### TEST 1: Admin - Reading 지문 생성 ✅

**환경**: http://localhost:3000/admin/jr/content/reading/new
**계정**: admin@test.com / password123

```
1. 로그인
   - Email: admin@test.com
   - Password: password123
   - ✅ Admin 페이지로 이동

2. Admin 메뉴 네비게이션
   - Admin 메인 페이지에서 "Jr. Learning" 섹션 찾기
   - "콘텐츠 관리" → "관리하기" 클릭
   - ✅ /admin/jr/content 페이지 도달

3. Reading 지문 생성
   - "Reading" 카드에서 "관리하기" 클릭
   - ✅ Reading 목록 페이지 (생성한 지문 있을 수 있음)
   - "+ 새 지문" 버튼 클릭
   
4. 지문 입력
   - 제목: "The Future of Technology"
   - 난이도: Medium
   - 내용: "Technology continues to evolve at a rapid pace..."
   - "저장" 클릭
   
5. 검증
   - ✅ 목록 페이지로 이동
   - ✅ 방금 생성한 지문이 테이블에 표시됨
   - ✅ 난이도 배지 표시됨
   - ✅ 생성일 표시됨
```

**결과**: 
- 성공 🎉: 새 지문이 db에 저장되고 목록에 표시됨
- 실패 ❌: "Table not found" → DB 마이그레이션 미적용 (STEP 0 재확인)

---

### TEST 2: Admin - Grammar 단원 생성 ✅

**환경**: http://localhost:3000/admin/jr/content/grammar/new

```
1. (admin 계정 유지)
2. Admin > 콘텐츠 관리 > Grammar > 관리하기
3. "+ 새 단원" 클릭
4. 정보 입력
   - 제목: "Relative Clauses"
   - 레벨: High
   - 내용: "Relative clauses modify nouns or pronouns..."
   - "저장" 클릭
5. 검증
   - ✅ 목록에 "Relative Clauses" 표시됨
```

---

### TEST 3: Teacher - 과제 할당 ✅

**환경**: http://localhost:3000/admin/jr/assignments
**계정**: teacher@test.com / password123

```
1. 로그인 & 네비게이션
   - Email: teacher@test.com
   - ✅ Admin 페이지 도달
   
2. 과제 할당 페이지 접근
   - Admin > "Jr. Learning" > "과제 할당" > "관리하기"
   - ✅ /admin/jr/assignments 도달
   
3. 학생 선택
   - 학생 선택 드롭다운 열기
   - "Test Student" 선택
   - ✅ Reading/Grammar 콘텐츠 표시됨
   
4. Reading 할당
   - "📖 Reading" 탭 확인
   - "The Future of Technology" 지문에 "할당" 버튼 클릭
   - ✅ "Reading 과제가 할당되었습니다" 팝업
   
5. Grammar 할당
   - "📚 Grammar" 탭 이동
   - "Relative Clauses" 단원에 "할당" 버튼 클릭
   - ✅ "Grammar 과제가 할당되었습니다" 팝업
   
6. 검증
   - DB 확인:
     ```sql
     SELECT * FROM jr_reading_sessions WHERE student_id = '33333333...';
     SELECT * FROM jr_grammar_sessions WHERE student_id = '33333333...';
     ```
   - ✅ 각각 1줄씩 생성됨
```

---

### TEST 4: Teacher - Dashboard 진도 확인 ✅

**환경**: http://localhost:3000/dashboard

```
1. (teacher 계정 유지)
2. Dashboard 접근: /dashboard
3. "Jr." 탭 확인 (기본 선택됨)
4. 학생 진도 표 확인
   - 학생명: "Test Student"
   - RC (Reading): 0/1 (회색)
   - GR (Grammar): 0/1 (회색)
   - LC (Listening): 0/0 (없음)
   - SPK (Speaking): 0/0 (없음)
   - 진도: 0%
   - ✅ 모두 표시됨
```

---

### TEST 5: Student - Learning Hub ✅

**환경**: http://localhost:3000/jr
**계정**: student@test.com / password123

```
1. 로그인
   - Email: student@test.com
   - ✅ Student 대시보드로 이동
   
2. Jr. Hub 접근
   - 사이드 메뉴에서 "Jr. Learning" 클릭
   - ✅ /jr (Jr. Hub) 도달
   
3. 할당된 과제 확인
   - "📖 Reading" 섹션: "Session 1" 표시
   - "📚 Grammar" 섹션: "Chapter 1" 표시
   - ✅ 모두 클릭 가능 상태
```

---

### TEST 6: Student - Reading 학습 ✅

**환경**: http://localhost:3000/jr/reading/[sessionId]

```
1. Jr. Hub에서 "Session 1" (Reading) 클릭
2. Stage 1: 단어 책업
   - 진행률: 1 / 5
   - 지문 표시됨: "The Future of Technology..."
   - 단어 클릭하여 하이라이트 (예: "Technology", "rapid")
   - 각 단어마다 모달 팝업 (품사, 뜻, 해석 요령)
   - "다음 단계로" 클릭
   - ✅ 진행률: 2 / 5

3. Stage 2: 문법
   - 문법 요소 설명 표시
   - "이해했습니다" 클릭
   - ✅ 진행률: 3 / 5

4. Stage 3: 해석
   - 지문 해석 텍스트박스
   - 간단히 입력 후 "다음 단계로"
   - ✅ 진행률: 4 / 5

5. Stage 4: 이해
   - 객관식 문제 (최대 3개)
   - 라디오 버튼 선택 후 "다음 단계로"
   - ✅ 진행률: 5 / 5

6. Stage 5: 토론
   - 토론 질문 표시
   - 텍스트 입력 후 "학습 완료"
   - ✅ 🎉 "Reading 완료!" 화면 표시
   - "홈으로" 버튼으로 Jr. Hub 복귀

7. DB 확인:
   ```sql
   SELECT completed_at FROM jr_reading_sessions 
   WHERE student_id = '33333333...' LIMIT 1;
   ```
   - ✅ completed_at이 NOW()로 채워짐
```

---

### TEST 7: Student - Grammar 학습 ✅

**환경**: http://localhost:3000/jr/grammar/[sessionId]

```
1. Jr. Hub에서 "Chapter 1" (Grammar) 클릭
2. Stage 1: 개념
   - 문법 개념 설명 표시
   - "이해했습니다" 클릭
   - ✅ Stage 2로 이동

3. Stage 2: 연습
   - 객관식 문제 표시 (3문제)
   - 정답 선택 → "✓ 정답입니다!" 팝업
   - 틀린 답 선택 → "✗ 틀렸습니다. 힌트: ..." 팝업
   - 모든 문제 선택 후
   - ✅ 🎉 "Grammar 완료!" 화면
   - "홈으로" 버튼

4. DB 확인:
   ```sql
   SELECT completed_at FROM jr_grammar_sessions 
   WHERE student_id = '33333333...' LIMIT 1;
   ```
   - ✅ completed_at 채워짐
```

---

### TEST 8: Student - 개인 대시보드 ✅

**환경**: http://localhost:3000/student/dashboard

```
1. (student 계정 유지)
2. 사이드 메뉴 또는 URL로 대시보드 접근
3. 확인 사항
   - ✅ 학생명: "Test Student"
   - ✅ 전체 진도: 100% (프로그레스 바 꽉 찬 상태)
   - ✅ RC: 1/1 (완료 상태, 체크 표시)
   - ✅ GR: 1/1 (완료 상태)
   - ✅ LC: 0/0 (할당 안 됨)
   - ✅ SPK: 0/0 (할당 안 됨)
```

---

### TEST 9: Teacher - 최종 Dashboard 확인 ✅

**환경**: http://localhost:3000/dashboard

```
1. (teacher 계정 로그인)
2. Dashboard > Jr. 탭
3. 학생 진도 테이블 확인
   - Student 행 찾기
   - RC: 1/1 ✅
   - GR: 1/1 ✅
   - LC: 0/0
   - SPK: 0/0
   - 진도율: 100% (프로그레스 바)
4. "성과 리포트" 페이지 확인
   - /dashboard/reports
   - 주간/월간 리포트에서 100% 완료 표시
```

---

## 🎯 검증 체크리스트

- [ ] STEP 0: DB 마이그레이션 적용 완료
- [ ] TEST 1: Admin Reading 지문 생성 성공
- [ ] TEST 2: Admin Grammar 단원 생성 성공
- [ ] TEST 3: Teacher 과제 할당 성공
- [ ] TEST 4: Teacher Dashboard 진도 표시 정상
- [ ] TEST 5: Student Jr. Hub 할당 과제 표시
- [ ] TEST 6: Student Reading 5단계 모두 완료 가능
- [ ] TEST 7: Student Grammar 2단계 모두 완료 가능
- [ ] TEST 8: Student 개인 대시보드 진도 100% 표시
- [ ] TEST 9: Teacher 최종 Dashboard 업데이트 확인

---

## 📊 성공 기준

**모든 TEST 통과 시**: ✅ Jr. Learning System MVP 완성!

**일부 실패 시**: 
- 에러 메시지 기록
- 해당 STEP 재진행
- 필요시 DB 마이그레이션 확인

---

## 🐛 일반적인 문제 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| "Table not found" | 마이그레이션 미적용 | Supabase SQL에서 migration 실행 |
| 로그인 실패 | 계정 미생성 | Supabase Auth에서 계정 생성 |
| 과제 할당 후 Hub에 미표시 | 세션 생성 미반영 | 브라우저 새로고침 (F5) |
| 진도 업데이트 미반영 | 캐시 문제 | 로그아웃 후 재로그인 |
| Grammar 문제 미표시 | DB 데이터 미생성 | TEST_ACCOUNTS_SETUP.sql 재실행 |

