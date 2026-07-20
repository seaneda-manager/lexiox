'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, Trash2 } from 'lucide-react';

interface ReviewItem {
  id: string;
  type: 'reading' | 'grammar' | 'listening' | 'speaking-writing';
  title: string;
  ai_score: number;
  ai_review: Record<string, any>;
  content: Record<string, any>;
  source_textbook?: string;
  source_page?: number;
  created_at: string;
}

interface ContentReviewClientProps {
  initialItems: ReviewItem[];
}

export default function ContentReviewClient({ initialItems }: ContentReviewClientProps) {
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const typeLabels = {
    reading: '📖 Reading',
    grammar: '📚 Grammar',
    listening: '🎧 Listening',
    'speaking-writing': '🎤 Speaking-Writing'
  };

  const handleApprove = async (id: string, type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/jr/content/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string, type: string) => {
    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/jr/content/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, reason: rejectionReason })
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== id));
        setRejectionReason('');
        setSelectedId(null);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(item => item.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">📋 AI 콘텐츠 검토</h1>
          <p className="text-slate-600 mt-2">
            AI가 생성한 콘텐츠를 검토하고 승인하세요
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">모두 검토 완료!</h2>
            <p className="text-slate-600">승인 대기 중인 콘텐츠가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* List */}
            <div className="col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-slate-100 p-4 border-b">
                  <h2 className="font-semibold text-slate-900">
                    대기 중: {items.length}개
                  </h2>
                </div>
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition ${
                        selectedId === item.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {typeLabels[item.type]}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            item.ai_score >= 85
                              ? 'bg-green-100 text-green-700'
                              : item.ai_score >= 70
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.ai_score}점
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detail */}
            {selectedItem && (
              <div className="col-span-2">
                <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
                  {/* Header */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {selectedItem.title}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                          {typeLabels[selectedItem.type]}
                          {selectedItem.source_textbook && (
                            <> • {selectedItem.source_textbook}
                            {selectedItem.source_page && ` (p.${selectedItem.source_page})`}</>
                          )}
                        </p>
                      </div>
                      <div
                        className={`text-3xl font-bold px-4 py-2 rounded-lg ${
                          selectedItem.ai_score >= 85
                            ? 'bg-green-100 text-green-700'
                            : selectedItem.ai_score >= 70
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {selectedItem.ai_score}%
                      </div>
                    </div>
                  </div>

                  {/* AI Review */}
                  {selectedItem.ai_review && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        AI 검토 의견
                      </h3>
                      <div className="bg-slate-50 rounded p-4 space-y-2">
                        {selectedItem.ai_review.status && (
                          <p className="text-sm">
                            <strong>상태:</strong> {selectedItem.ai_review.status}
                          </p>
                        )}
                        {selectedItem.ai_review.notes &&
                          Array.isArray(selectedItem.ai_review.notes) && (
                            <div>
                              <strong className="text-sm">피드백:</strong>
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                {selectedItem.ai_review.notes.map(
                                  (note: string, idx: number) => (
                                    <li key={idx} className="text-sm text-slate-600">
                                      {note}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {selectedItem.ai_review.issues &&
                          Array.isArray(selectedItem.ai_review.issues) &&
                          selectedItem.ai_review.issues.length > 0 && (
                            <div>
                              <strong className="text-sm text-red-700">문제점:</strong>
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                {selectedItem.ai_review.issues.map(
                                  (issue: string, idx: number) => (
                                    <li key={idx} className="text-sm text-red-600">
                                      {issue}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Content Preview */}
                  {selectedItem.content && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        콘텐츠 미리보기
                      </h3>
                      <div className="bg-slate-50 rounded p-4 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                          {JSON.stringify(selectedItem.content, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t pt-6 space-y-4">
                    <button
                      onClick={() => handleApprove(selectedItem.id, selectedItem.type)}
                      disabled={loading}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      승인 & 게시
                    </button>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        거절 사유 (선택사항)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="예: 단어 선택이 부정확함. 다시 생성해주세요."
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                      />
                    </div>

                    <button
                      onClick={() => handleReject(selectedItem.id, selectedItem.type)}
                      disabled={loading || !rejectionReason.trim()}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      거절 & 재생성
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
