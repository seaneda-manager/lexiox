'use client';

import { useEffect, useState } from 'react';
import type { LearningStageFlag } from '@/types/learning-stage';

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<LearningStageFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { pending: 0, approved: 0, rejected: 0, edited: 0 },
    bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'HIGH' | 'MEDIUM' | 'LOW'>('pending');

  // 플래그 조회
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter !== 'all' && filter !== 'pending') {
          params.append('severity', filter);
        } else if (filter === 'pending') {
          params.append('status', 'pending');
        }

        const response = await fetch(`/api/admin/learning-stage/flags?${params}`);
        if (!response.ok) throw new Error('Failed to fetch flags');

        const result = await response.json();
        setFlags(result.data.flags);
        setStats({
          total: result.data.total,
          byStatus: result.data.byStatus,
          bySeverity: result.data.bySeverity,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, [filter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFlagTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      MOJIBAKE_DETECTED: '모지바케 감지',
      EMPTY_MEANING: '빈 뜻',
      BAD_PAIR: '오류 쌍',
      LENGTH_MISMATCH: '길이 불일치',
      BAD_TRANSLATION: '번역 오류',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 제목 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Learning Stage 플래그 관리</h1>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
            <p className="text-sm text-gray-600 font-semibold">전체 플래그</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
            <p className="text-sm text-orange-600 font-semibold">대기 중</p>
            <p className="text-3xl font-bold text-orange-600">{stats.byStatus.pending}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-red-300">
            <p className="text-sm text-red-600 font-semibold">높음 (High)</p>
            <p className="text-3xl font-bold text-red-600">{stats.bySeverity.HIGH}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
            <p className="text-sm text-green-600 font-semibold">완료됨</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.byStatus.approved + stats.byStatus.rejected}
            </p>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-8">
          {['all', 'pending', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === f
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-teal-500'
              }`}
            >
              {f === 'all'
                ? '전체'
                : f === 'pending'
                ? '대기 중'
                : f === 'HIGH'
                ? '높음'
                : f === 'MEDIUM'
                ? '중간'
                : '낮음'}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          </div>
        )}

        {/* 플래그 리스트 */}
        {!loading && flags.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center border-2 border-gray-200">
            <p className="text-gray-600 text-lg">플래그가 없습니다.</p>
          </div>
        )}

        {!loading && flags.length > 0 && (
          <div className="space-y-4">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-teal-400 transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{flag.word_id}</h3>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded border-2 ${getSeverityColor(
                          flag.severity
                        )}`}
                      >
                        {flag.severity}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded bg-gray-100 text-gray-700">
                        {getFlagTypeLabel(flag.flag_type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{flag.detected_issue}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      신뢰도: {Math.round(flag.confidence * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(flag.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* 제안 */}
                {flag.suggested_fix && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-700 font-semibold mb-1">제안:</p>
                    <p className="text-sm text-blue-900">{flag.suggested_fix}</p>
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-2">
                  <a
                    href={`/admin/learning-stage/flags/${flag.id}`}
                    className="flex-1 bg-teal-500 text-white rounded-lg py-2 font-semibold hover:bg-teal-600 text-center transition"
                  >
                    자세히 보기
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
