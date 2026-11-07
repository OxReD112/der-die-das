/* Data cache of the reader, kept by the page itself (07.11.2026; before: the service worker dictionary-cache-sw.js, 26.10).
 *
 * Versioned dictionary files (?v=…) never change under the same address, so they are kept on disk (Cache API, the same
 * cache «bibliothek-data-1» the worker filled — nothing already stored is lost) and not asked from the server again.
 * Why not the worker any more: on the iPhone Safari stops an idle service worker, and the next request waits ~1 s for it to
 * start again — even when the file is already on disk (autoread 06.11: 8 of 204 taps ~1.1 s with every file cached, 29 of
 * 146 tap bursts with an empty cache; Documentation/QA/iPhone_Autoread_2026-11-06/). The page reads the cache directly.
 *
 * BibliothekDataCache.fetch(url, options) — like fetch: a stored copy if there is one, otherwise the network, and a good
 * answer is stored afterwards (the reader does not wait for the disk). Not ours (other paths, no ?v=, another site, a request
 * for a fresh copy with cache:'no-store' / 'reload') or no Cache API (private mode, tests in node) → plain fetch. Any failure
 * of the cache → plain fetch. A network error stays a network error (no second request).
 * Our own dictionaries (worterbuch/german-*.json): one copy per file — a later version (versions start with the date)
 * drops the older ones; an older version (an old page from the HTTP cache) is not stored.
 * A changed data file needs a new version in its address (dev/bibliothek/tools/data-versions.json, regression
 * data-cache-versions-qa.cjs); otherwise this cache keeps answering the old file.
 */
(() => {
  "use strict";
  const GENERATION = "bibliothek-data-1";   // a new value drops the whole old cache (at the first page that sees it)
  const MAX_ENTRIES = 8000;                 // ~31 MB of parts (32768 parts since 07.11, ~3.9 KB each) + ~12 MB of our own dictionaries; the oldest go first
  const TRIM_EVERY = 50;                    // count the entries after this many new files
  const dataPaths = [
    /^open%20data\/dictionary-de-json\/parts\/\d{4,5}\.json$/,   // 32768 parts since 07.11: 0000…32767
    /^open%20data\/dictionary-de-ru-json\/(?:parts\/\d{4}|manifest)\.json$/,
    /^bibliothek\/resolver\/data\/fallback-verb-forms\/(?:\d{4}|manifest)\.json$/,
    /^bibliothek\/resolver\/data\/[\w-]+\.json$/,
    /^worterbuch\/german-[\w-]+\.json$/,
  ];
  const replacedOnUpdate = /^worterbuch\//;
  const host = typeof window !== "undefined" ? window : globalThis;
  const isRequest = input => typeof Request !== "undefined" && input instanceof Request;
  const WAIT_MS = 1500;                     // a lookup that does not answer (WebKit stalls happen) counts as a miss
  const OPEN_WAIT_MS = 5000;                // the first open reads the list of entries — on a phone it can take longer
  const PAUSE_MS = 30000;                   // after a stall: plain fetch for a while, then the cache is tried again (review 07.11)
  let site = null, opened = null, added = 0, pausedUntil = 0;
  try {
    // host.__bibliothekNoDataCache: tests that block parts to simulate a failing network switch the cache off (review 07.11)
    if (typeof caches !== "undefined" && typeof location !== "undefined" && host.isSecureContext !== false && !host.__bibliothekNoDataCache)
      site = new URL("../", location.href);        // bibliothek/bibliothek.html → the site root (…/der-die-das/)
  } catch (_) { site = null; }
  const pathOf = url => url.pathname.slice(site.pathname.length);
  function cacheable(url, options) {
    if (!site || url.origin !== site.origin || !url.pathname.startsWith(site.pathname) || !url.searchParams.get("v")) return false;
    if (options && (options.cache === "no-store" || options.cache === "reload" || (options.method && options.method !== "GET"))) return false;
    const path = pathOf(url);
    return dataPaths.some(pattern => pattern.test(path));
  }
  function open() {
    if (!opened) opened = (async () => {
      const cache = await caches.open(GENERATION);
      // once per page: older generations go, and the cache is brought under its limit
      setTimeout(() => {
        caches.keys().then(names => Promise.all(names.filter(n => n.startsWith("bibliothek-data-") && n !== GENERATION).map(n => caches.delete(n))))
          .then(() => trim(cache)).catch(() => {});
      }, 4000);
      return cache;
    })();
    return opened;
  }
  async function trim(cache) {
    const keys = await cache.keys();                    // in the order the entries were added
    for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
  }
  const versionOf = url => url.searchParams.get("v") || "";
  async function store(cache, url, copy) {
    if (replacedOnUpdate.test(pathOf(url))) {        // one copy per file of our own dictionaries
      const same = await cache.keys(url.origin + url.pathname, {ignoreSearch: true});
      if (same.some(key => versionOf(new URL(key.url)) > versionOf(url))) return;      // a later version is kept: not stored
      await cache.put(url.href, copy);
      for (const key of same) if (versionOf(new URL(key.url)) < versionOf(url)) await cache.delete(key);
    } else await cache.put(url.href, copy);
    if (++added % TRIM_EVERY === 0) await trim(cache);   // (the first trim of a page: 4 s after the open)
  }
  const STALLED = Symbol("stalled");
  const within = (pending, ms) => { let timer = null;
    return Promise.race([pending, new Promise(resolve => { timer = setTimeout(() => resolve(STALLED), ms); })]).finally(() => clearTimeout(timer)); };
  async function cachedFetch(input, options) {
    let url = null;
    if (!site || Date.now() < pausedUntil || isRequest(input)) return fetch(input, options);
    try { url = new URL(String(input), location.href); } catch (_) { url = null; }
    if (!url || !cacheable(url, options)) return fetch(input, options);
    let cache = null;
    try {                                               // a broken or stalled cache (quota, private mode) only means: ask the network
      const store_ = await within(open(), OPEN_WAIT_MS);
      const kept = store_ === STALLED ? STALLED : await within(store_.match(url.href, {ignoreVary: true}), WAIT_MS);   // the version in the address is the identity
      if (kept === STALLED) { pausedUntil = Date.now() + PAUSE_MS; cache = null; }
      else {
        cache = store_;
        if (kept) {
          // a stored copy that cannot be read (a write cut off when the app was killed) is dropped and asked again
          try { const body = await kept.arrayBuffer(); return new Response(body, {status: kept.status, statusText: kept.statusText, headers: kept.headers}); }
          catch (_) { store_.delete(url.href).catch(() => {}); }
        }
      }
    } catch (_) { cache = null; }
    const response = await fetch(input, options);
    if (cache && response.status === 200 && response.type === "basic") {
      try { const copy = response.clone(); store(cache, url, copy).catch(() => {}); } catch (_) {}
    }
    return response;
  }
  // the first open (reading the list of entries) happens while the page loads, not at the first tap
  if (site) setTimeout(() => { open().catch(() => {}); }, 0);
  host.BibliothekDataCache = Object.freeze({fetch: cachedFetch, enabled: !!site});
})();
