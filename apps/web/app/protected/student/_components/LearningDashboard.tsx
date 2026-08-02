'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  reading: any;
  listening: any;
  speaking: any;
  writing: any;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  section?: string;
  priority: string;
}

export function LearningDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recsRes] = await Promise.all([
          fetch('/api/learning-stats'),
          fetch('/api/review-recommendations'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
        if (recsRes.ok) {
          const data = await recsRes.json();
          setRecommendations(data.recommendations);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 학습 통계 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">📊 학습 통계</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats && [
            { name: 'Reading', data: stats.reading, color: 'blue' },
            { name: 'Listening', data: stats.listening, color: 'purple' },
            { name: 'Speaking', data: stats.speaking, color: 'orange' },
            { name: 'Writing', data: stats.writing, color: 'green' },
          ].map((section) => (
            <div
              key={section.name}
              className={`rounded-lg border border-${section.color}-200 bg-${section.color}-50 p-4`}
            >
              <p className={`text-xs font-bold text-${section.color}-700 uppercase`}>
                {section.name}
              </p>
              <div className={`text-2xl font-bold text-${section.color}-700 my-2`}>
                {section.data.accuracy}%
              </div>
              <p className="text-xs text-slate-600">
                {section.data.totalTests}개 테스트
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 학습 추천 */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">💡 학습 추천</h3>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div
                key={idx}
                className={`rounded-lg border-2 p-4 ${
                  rec.priority === 'high'
                    ? 'border-red-200 bg-red-50'
                    : rec.priority === 'medium'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={`font-semibold ${
                        rec.priority === 'high'
                          ? 'text-red-900'
                          : rec.priority === 'medium'
                            ? 'text-yellow-900'
                            : 'text-green-900'
                      }`}
                    >
                      {rec.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{rec.description}</p>
                  </div>
                  {rec.section && (
                    <Link
                      href={`/updated-${rec.section}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 ml-2 whitespace-nowrap"
                    >
                      이동 →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
