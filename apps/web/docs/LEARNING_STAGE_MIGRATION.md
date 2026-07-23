# Learning Stage 마이그레이션 가이드

## 1. 마이그레이션 실행

### Supabase 콘솔 사용 (권장)

1. Supabase 대시보드 접속
2. SQL Editor 열기
3. `db/migrations/add_learning_stage.sql` 파일의 전체 내용 복사
4. SQL 에디터에 붙여넣기
5. **Run** 클릭

### 또는 CLI 사용

```bash
# Supabase CLI 설치 (있다면 생략)
npm install -g supabase

# 마이그레이션 적용
supabase migration up
```

---

## 2. 마이그레이션 확인

Supabase 콘솔 → Table Editor에서 다음 테이블 확인:

- ✅ `learning_stage_items`
- ✅ `learning_stage_attempts`
- ✅ `learning_stage_flags`

---

## 3. 테스트 데이터 추가

### 테스트용 Learning Stage 데이터 생성

```sql
-- 기존 words 테이블에서 첫 5개 단어로 Learning Stage 데이터 생성
INSERT INTO learning_stage_items (
  word_id,
  given_spelling,
  meaning_1,
  meaning_1_en,
  meaning_2,
  meaning_2_en,
  meaning_related_words,
  quiz_synonyms,
  quiz_example_en,
  quiz_example_ko,
  quiz_choices
)
SELECT
  id,
  word,
  meanings_ko[1],
  meanings_en[1],
  CASE WHEN array_length(meanings_ko, 1) > 1 THEN meanings_ko[2] ELSE NULL END,
  CASE WHEN array_length(meanings_en, 1) > 1 THEN meanings_en[2] ELSE NULL END,
  '["related1", "related2"]'::jsonb,
  '["synonym1", "synonym2"]'::jsonb,
  'This is an example sentence with the word.',
  '이것은 단어를 포함한 예문입니다.',
  '[
    {"id": 1, "text": "' || meanings_ko[1] || '", "is_correct": true},
    {"id": 2, "text": "오답1", "is_correct": false},
    {"id": 3, "text": "오답2", "is_correct": false},
    {"id": 4, "text": "오답3", "is_correct": false}
  ]'::jsonb
FROM words
LIMIT 5;
```

---

## 4. API 테스트

### Test 1: 학습 데이터 조회

```bash
curl -X GET http://localhost:3000/api/vocab/learning-stage/[wordId] \
  -H "Cookie: [auth-cookie]"

# 예상 응답: 200 + LearningStageData
```

### Test 2: 시도 기록

```bash
curl -X POST http://localhost:3000/api/vocab/learning-stage/attempt \
  -H "Content-Type: application/json" \
  -H "Cookie: [auth-cookie]" \
  -d '{
    "wordId": "[wordId]",
    "tab": "spelling",
    "data": {"spelling": "APPRECIATE"}
  }'

# 예상 응답: 200 + LearningStageAttemptResponse
```

### Test 3: 진행률 조회

```bash
curl -X GET http://localhost:3000/api/vocab/learning-stage/progress \
  -H "Cookie: [auth-cookie]"

# 예상 응답: 200 + 진행률 데이터
```

---

## 5. 데이터 정제 (Admin용)

### Admin이 할 일

1. **문제 감지**: 검증 함수 실행
   ```typescript
   import { validateLearningStageItem } from '@/lib/learning-stage';
   
   const validation = validateLearningStageItem({
     word: 'appreciate',
     meanings_ko: ['감사하다', '증가하다'],
     meanings_en: ['to feel grateful', 'to increase in value'],
   });
   
   if (!validation.valid) {
     // 플래그 생성
   }
   ```

2. **플래그 확인**: `/admin/learning-stage/flags`

3. **수동 수정**: 플래그별로 승인/거부/수정

---

## 6. 체크리스트

- [ ] 마이그레이션 실행 완료
- [ ] 테이블 3개 생성 확인
- [ ] 테스트 데이터 5개 삽입
- [ ] API 3개 테스트 성공
- [ ] 문제 있는 데이터 식별
- [ ] Admin에서 수동 수정 완료

---

## 7. 트러블슈팅

### 마이그레이션 실패

**증상**: "relation already exists"

**해결**: 테이블이 이미 있을 수 있음
```sql
DROP TABLE IF EXISTS learning_stage_items CASCADE;
DROP TABLE IF EXISTS learning_stage_attempts CASCADE;
DROP TABLE IF EXISTS learning_stage_flags CASCADE;

-- 다시 실행
```

### API 인증 오류

**증상**: 401 Unauthorized

**해결**: 쿠키/토큰 확인
- Supabase auth 쿠키가 유효한지 확인
- 학생 계정으로 로그인되어 있는지 확인

---

## 8. 배포 전 최종 확인

```bash
# 타입 검사
npm run type-check

# 린트 검사
npm run lint

# 빌드 테스트
npm run build

# 로컬 테스트
npm run dev
```

모든 테스트 통과 후 배포!
