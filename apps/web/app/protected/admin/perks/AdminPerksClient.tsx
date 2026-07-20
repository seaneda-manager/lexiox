'use client';

import { useState } from 'react';

type Perk = {
  id:          string;
  perk_type:   string;
  name:        string;
  description: string | null;
  point_cost:  number;
  stock:       number | null;
  is_active:   boolean;
};

type Redemption = {
  id:           string;
  status:       string;
  points_spent: number;
  requested_at: string;
  resolved_at:  string | null;
  admin_note:   string | null;
  student_id:   string;
  perk:         { name: string; perk_type: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-sky-100 text-sky-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-600',
};

const TYPE_LABELS: Record<string, string> = {
  avatar_item: '🐣 아바타',
  theme:       '🎨 테마',
  physical:    '🎁 실물',
};

export default function AdminPerksClient({ catalog, redemptions: initRedemptions }: { catalog: Perk[]; redemptions: Redemption[] }) {
  const [tab, setTab]               = useState<'catalog' | 'redemptions'>('redemptions');
  const [redemptions, setRedemptions] = useState(initRedemptions);
  const [processing, setProcessing] = useState<string | null>(null);

  const pending = redemptions.filter((r) => r.status === 'pending');
  const others  = redemptions.filter((r) => r.status !== 'pending');

  const handleStatus = async (id: string, status: 'approved' | 'fulfilled' | 'rejected', note?: string) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/admin/perks/resolve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ redemption_id: id, status, admin_note: note }),
      });
      if (res.ok) {
        setRedemptions((prev) =>
          prev.map((r) => r.id === id ? { ...r, status, resolved_at: new Date().toISOString(), admin_note: note ?? null } : r),
        );
      }
    } finally {
      setProcessing(null);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">Perk 관리</h1>
      </header>

      {/* 탭 */}
      <div className="flex gap-2">
        {(['redemptions', 'catalog'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'rounded-full px-4 py-1.5 text-xs font-semibold transition',
              tab === t ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-500',
            ].join(' ')}
          >
            {t === 'redemptions' ? `교환 신청 ${pending.length > 0 ? `(${pending.length})` : ''}` : '카탈로그'}
          </button>
        ))}
      </div>

      {/* 교환 신청 탭 */}
      {tab === 'redemptions' && (
        <div className="space-y-4">
          {pending.length === 0 && others.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
              교환 신청이 없습니다.
            </div>
          )}

          {pending.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">대기 중</h2>
              {pending.map((r) => (
                <RedemptionRow key={r.id} r={r} processing={processing} onAction={handleStatus} />
              ))}
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">처리 완료</h2>
              {others.map((r) => (
                <RedemptionRow key={r.id} r={r} processing={processing} onAction={handleStatus} />
              ))}
            </section>
          )}
        </div>
      )}

      {/* 카탈로그 탭 */}
      {tab === 'catalog' && (
        <div className="space-y-2">
          {catalog.map((perk) => (
            <div key={perk.id} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">{TYPE_LABELS[perk.perk_type] ?? perk.perk_type}</span>
                  {!perk.is_active && (
                    <span className="text-xs text-red-400">비활성</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-neutral-900">{perk.name}</p>
                {perk.description && <p className="text-xs text-neutral-400">{perk.description}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-amber-700">{perk.point_cost.toLocaleString()} P</p>
                {perk.stock !== null && (
                  <p className="text-xs text-neutral-400">재고 {perk.stock}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function RedemptionRow({ r, processing, onAction }: {
  r:          Redemption;
  processing: string | null;
  onAction:   (id: string, status: 'approved' | 'fulfilled' | 'rejected') => void;
}) {
  const badge = STATUS_BADGE[r.status] ?? '';
  const isPending = r.status === 'pending';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">{r.perk?.name ?? '?'}</p>
          <p className="text-xs text-neutral-400">
            {r.student_id.slice(0, 8)}… · {new Date(r.requested_at).toLocaleDateString('ko-KR')} · {r.points_spent.toLocaleString()}P
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>
          {r.status === 'pending' ? '대기' : r.status === 'approved' ? '승인' : r.status === 'fulfilled' ? '지급완료' : '반려'}
        </span>
      </div>

      {isPending && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onAction(r.id, 'fulfilled')}
            disabled={processing === r.id}
            className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            지급 완료
          </button>
          <button
            type="button"
            onClick={() => onAction(r.id, 'approved')}
            disabled={processing === r.id}
            className="flex-1 rounded-xl bg-sky-500 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            승인
          </button>
          <button
            type="button"
            onClick={() => onAction(r.id, 'rejected')}
            disabled={processing === r.id}
            className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            반려
          </button>
        </div>
      )}

      {r.admin_note && (
        <p className="text-xs text-neutral-400 italic">{r.admin_note}</p>
      )}
    </div>
  );
}
