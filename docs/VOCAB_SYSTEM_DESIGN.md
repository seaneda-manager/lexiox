# 단어장 배정 및 실시간 진도 관리 시스템 - 기술 설계서

## 1. 개요 및 요구사항

본 시스템은 단어집을 프로그램 내에 등록하고, 회원별로 실시간 진도를 배정 및 제어하는 시스템입니다. 학생의 자율성과 반복 학습을 보장하기 위해 고정형 배정이 아닌 실시간 큐(Dynamic Queue) 방식으로 진도를 제어합니다.

### 💡 핵심 비즈니스 규칙 (Business Rules)

1. **기본 진도**: 회원은 하루에 기본적으로 1개의 Day씩 순차적으로 학습합니다. (`Day 1` ➡️ `Day 2` ➡️ `Day 3`...)
2. **하루 학습 제한 (Max 2일분)**: 학생이 원할 경우, 당일 학습을 완료하면 즉시 다음 Day를 이어서 학습할 수 있으나, 하루에 최대 2개의 Day까지만 완료할 수 있습니다.
3. **익일 자동 연동**: 어제 1개 분량을 했든, 2개 분량을 했든 상관없이 다음 날 로그인하면 마지막 완료한 Day의 다음 번호부터 자동으로 오늘의 학습이 시작됩니다.
4. **언제든지 복습 가능**: 회원이 이미 한 번이라도 완료한(학습한) 과거의 모든 Day는 진도와 무관하게 언제든지 복습 메뉴를 통해 재학습이 가능해야 합니다.

---

## 2. 데이터베이스 ERD 구조 (Database Schema)

### 🗂️ 1. Members (회원 테이블)
회원의 기본 정보 및 현재 마스터 코스 정보를 관리합니다.

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `member_id` | VARCHAR | PK | 회원 고유 ID |
| `name` | VARCHAR | | 이름 |
| `grade` | VARCHAR | | 학년 |
| `level` | VARCHAR | | 레벨 |
| `current_book_id` | INT | FK | 현재 배정된 단어장 ID |

### 🗂️ 2. Vocabulary_Books (단어장 테이블)

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `book_id` | INT | PK, Auto Inc | 단어장 고유 ID |
| `book_name` | VARCHAR | | 단어장 명칭 (예: 해커스 TOEFL 보카) |
| `total_days` | INT | | 해당 단어장의 총 챕터(Day) 수 |

### 🗂️ 3. Chapters (챕터/Days 테이블)

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `chapter_id` | INT | PK, Auto Inc | 챕터 고유 ID |
| `book_id` | INT | FK | `Vocabulary_Books.book_id` 참조 |
| `day_number` | INT | | 회차 번호 (1, 2, 3... 순차 증가) |

### 🗂️ 4. Student_Progress (학생별 실시간 진도 및 복습 테이블)
학생이 학습을 완료할 때마다 로그(Log) 형태로 쌓이는 핵심 테이블입니다.

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `progress_id` | INT | PK, Auto Inc | 진도 로그 고유 ID |
| `member_id` | VARCHAR | FK | `Members.member_id` 참조 |
| `book_id` | INT | FK | `Vocabulary_Books.book_id` 참조 |
| `chapter_id` | INT | FK | `Chapters.chapter_id` 참조 |
| `completed_at` | DATETIME | | 학습 완료 일시 (DEFAULT CURRENT_TIMESTAMP) |

---

## 3. 핵심 백엔드 로직 및 쿼리 가이드 (Backend Logic)

### 🚀 로직 A: 오늘의 학습 화면 진입 시 (당일 학습 제어)

학생이 메인 화면 또는 오늘의 학습 탭에 진입할 때 호출되는 API 로직입니다.

**단계 1: 오늘 완료한 Day 총 개수 파악**

```sql
SELECT COUNT(*) AS today_count 
FROM Student_Progress 
WHERE member_id = :member_id 
  AND DATE(completed_at) = CURRENT_DATE();
```

**제어 로직:**
- IF `today_count >= 2` 인 경우:
  - 통제: 오늘의 학습 진입을 차단합니다.
  - 응답 메시지: "오늘의 학습 제한량(2일분)을 모두 완료했습니다. 내일 다음 진도가 오픈됩니다!"
  
- ELSE (`today_count`가 0 또는 1인 경우):
  - 진행: 다음 학습해야 할 `day_number`를 계산하여 단어 데이터를 리턴합니다.

**단계 2: 마지막 완료한 day_number 찾기**

```sql
SELECT COALESCE(MAX(c.day_number), 0) AS last_completed_day
FROM Student_Progress sp
JOIN Chapters c ON sp.chapter_id = c.chapter_id
WHERE sp.member_id = :member_id AND sp.book_id = :current_book_id;
```

**결과 처리:**
- `last_completed_day + 1`에 해당하는 `day_number`를 오늘의 학습 챕터로 지정하여 화면에 로드합니다.
- (기존에 완료한 적이 없다면 `0 + 1 = Day 1`이 로드됨)
- 학생이 해당 Day를 완료(제출)하면 `Student_Progress` 테이블에 `INSERT` 치고 화면을 새로고침(Reload) 합니다.

### 🔄 로직 B: 과거 완료 내역 조회 (과거 복습 기능)

진도와 상관없이 상시 접근 가능한 복습 메뉴용 API 로직입니다.

```sql
-- 학생이 지금까지 한 번이라도 완료한 모든 Day 목록을 순차적으로 조회합니다.
SELECT DISTINCT c.day_number, c.chapter_id, c.book_id
FROM Student_Progress sp
JOIN Chapters c ON sp.chapter_id = c.chapter_id
WHERE sp.member_id = :member_id AND sp.book_id = :current_book_id
ORDER BY c.day_number ASC;
```

**프론트엔드 처리:**
- 위 쿼리 결과를 바탕으로 사이드바나 복습 탭에 `[Day 1]`, `[Day 2]`... 버튼 리스트를 렌더링합니다.
- 사용자가 과거 Day를 클릭하면, 오늘의 진도(Student_Progress)에 영향을 주지 않고 해당 단어 세트만 뷰어(또는 복습 테스트 UI)로 연결합니다.

---

## 4. 예시 시나리오에 따른 데이터 흐름

### 월요일 (최초 진입)
- `today_count` = 0 ➡️ Day 1 로드 및 학습 진행.
- Day 1 완료 버튼 클릭 ➡️ `Student_Progress`에 Day 1 저장 완료.
- 화면 리로드 ➡️ `today_count` = 1 이므로 차단하지 않고 다음 진도인 Day 2 즉시 로드.
- 학생이 종료 후 로그아웃.

### 화요일 (다음날)
- 날짜가 바뀌었으므로 `today_count` = 0으로 초기화.
- 마지막 완료가 Day 1이므로 Day 2부터 자동 시작.
- Day 2 완료 ➡️ 즉시 Day 3 로드.
- Day 3까지 완료 ➡️ `today_count` = 2가 되므로 당일 학습 화면 진입 차단.

### 수요일 (다다음날)
- `today_count` = 0 초기화. 마지막 완료가 Day 3이므로 자동으로 Day 4부터 프로세스 시작.

---

## 5. 개발 주의사항

1. **중요**: `Student_Progress`는 로그 테이블입니다. 각 학습 완료마다 새로운 row가 INSERT됩니다 (UPDATE나 DELETE 금지).
2. **시간대**: `DATE()` 함수 사용 시 서버 타임존을 확인하여 KST 기준으로 일일 리셋이 정확하게 작동하는지 검증합니다.
3. **성능**: 대량의 학생이 동시에 접근할 경우, `Student_Progress` 테이블에 인덱스를 적절히 설정합니다.
   - Index 추천: `(member_id, book_id, completed_at)`
4. **복습 기능**: 복습 메뉴는 `today_count` 체크 로직과는 독립적으로 작동해야 합니다.

---

이 문서를 개발자에게 전달하면, "스케줄러로 매일 배정하는 방식이 아니라, `Student_Progress` 로그 테이블 기반의 실시간 카운팅/진도 계산 알고리즘이구나" 하고 바로 파악하여 깔끔한 코드를 작성할 것입니다.