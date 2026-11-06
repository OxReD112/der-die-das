// Data cache of the reader (26.10.2026, plan: Documentation/BIBLIOTHEK_DICTIONARY_CACHE_PLAN_RU.md).
//
// The site sends every file with Cache-Control: max-age=600, so after ten minutes Safari asks the server again about
// each dictionary part it already has (a 304 answer, one more network wait per file; iPhone autoread 26.10). The
// dictionary data never changes under the same address — every file is addressed with a version (?v=…) — so this
// worker keeps such files on disk and answers them without asking the server.
//
// Only versioned data of the dictionaries goes through the cache (`cacheable`); pages and code go to the network as before.
// Any failure of the cache falls back to the network request.
// Our own dictionaries (worterbuch/german-*.json, loaded by reader/bibliothek.js with ?v=…) — since 06.11 too (audit 06.11:
// 2.4 MB at every open after the HTTP cache is gone); when one of them gets a new version, its older copies are removed
// from the cache once the new one is stored (they are large and change often).
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
const MAX_ENTRIES = 2500;                 // ~40 MB of parts + ~12 MB of our own dictionaries; the oldest entries go first
const TRIM_EVERY = 50;                    // count the entries after this many new files

const root = new URL('../', self.location.href).pathname;   // the site root (…/der-die-das/)
const dataPaths = [
  /^open%20data\/dictionary-de-json\/parts\/\d{4}\.json$/,
  /^open%20data\/dictionary-de-ru-json\/(?:parts\/\d{4}|manifest)\.json$/,
  /^bibliothek\/resolver\/data\/fallback-verb-forms\/(?:\d{4}|manifest)\.json$/,
  /^bibliothek\/resolver\/data\/[\w-]+\.json$/,
  /^worterbuch\/german-[\w-]+\.json$/,
];
const replacedOnUpdate = /^worterbuch\//;     // one copy per file: a newer version drops the older ones
// Versions of our own dictionaries start with the date (20261104-wn-nouns43-1), so a later version sorts higher; an old
// page (from the HTTP cache, or a tab left open) asking for an older version gets it from the network without storing it.
function cacheable(request) {
  if (request.method !== 'GET') return false;
  // A request that asks for a fresh copy (fetch with cache:'no-store' / 'reload' — the words window's import,
  // wortschatz/dictionary-import.js, loads the same files) goes to the network as without this worker (review 06.11).
  if (request.cache === 'no-store' || request.cache === 'reload') return false;
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
const versionOf = url => url.searchParams.get('v') || '';
async function newerKept(cache, request) {          // a later version of this file is already stored
  const url = new URL(request.url);
  if (!replacedOnUpdate.test(url.pathname.slice(root.length))) return false;
  return (await cache.keys()).some(key => { const kept = new URL(key.url); return kept.pathname === url.pathname && versionOf(kept) > versionOf(url); });
}
async function dropOlder(cache, request) {
  const url = new URL(request.url);
  if (!replacedOnUpdate.test(url.pathname.slice(root.length))) return;
  for (const key of await cache.keys()) {
    const old = new URL(key.url);
    if (old.pathname === url.pathname && versionOf(old) < versionOf(url)) await cache.delete(key);
  }
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
      event.waitUntil(newerKept(cache, request).then(newer => newer ? null : cache.put(request, copy).then(() => dropOlder(cache, request)))
        .then(() => { if (added++ % TRIM_EVERY === 0) return trim(cache); }).catch(() => {}));
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
