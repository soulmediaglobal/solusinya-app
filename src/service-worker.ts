import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE = `solu-${version}`;
// App shell: built JS/CSS and static files (the member QR is drawn in the browser, so the card still opens offline).
const ASSETS: string[] = [...immutable, ...assets].map((a) => '/' + a.path.replace(/^\//, '')).filter((p) => !p.endsWith('.map'));

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll([...ASSETS, '/index.html']).catch(() => undefined))
			.then(() => sw.skipWaiting())
	);
});
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});
sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return; // Supabase and fonts are never cached here
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
		return;
	}
	if (req.mode === 'navigate') {
		// Pages are one SPA shell: try the network, fall back to the cached shell when offline.
		event.respondWith(fetch(req).catch(() => caches.match('/index.html').then((r) => r ?? Response.error())));
	}
});
