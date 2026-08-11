// 시험/드릴처럼 몰입이 필요한 화면에서는 사이드바를 자동으로 접는다.
// SidebarClient(메뉴 렌더링)와 ProtectedLayoutClient(프로필 카드 등 사이드바 하단 영역)가
// 똑같은 판정 기준을 써야 접힘 상태가 어긋나지 않으므로 한 곳에 모아둔다.

export function normalizeRoutePath(s: string | null | undefined): string {
  if (!s) return '/';
  let clean = s.split('?')[0];
  if (!clean.startsWith('/')) clean = '/' + clean;
  clean = clean.replace(/\/\([^/]+\)/g, '');
  clean = clean.replace(/\/+$/, '');
  if (!clean) clean = '/';
  return clean;
}

export function isExamRoute(pathnameRaw: string | null | undefined): boolean {
  const p = normalizeRoutePath(pathnameRaw);
  const exam = /(study|test|adaptive-demo|demo)/;
  return (
    (/\/updated-reading\//.test(p) && exam.test(p)) ||
    (/\/updated-listening\//.test(p) && exam.test(p)) ||
    (/\/speaking-2026\//.test(p) && exam.test(p)) ||
    (/\/writing-2026\//.test(p) && exam.test(p)) ||
    (/\/voca\//.test(p) && exam.test(p)) ||
    /\/hi-naesin\/drill\//.test(p)
  );
}
