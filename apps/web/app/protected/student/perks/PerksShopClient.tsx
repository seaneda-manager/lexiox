'use client';

import { useState } from 'react';
import Link from 'next/link';

type Perk = {
  id:          string;
  perk_type:   string;
  name:        string;
  description: string | null;
  point_cost:  number;
  image_url:   string | null;
  metadata:    Record<string, unknown> | null;
  stock:       number | null;
};

type Redemption = {
  perk_id:      string;
  status:       string;
  requested_at: string;
};

type Props = {
  catalog:       Perk[];
  totalPoints:   number;
  level:         number;
  myRedemptions: Redemption[];
};

const TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  avatar_item: { emoji: '🐣', label: '아바타' },
  theme:       { emoji: '🎨', label: '테마'   },
  physical:    { emoji: '🎁', label: '실물'   },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: '검토 중',  cls: 'bg-amber-100 text-amber-700'   },
  approved:  { label: '승인됨',   cls: 'bg-sky-100 text-sky-700'       },
  fulfilled: { label: '지급 완료', cls: 'bg-emerald-100 text-emerald-700' },
};

export default function PerksShopClient({ catalog, totalPoints: initPoints, level, myRedemptions: initRedemptions }: Props) {
  const [points, setPoints]         = useState(initPoints);
  const [redemptions, setRedemptions] = useState(initRedemptions);
  const [pending, setPending]       = useState<string | null>(null);   // perk_id being confirmed
  const [loading, setLoading]       = useState<string | null>(null);   // perk_id being processed
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<'all' | 'avatar_item' | 'theme' | 'physical'>('all');

  const redeemedIds = new Set(redemptions.map((r) => r.perk_id));

  const filtered = filter === 'all' ? catalog : catalog.filter((p) => p.perk_type === filter);

  const handleRedeem = async (perk: Perk) => {
    setLoading(perk.id);
    setError(null);
    try {
      const res  = await fetch('/api/perks/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ perk_id: perk.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setPoints(data.remaining_points);
      setRedemptions((prev) => [
        { perk_id: perk.id, status: 'pending', requested_at: new Date().toISOString() },
        ...prev,
      ]);
    } finally {
      setLoading(null);
      setPending(null);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12">

      {/* 헤더 */}
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student" className="hover:underline">대시보드</Link>
          {' / Perk 샵'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">Perk 샵</h1>
      </header>

      {/* 포인트 현황 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-amber-600">보유 포인트</p>
          <p className="text-2xl font-black text-amber-800">{points.toLocaleString()} P</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-amber-600">레벨</p>
          <p className="text-lg font-bold text-amber-700">Lv {level}</p>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'avatar_item', 'theme', 'physical'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={[
              'rounded-full px-4 py-1.5 text-xs font-semibold transition',
              filter === t
                ? 'bg-neutral-900 text-white'
                : 'border border-neutral-200 text-neutral-500 hover:bg-neutral-50',
            ].join(' ')}
          >
            {t === 'all' ? '전체' : `${TYPE_LABELS[t].emoji} ${TYPE_LABELS[t].label}`}
          </button>
        ))}
      </div>

      {/* 카탈로그 없을 때 */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
          <p className="text-sm text-neutral-400">등록된 Perk가 없습니다.</p>
          <p className="text-xs text-neutral-300 mt-1">Admin에서 Perk를 추가해 주세요.</p>
        </div>
      )}

      {/* 카탈로그 그리드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((perk) => {
          const meta      = TYPE_LABELS[perk.perk_type] ?? { emoji: '⭐', label: perk.perk_type };
          const redeemed  = redeemedIds.has(perk.id);
          const canAfford = points >= perk.point_cost;
          const outOfStock = perk.stock !== null && perk.stock <= 0;
          const isLoading = loading === perk.id;
          const isPending = pending === perk.id;

          return (
            <div
              key={perk.id}
              className={[
                'rounded-2xl border bg-white p-4 flex flex-col gap-3 transition',
                redeemed ? 'border-emerald-200 opacity-80' : 'border-neutral-200',
              ].join(' ')}
            >
              {/* 타입 배지 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{meta.emoji} {meta.label}</span>
                {perk.stock !== null && (
                  <span className={`text-xs font-medium ${outOfStock ? 'text-red-400' : 'text-neutral-400'}`}>
                    재고 {perk.stock}
                  </span>
                )}
              </div>

              {/* 이름 */}
              <div>
                <p className="text-sm font-bold text-neutral-900">{perk.name}</p>
                {perk.description && (
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{perk.description}</p>
                )}
              </div>

              {/* 포인트 */}
              <p className="text-base font-black text-amber-700">{perk.point_cost.toLocaleString()} P</p>

              {/* 교환 버튼 */}
              {redeemed ? (
                <span className="block text-center rounded-xl bg-emerald-50 border border-emerald-200 py-2 text-xs font-semibold text-emerald-600">
                  교환 완료
                </span>
              ) : outOfStock ? (
                <span className="block text-center rounded-xl bg-neutral-100 py-2 text-xs text-neutral-400">
                  품절
                </span>
              ) : isPending ? (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500 text-center">{perk.point_cost.toLocaleString()}P를 사용합니다.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPending(null)}
                      className="flex-1 rounded-xl border border-neutral-200 py-2 text-xs text-neutral-500"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRedeem(perk)}
                      disabled={isLoading}
                      className="flex-[2] rounded-xl bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {isLoading ? '처리 중…' : '확인'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setError(null); setPending(perk.id); }}
                  disabled={!canAfford}
                  className={[
                    'w-full rounded-xl py-2 text-xs font-semibold transition',
                    canAfford
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  {canAfford ? '교환하기' : '포인트 부족'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 내 교환 내역 */}
      {redemptions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">내 교환 내역</h2>
          {redemptions.map((r, i) => {
            const perk   = catalog.find((p) => p.id === r.perk_id);
            const badge  = STATUS_BADGE[r.status];
            return (
              <div key={i} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{perk?.name ?? '알 수 없는 Perk'}</p>
                  <p className="text-xs text-neutral-400">{new Date(r.requested_at).toLocaleDateString('ko-KR')}</p>
                </div>
                {badge && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
