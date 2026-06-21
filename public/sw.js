// シンプルな Service Worker（オフライン利用のためのランタイムキャッシュ）
// basePath（サブパス配信）に依存しないよう、固定パスのプリキャッシュは行わず
// 訪れたGETレスポンスを都度キャッシュする network-first 方式にしている。
const CACHE = "kaitori-saihan-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 同一オリジンのGETのみ network-first（成功時にキャッシュ更新／失敗時にキャッシュ返却）
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(request).then((r) => r || caches.match(self.registration.scope))
      )
  );
});
