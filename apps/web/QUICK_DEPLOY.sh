#!/bin/bash

# Jr. Learning System 배포 스크립트
# Usage: bash QUICK_DEPLOY.sh

echo "🚀 Jr. Learning System 배포 준비"
echo "================================"

# 1. 빌드 테스트
echo "📦 [1/4] 빌드 테스트 중..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi
echo "✅ 빌드 성공"

# 2. Vercel CLI 확인
echo ""
echo "🔧 [2/4] Vercel CLI 확인 중..."
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI 설치 필요"
    echo "npm i -g vercel"
    exit 1
fi
echo "✅ Vercel CLI 설치됨"

# 3. Git 상태 확인
echo ""
echo "📝 [3/4] Git 상태 확인 중..."
git status
echo ""
read -p "모든 변경사항이 커밋되었나요? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 먼저 변경사항을 커밋하세요"
    exit 1
fi
echo "✅ Git 상태 OK"

# 4. 배포
echo ""
echo "🌍 [4/4] Vercel에 배포 중..."
echo ""
echo "이 명령을 실행하세요:"
echo "  vercel --prod"
echo ""
echo "Vercel 대시보드에서 환경변수를 설정하세요:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""
read -p "지금 배포하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
else
    echo "❌ 배포 취소됨"
    exit 1
fi
