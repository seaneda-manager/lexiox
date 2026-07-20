const CACHE_NAME = 'lexiox-v1';

// 앱 셸 (오프라인에서도 뜨는 핵심 파일)
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: 항상 최신 데이터 우선, 오프라인이면 캐시 폴백
self.addEventListener('fetch', (event) => {
  // API·Supabase 요청은 캐시 안 함
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // 성공 응답이면 캐시에 저장 (http/https만)
        if (res.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
          try {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {}));
          } catch (e) {
            // 캐시 저장 실패는 무시
          }
        }
        return res;
      })
      .catch(async () => {
        // 네트워크 실패시 캐시에서 찾기
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        // 캐시도 없으면 null 대신 에러 응답 반환
        return new Response('Offline - 네트워크 연결이 필요합니다', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
