// Data cache of the reader (26.10.2026, plan: Documentation/BIBLIOTHEK_DICTIONARY_CACHE_PLAN_RU.md).
//
// The site sends every file with Cache-Control: max-age=600, so after ten minutes Safari asks the server again about
// each dictionary part it already has (a 304 answer, one more network wait per file; iPhone autoread 26.10). The
// dictionary data never changes under the same address — every file is addressed with a version (?v=…) — so this
// worker keeps such files on disk and answers them without asking the server.
//
// Only versioned data of the dictionaries goes through the cache (`cacheable`); pages, code and our own dictionaries
// (worterbuch/) go to the network as before. Any failure of the cache falls back to the network request.
// A changed data file needs a new version in its address (dev/bibliothek/tools/data-versions.json, regression
// data-cache-versions-qa.cjs); otherwise this cache keeps answering the old file.
//
// Rules (review 26.10): a data file and its new version go out in one commit; a version string is never reused — a
// rollback is a new version (an old page from the HTTP cache could store new content under the old key otherwise).
//
// Switch-off: (1) replace the body of this file with the KILL variant below (deletes every cache, unregisters),
// (2) in reader/bibliothek.js replace the register line with the unregister line given there, (3) publish both and
// keep the KILL file published for some weeks (a missing file leaves the old worker in place).
'use strict';

const GENERATION = 'bibliothek-data-1';   // a new value drops the whole old cache on activation
const MAX_ENTRIES = 2500;                 // ~40 MB of parts; the oldest entries go first
const TRIM_EVERY = 50;                    // count the entries after this many new files

const root = new URL('../', self.location.href).pathname;   // the site root (…/der-die-das/)
const dataPaths = [
  /^open%20data\/dictionary-de-json\/parts\/\d{4}\.json$/,
  /^open%20data\/dictionary-de-ru-json\/(?:parts\/\d{4}|manifest)\.json$/,
  /^bibliothek\/resolver\/data\/fallback-verb-forms\/(?:\d{4}|manifest)\.json$/,
  /^bibliothek\/resolver\/data\/[\w-]+\.json$/,
];
function cacheable(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.searchParams.get('v') || !url.pathname.startsWith(root)) return false;
  const path = url.pathname.slice(root.length);
  return dataPaths.some(pattern => pattern.test(path));
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('bibliothek-data-') && name !== GENERATION) await caches.delete(name);
    await trim(await caches.open(GENERATION)).catch(() => {});
    await self.clients.claim();
  })());
});

// The worker is stopped when idle (~30 s), so this counter starts again from 0: the first file of every life trims.
let added = 0;
async function trim(cache) {
  const keys = await cache.keys();                    // in the order the entries were added
  for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
}
async function answer(event) {
  const request = event.request;
  let cache = null;
  try {                                               // a broken cache (quota, private mode) only means: ask the network
    cache = await caches.open(GENERATION);
    const kept = await cache.match(request);
    if (kept) return kept;
  } catch (_) { cache = null; }
  const response = await fetch(request);              // a network error stays a network error (no second request)
  if (cache && response.status === 200 && response.type === 'basic') {
    // Stored after the answer is handed back: the reader does not wait for the disk.
    try {
      const copy = response.clone();
      event.waitUntil(cache.put(request, copy).then(() => { if (added++ % TRIM_EVERY === 0) return trim(cache); }).catch(() => {}));
    } catch (_) {}
  }
  return response;
}
self.addEventListener('fetch', event => {
  if (!cacheable(event.request)) return;             // not ours: the browser handles it as without this worker
  event.respondWith(answer(event));
});

/* KILL variant (switch-off) — the whole file becomes (and see the switch-off steps at the top):
'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('bibliothek-data-')) await caches.delete(name);
  await self.registration.unregister();
})()));
*/
