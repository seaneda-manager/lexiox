'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { LearningStageFlag } from '@/types/learning-stage';

export default function AdminFlagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flagId = params.flagId as string;

  const [flag, setFlag] = useState<LearningStageFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'edit'>('approve');
  const [notes, setNotes] = useState('');
  const [editData, setEditData] = useState<Record<string, any>>({});

  // 플래그 조회
  useEffect(() => {
    const fetchFlag = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/learning-stage/flags`);
        if (!response.ok) throw new Error('Failed to fetch flags');

        const result = await response.json();
        const foundFlag = result.data.flags.find((f: LearningStageFlag) => f.id === flagId);
        if (foundFlag) {
          setFlag(foundFlag);
          setEditData(foundFlag.original_data || {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlag();
  }, [flagId]);

  // 플래그 해결
  const handleResolve = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/admin/learning-stage/flags/${flagId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            newData: action === 'edit' ? editData : undefined,
            notes,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to resolve flag');

      alert(`플래그가 ${action === 'approve' ? '승인' : action === 'reject' ? '거부' : '수정'}되었습니다.`);
      router.push('/admin/learning-stage/flags');
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">플래그를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!flag) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 font-semibold">플래그를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-teal-500 font-semibold hover:text-teal-600 mb-4"
          >
            ← 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">플래그 상세</h1>
        </div>

        {/* 플래그 정보 */}
        <div className="bg-white rounded-lg p-6 border-2 border-gray-200 mb-8">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-2">단어 ID</p>
              <p className="text-lg font-bold">{flag.word_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-2">심각도</p>
              <span
                className={`inline-block text-sm font-semibold px-3 py-1 rounded border-2 ${
                  flag.severity === 'HIGH'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : flag.severity === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}
              >
                {flag.severity}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-600 font-semibold mb-2">유형</p>
              <p className="text-lg font-bold">{flag.flag_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold mb-2">신뢰도</p>
              <p className="text-lg font-bold">{Math.round(flag.confidence * 100)}%</p>
            </div>
          </div>

          {/* 감지된 문제 */}
          <div className="bg-red-50 rounded-lg p-4 mb-6 border-l-4 border-red-400">
            <p className="text-sm text-red-700 font-semibold mb-1">감지된 문제</p>
            <p className="text-red-900">{flag.detected_issue}</p>
          </div>

          {/* 제안 */}
          {flag.suggested_fix && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border-l-4 border-blue-400">
              <p className="text-sm text-blue-700 font-semibold mb-1">제안</p>
              <p className="text-blue-900">{flag.suggested_fix}</p>
            </div>
          )}

          {/* 원본 데이터 */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 font-semibold mb-2">원본 데이터</p>
            <pre className="text-xs text-gray-800 overflow-auto bg-white p-3 rounded border border-gray-300">
              {JSON.stringify(flag.original_data, null, 2)}
            </pre>
          </div>
        </div>

        {/* 해결 옵션 */}
        <div className="bg-white rounded-lg p-6 border-2 border-gray-200 mb-8">
          <h2 className="text-xl font-bold mb-6">해결 방법 선택</h2>

          {/* 액션 선택 */}
          <div className="space-y-4 mb-8">
            {[
              { value: 'approve', label: '✅ 승인', desc: '현재 데이터로 학생에게 노출' },
              { value: 'reject', label: '❌ 거부', desc: '이 단어를 학생에게 숨김' },
              { value: 'edit', label: '✏️ 수정', desc: '데이터를 수정 후 승인' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value={opt.value}
                  checked={action === opt.value}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-sm text-gray-600">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* 수정 옵션 */}
          {action === 'edit' && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-8 border-2 border-yellow-300">
              <p className="text-sm text-yellow-700 font-semibold mb-4">수정할 데이터</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Meaning 1
                  </label>
                  <input
                    type="text"
                    value={editData.meaning_1 || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, meaning_1: e.target.value })
                    }
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Meaning 2
                  </label>
                  <input
                    type="text"
                    value={editData.meaning_2 || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, meaning_2: e.target.value })
                    }
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 노트 */}
          <div className="mb-8">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              관리자 노트 (선택사항)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="이 플래그에 대한 메모를 작성하세요..."
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleResolve}
              disabled={submitting}
              className="flex-1 bg-teal-500 text-white rounded-lg py-3 font-semibold hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {submitting ? '처리 중...' : '플래그 해결'}
            </button>
            <button
              onClick={() => router.back()}
              disabled={submitting}
              className="flex-1 bg-gray-300 text-gray-800 rounded-lg py-3 font-semibold hover:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
