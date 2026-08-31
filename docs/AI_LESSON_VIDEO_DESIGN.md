# AI 수업 강의 (리딩 / 문법) — 설계 문서

작성: 2026-08-29 · 상태: 설계 (미구현)

## 1. 목표와 제약

- 리딩·문법 강의를 AI가 **스크립트 생성 → 화면 연출 + 선생님 클론 음성 내레이션** 으로 자동 제작한다.
- **아바타 없음.** 화면에 판서/타이핑/주석이 나오고 목소리가 읽어주는 "디지털 화이트보드" 형태.
- **무겁지 않아야 함.**
  - MP4로 사전 렌더하지 **않는다.** Remotion/ffmpeg/Chromium/렌더 워커/Lambda 전부 배제.
  - 산출물 = **스토리보드 JSON + 내레이션 mp3**. 학생 브라우저가 재생 시점에 애니메이션을 오디오에 맞춰 실시간으로 그린다 (기존 퀴즈/세션 화면과 동일한 무게).
  - MP4가 꼭 필요한 경우(학부모 전송 등)만 외부 호스팅 렌더 API(Shotstack/Creatomate) 옵션. 자체 인프라 부하 0.
- 생성 부하도 가벼움: LLM은 **기존 구조화 콘텐츠 → 스토리보드 변환** + 내레이션 문장 작성만. 콘텐츠 자체를 새로 만들지 않는다.

## 2. 인앱 플레이어

`LessonPlayer` React 컴포넌트:
- 입력: `storyboard`(JSON), `audioUrl`(mp3), `wordTimings`(선택, ElevenLabs 타임스탬프)
- `<audio>` 재생 시간(`currentTime`)에 따라 현재 beat/scene 결정 → onScreen 액션을 순차 적용
- 컨트롤: 재생/일시정지, 이전/다음 문장(beat), 배속, 특정 문장 반복, 화면 단어 클릭 → 사전 팝업
- 판서/타이핑은 CSS/SVG 애니메이션 (typewriter, stroke-dashoffset 드로잉, 형광펜 span)
- 접근성: 스크립트 전문(자막) 토글

## 3. 강의 타입별 씬 구성

### 3.1 리딩 강의

| 순서 | 템플릿 | 내용 | 화면 연출 |
|---|---|---|---|
| 1 | `title` | passage 제목, 출처(교과서/모의고사/교재), 오늘 배울 것 3줄 | 제목 타이핑, 개요 bullet reveal |
| 2 | `vocab` (반복) | 단어 & 표현: 표제어 / 뜻 / 본문 예문 | 표제어 타이핑 → 뜻 slide-in → 본문 문장 표시 + 해당 부분 형광펜 |
| 3 | `keyGrammar` | 지문에서 쓰인 핵심 문법 1개 + 규칙 한 줄 | 규칙 타이핑 → 본문 예시 문장에 동그라미/화살표 |
| 4 | `sentenceAnalysis` (반복) | 본문 주요 문장 분석 & 해석 | 원문 타이핑 → S/V/O/수식어 color → 구/절 bracket + 라벨 → 수식 arrow → 한국어 해석 slide-in → 한 줄 포인트 |
| 5 | `wrap` | 요약 (단어 N · 문법 1 · 문장 M) | 체크리스트 reveal |

### 3.2 문법 강의

| 순서 | 템플릿 | 내용 | 화면 연출 |
|---|---|---|---|
| 1 | `title` | 문법 제목 + 한 줄 정의 | 제목 타이핑, 정의 reveal |
| 2 | `rule` (반복) | 문법 설명 / 형태 공식 | 공식 타이핑(`If + 과거, would + 동사원형`) + 요소별 color + "언제 쓰나" |
| 3 | `example` (반복) | 예문 설명 | 예문 타이핑 → 부분 마킹 → 해석 slide-in → 왜 이렇게 되는지 |
| 4 | `drill` (반복) | 간단한 drill 제시와 설명 | 문제 표시(빈칸/선택) → `pause`(무음, 생각 시간) → 정답 공개 + 이유 설명 |
| 5 | `wrap` | 핵심 3줄 요약 | reveal |

## 4. 스토리보드 JSON 스키마

```jsonc
{
  "version": 1,
  "type": "reading" | "grammar",
  "title": "string",
  "sourceRef": { "kind": "passage" | "grammar_concept", "id": "uuid" },
  "voiceId": "string",              // 선생님 클론 voice
  "locale": "ko",                   // 내레이션 언어 (설명은 한국어, 예문은 영어)
  "scenes": [
    {
      "template": "title | vocab | keyGrammar | sentenceAnalysis | rule | example | drill | wrap",
      "data": { /* 템플릿별 정적 데이터 (예: vocab 표제어/뜻) */ },
      "beats": [
        {
          "narration": "string",     // TTS로 읽을 문장 (한국어 설명)
          "onScreen": [ /* 액션 배열, 아래 §5 */ ],
          "holdMs": 800               // 내레이션 종료 후 추가 유지 시간 (선택)
        }
      ]
    }
  ]
}
```

## 5. onScreen 액션 primitives

| 액션 | 필드 | 의미 |
|---|---|---|
| `type` | `text`, `target?` | 텍스트를 타이핑 애니메이션으로 표시 |
| `reveal` | `id`/`text` | 줄·박스 즉시 등장(페이드/슬라이드) |
| `highlight` | `span` | 형광펜 |
| `circle` / `underline` / `strike` | `span` | 마커 주석 |
| `arrow` | `from`, `to`, `label?` | 두 span 사이 화살표 (수식/연결 관계) |
| `bracket` | `span`, `label` | 구/절 묶기 + 라벨 (예: "관계사절") |
| `color` | `span`, `role` (`S`\|`V`\|`O`\|`C`\|`M`) | 문장 성분 색 구분 |
| `translate` | `ko` | 한국어 해석을 아래에 slide-in |
| `note` | `text`, `at?` | 여백 메모 (손글씨 폰트) |
| `pause` | `ms` | 무음 정지 (drill 생각 시간) |
| `image` | `url`, `caption?` | 이미지 (옵션, HF 생성 이미지 등) |

`span`은 현재 화면 텍스트의 부분 문자열 또는 토큰 인덱스로 지정.

**판서 스타일 원칙:** 전체 손글씨 폰트 대신 **깨끗한 본문 폰트 + 마커 주석 레이어**(circle/underline/arrow/highlight). 공부 가독성 우선, LLM이 "'although'에 동그라미"처럼 지시하기 쉬움. 여백 `note`만 손글씨 폰트.

## 6. 음성 (선생님 클론)

- ElevenLabs **Professional Voice Clone** 1회 제작 (선생님이 30분~1시간, 영어+한국어 섞어 수업 톤으로 낭독). 동의 녹음 보관.
- `voice_id`를 서버 env/config에 저장, 스톡 음성 폴백.
- 내레이션 생성: 현재 `/stream` 대신 **`/v1/text-to-speech/{id}/with-timestamps`** 사용 → 단어 단위 타임스탬프 → 화면 텍스트가 읽는 타이밍에 정확히 하이라이트 (어학 학습에 유효).
- `lib/elevenlabs/generate-speech.ts`에 `generateSpeechWithTimestamps()` 추가 (기존 `generateSpeech`와 병렬).
- beat 단위로 mp3 생성 후 이어붙이거나, scene 단위 하나로. 레이트리밋(≈20 req/min) 고려 — 기존 `generateSpeechBatch` 관례(3s sleep) 재사용.

## 7. 생성 파이프라인

```
콘텐츠(기존)                        신규 처리                         산출물
─────────────                     ─────────────                    ─────────
리딩: passage 본문 + translation_ko   ─┐
      + 단어분석/문장분석(리딩 리뷰      │
        워크플로우 Stage 2~3 데이터)     ├─→ [1] LLM: 콘텐츠→스토리보드 JSON
문법: grammar_concepts 설명/예문/drill ─┘        + beat별 내레이션 문장
                                              │
                                              ├─→ [2] AI 페르소나 QA (hi-naesin과 동일 구조)
                                              │        스토리보드·내레이션·해석 오류 검사·수정
                                              │
                                              ├─→ [3] ElevenLabs 클론 음성 + 타임스탬프
                                              │
                                              └─→ [4] Supabase Storage 저장 + DB row
                                                       → 강의(강좌 콘텐츠)에 연결
```

- [1][2][3]은 순수 API 호출 (LLM + ElevenLabs). 무거운 컴퓨트 없음.
- Admin 버튼으로 트리거 (기존 "오디오 생성 / 화자사진" 버튼과 동일 비동기 패턴). 상태: `pending` → `qa` → `tts` → `ready` / `failed`.
- 재생성: 스토리보드 JSON 편집 후 [3]만 다시 (또는 특정 scene만).

## 8. 데이터 모델 (초안)

```sql
create table lesson_videos (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('reading','grammar')),
  source_kind   text not null check (source_kind in ('passage','grammar_concept')),
  source_id     uuid not null,
  title         text not null,
  storyboard    jsonb not null,         -- §4
  audio_url     text,                   -- 통합 mp3
  word_timings  jsonb,                  -- ElevenLabs 타임스탬프
  voice_id      text,
  status        text not null default 'pending'
                check (status in ('pending','qa','tts','ready','failed')),
  qa_report     jsonb,                  -- 페르소나 QA 결과
  error         text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

## 9. 빌드 단계

1. **씬 템플릿 컴포넌트** 8종 + `LessonPlayer` (정적 storyboard 목업으로 먼저)
2. **스토리보드 스키마 + 검증**(zod) + `onScreen` 액션 렌더러
3. **ElevenLabs 타임스탬프** 헬퍼 + 클론 voice 세팅
4. **LLM 변환기**: 리딩/문법 콘텐츠 → 스토리보드 (프롬프트 + few-shot)
5. **페르소나 QA** 연동 ([[hi-naesin 대본 QA]]와 공유)
6. **Admin 생성 UI** + `lesson_videos` 테이블 + 상태 머신
7. 강좌/강의 화면에 플레이어 임베드
8. (옵션) 외부 렌더 API로 MP4 export

## 10. 미결정

- 씬당 beat 세분화 정도 (문장 하나 = beat 하나?)
- `span` 지정 방식: 부분 문자열 매칭 vs 토큰 인덱스 (동일 단어 반복 시)
- 내레이션 = 100% 한국어 vs 예문 읽을 때 영어 (→ 클론 voice의 영어 품질에 의존)
- 리딩 "주요 문장" 선정: 기존 문장분석 데이터에 이미 있나, 아니면 LLM이 고르나
- drill 정답 판정을 플레이어에서 인터랙티브하게 받을지(퀴즈화) vs 설명만
- 페르소나 QA 통과 기준 / 재생성 루프 상한

## 관련

- 페르소나 QA 파이프라인: `naesin_exam_prep_system_design_2026_08_27` 메모 (AI 콘텐츠생성 + AI페르소나검증)
- 기존 음성: `apps/web/lib/elevenlabs/generate-speech.ts`
- 리딩 리뷰 워크플로우(문장분석/해석 데이터원): `reading_review_workflow_2026_08_02` 메모
- 문법 허브: `grammar_engine_unification_2026_08_27` 메모
