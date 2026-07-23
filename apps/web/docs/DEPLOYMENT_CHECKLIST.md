# Learning Stage 배포 체크리스트

**배포 일시**: 2026-09-04
**예상 다운타임**: 없음 (무중단 배포)

---

## ✅ Pre-Deployment Checklist

### 코드 품질
- [ ] `npm run type-check` — 타입 에러 0개
- [ ] `npm run lint` — 린트 경고 0개 (또는 무시 가능)
- [ ] `npm run build` — 빌드 성공
- [ ] 모든 console.error/warn 정리 (production에선 숨김)

### 기능 테스트
- [ ] ✅ Spelling Tab — 입력/확인 작동
- [ ] ✅ Meaning Tab — 뜻/정의 표시
- [ ] ✅ Quiz Tab — 선택지/결과 정확
- [ ] ✅ Sidebar — 진도/streak 표시
- [ ] ✅ API — 5개 엔드포인트 모두 작동
- [ ] ✅ Admin — 플래그 리스트/상세/수정 작동

### 데이터
- [ ] 마이그레이션 완료 (3개 테이블)
- [ ] 테스트 데이터 5개 이상 생성
- [ ] 플래그 0개 (또는 Admin에서 검토 완료)
- [ ] 데이터베이스 백업

### 보안
- [ ] 환경 변수 모두 설정 (`.env.local` 검토)
- [ ] API 권한 검증 (학생 vs Admin)
- [ ] CORS 설정 확인
- [ ] SQL Injection 방지 (ORM 사용 확인)
- [ ] XSS 방지 (입출력 새니타이제이션)

### 성능
- [ ] 페이지 로드 시간 < 2초
- [ ] API 응답 시간 < 500ms
- [ ] 이미지 최적화 확인
- [ ] 번들 크기 확인

### 모니터링
- [ ] Sentry 연동 확인
- [ ] 에러 로깅 활성화
- [ ] Analytics 활성화
- [ ] 알림 설정

---

## 🚀 배포 단계

### Step 1: 최종 통합 테스트 (5분)

```bash
# 1. 로컬에서 전체 기능 테스트
npm run dev

# 2. 학생 페이지 테스트
# - http://localhost:3000/student/learning-stage/[wordId]
# - 3개 탭 모두 작동 확인

# 3. Admin 페이지 테스트
# - http://localhost:3000/admin/learning-stage/flags
# - 플래그 리스트/상세 확인
```

### Step 2: 환경 변수 확인 (3분)

```bash
# Vercel 환경 변수 확인
vercel env list

# 필요한 변수들:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - (기타 기존 변수들)
```

### Step 3: 빌드 & 배포 (10분)

```bash
# 1. 커밋 & 푸시
git add .
git commit -m "feat: Add Learning Stage complete implementation

- DB: 3 tables (items, attempts, flags)
- API: 5 endpoints (GET/POST learning-stage)
- UI: 7 components (LearningStageLayout, Tabs, Sidebar)
- Admin: Flag management dashboard
- Validation: 7 utility functions (mojibake detection, parsing, etc.)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

git push origin main

# 2. Vercel 자동 배포 (5-10분)
# - 대시보드에서 배포 상태 모니터링
# - https://vercel.com/dashboard

# 3. 배포 완료 확인
# - Preview URL 테스트
# - Production URL 테스트
```

### Step 4: 배포 후 검증 (5분)

```bash
# 1. Production에서 학생 페이지 테스트
curl https://[domain]/api/vocab/learning-stage/[wordId]

# 2. Admin 페이지 접근 확인
# https://[domain]/admin/learning-stage/flags

# 3. 에러 로깅 확인
# - Sentry 대시보드 확인
# - 에러 0개인지 확인

# 4. 성능 모니터링
# - Vercel Analytics 확인
# - API 응답 시간 확인
```

### Step 5: 롤백 계획 (필요시)

```bash
# 만약 심각한 오류 발생 시 이전 버전으로 롤백
git revert HEAD
git push origin main

# 또는 Vercel에서 이전 배포로 즉시 복구
# (Vercel 대시보드 → Deployments → Rollback)
```

---

## 📊 모니터링 대시보드

배포 후 24시간 동안 모니터링:

### 학생 지표
- [ ] 일일 활성 사용자 (DAU)
- [ ] 학습 완료율
- [ ] 평균 학습 시간
- [ ] 에러율 < 0.1%

### Admin 지표
- [ ] 플래그 발생 건수
- [ ] 플래그 해결 시간
- [ ] 자동 복구 성공률

### 기술 지표
- [ ] API 응답 시간
- [ ] 데이터베이스 쿼리 시간
- [ ] 서버 에러율
- [ ] 네트워크 대역폭

---

## 🔧 배포 후 작업

### 즉시 (배포 당일)
- [ ] 학생 & 선생님 피드백 수집
- [ ] Slack/이메일 공지
- [ ] 긴급 버그 대응 대기

### 1주일 내
- [ ] 사용 데이터 분석
- [ ] 성능 최적화 (필요시)
- [ ] UI/UX 개선사항 정리

### 1개월 내
- [ ] 전체 데이터 정제 (자동 스크립트 실행)
- [ ] 고도화 기능 구현
- [ ] 학생 피드백 반영

---

## 📞 비상 연락처

배포 중 문제 발생 시:

1. **즉시 확인**: Sentry/Analytics
2. **롤백 고려**: 에러율 > 1%
3. **커뮤니케이션**: 팀에 알림
4. **근본 원인 분석**: 무엇이 잘못되었는가?
5. **수정 & 재배포**: 다시 배포

---

## 완료 후

배포가 완료되면:

✅ 모든 학생이 Learning Stage 사용 가능
✅ Admin이 데이터 품질 관리 가능
✅ 실시간 모니터링 & 알림 활성화
✅ 정기적 업데이트 계획 수립

**축하합니다! 🎉**
