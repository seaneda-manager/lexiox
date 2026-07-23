#!/bin/bash

# Learning Stage API 테스트 스크립트
# 사용법: bash scripts/test-learning-stage-api.sh [wordId] [authCookie]

set -e

# 설정
BASE_URL="${BASE_URL:-http://localhost:3000}"
WORD_ID="${1:-}"
AUTH_COOKIE="${2:-}"

if [ -z "$WORD_ID" ]; then
  echo "❌ wordId를 제공하세요"
  echo "사용법: bash scripts/test-learning-stage-api.sh <wordId> [authCookie]"
  exit 1
fi

echo "🧪 Learning Stage API 테스트"
echo "================================"
echo "Base URL: $BASE_URL"
echo "Word ID: $WORD_ID"
echo ""

# Test 1: 학습 데이터 조회
echo "1️⃣ GET /api/vocab/learning-stage/[wordId]"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

response=$(curl -s -X GET "$BASE_URL/api/vocab/learning-stage/$WORD_ID" \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json")

status=$(echo "$response" | jq -r '.status // "error"' 2>/dev/null || echo "error")

if [ "$status" = "success" ]; then
  echo "✅ 성공!"
  echo "$response" | jq '.data | {wordId, course, progress, spelling: .spelling.given, meanings: (.meaning.meanings | length), choices: (.quiz.choices | length)}'
else
  echo "❌ 실패"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

echo ""

# Test 2: Spelling 시도
echo "2️⃣ POST /api/vocab/learning-stage/attempt (Spelling)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

response=$(curl -s -X POST "$BASE_URL/api/vocab/learning-stage/attempt" \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{
    \"wordId\": \"$WORD_ID\",
    \"tab\": \"spelling\",
    \"data\": {
      \"spelling\": \"TEST\"
    }
  }")

status=$(echo "$response" | jq -r '.status // "error"' 2>/dev/null || echo "error")

if [ "$status" = "success" ]; then
  echo "✅ 성공!"
  echo "$response" | jq '.data | {tab, nextStep, result}'
else
  echo "⚠️ 응답"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

echo ""

# Test 3: Meaning 시도
echo "3️⃣ POST /api/vocab/learning-stage/attempt (Meaning)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

response=$(curl -s -X POST "$BASE_URL/api/vocab/learning-stage/attempt" \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{
    \"wordId\": \"$WORD_ID\",
    \"tab\": \"meaning\",
    \"data\": {
      \"viewedMeaning\": true
    }
  }")

status=$(echo "$response" | jq -r '.status // "error"' 2>/dev/null || echo "error")

if [ "$status" = "success" ]; then
  echo "✅ 성공!"
  echo "$response" | jq '.data | {tab, nextStep}'
else
  echo "⚠️ 응답"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

echo ""

# Test 4: 진행률 조회
echo "4️⃣ GET /api/vocab/learning-stage/progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

response=$(curl -s -X GET "$BASE_URL/api/vocab/learning-stage/progress" \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json")

status=$(echo "$response" | jq -r '.status // "error"' 2>/dev/null || echo "error")

if [ "$status" = "success" ]; then
  echo "✅ 성공!"
  echo "$response" | jq '.data | {day, totalWords, completed, progress}'
else
  echo "❌ 실패"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

echo ""
echo "================================"
echo "🎉 테스트 완료!"
echo ""
echo "참고:"
echo "- ✅ 모든 테스트가 성공하면 배포 준비 완료"
echo "- ⚠️ 일부 실패해도 정상 (인증, 데이터 부재 등)"
echo "- ❌ API 에러는 서버 로그 확인 필요"
