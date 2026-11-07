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
 * The limit takes only parts (speed chat 07.11): on the iPhone our own data files stored 26.10 were the oldest entries, the
 * age limit dropped them and they were downloaded again, while thousands of parts of the old 8 192 version lay unused. Now
 * only numbered parts (…/NNNN.json) are removed at the limit, the oldest first — so the parts of an old version go first; of
 * a file that is not a part (our dictionaries, data/*.json, manifests: a few dozen) only a copy in an earlier version may
 * go, never the one with the latest version (versions start with the date, so they compare as text).
 * No counting while reading (speed chat 07.11, autoread v4 on the iPhone): counting the entries (cache.keys(), ~7 500) took
 * 3.4–3.6 s there, it ran 4 s after every page open and after every 50 new files, and the lookups waiting behind it ran
 * into WAIT_MS — the long taps of 2–3 s. Now the number of entries is kept (localStorage, «bibliothekDataCacheCount»): +1
 * per stored file; the entries are counted only when that number is over the limit, unknown, or a day old — and then only
 * when the cache has not been used for IDLE_MS; a clean-up goes down to 90 % of the limit, so the next one is far away.
 */
(() => {
  "use strict";
  const GENERATION = "bibliothek-data-1";   // a new value drops the whole old cache (at the first page that sees it)
  const MAX_ENTRIES = 8000;                 // ~31 MB of parts (32768 parts since 07.11, ~3.9 KB each) + ~12 MB of our own dictionaries; the oldest parts go first
  const IDLE_MS = 10000, RECOUNT_MS = 24 * 3600 * 1000, KEEP = 0.9;   // count only in a quiet moment; at most once a day otherwise
  const COUNT_KEY = "bibliothekDataCacheCount";
  const limit = () => Number((typeof window !== "undefined" && window.__bibliothekDataCacheMax) || 0) || MAX_ENTRIES;   // (a test sets a small limit)
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
  const WAIT_MS = 500;                      // a lookup that does not answer (WebKit stalls happen) counts as a miss (1.5 s before 07.11)
  const OPEN_WAIT_MS = 5000;                // the first open reads the list of entries — on a phone it can take longer
  const PAUSE_MS = 30000;                   // after a stall: plain fetch for a while, then the cache is tried again (review 07.11)
  let site = null, opened = null, pausedUntil = 0, lastUse = 0, countTimer = null;
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
      // once per page: older generations go; the entries are counted later, in a quiet moment, if they need to be
      setTimeout(() => {
        caches.keys().then(names => Promise.all(names.filter(n => n.startsWith("bibliothek-data-") && n !== GENERATION).map(n => caches.delete(n))))
          .then(() => { const c = readCount(); if (!c || c.n > limit() || Date.now() - c.at > RECOUNT_MS) countLater(cache); }).catch(() => {});
      }, 4000);
      return cache;
    })();
    return opened;
  }
  const readCount = () => { try { const c = JSON.parse(localStorage.getItem(COUNT_KEY)); return c && Number.isFinite(c.n) && Number.isFinite(c.at) ? c : null; } catch (_) { return null; } };
  const writeCount = (n, at) => { try { localStorage.setItem(COUNT_KEY, JSON.stringify({n: Math.max(0, n), at})); } catch (_) {} };
  const addCount = d => { const c = readCount(); if (c) writeCount(c.n + d, c.at); return c ? c.n + d : null; };
  // count (and clean up) when the cache has not been used for IDLE_MS — never in the middle of a tap
  function countLater(cache) {
    if (countTimer) return;
    const check = () => {
      if (clock() - lastUse < IDLE_MS) { countTimer = setTimeout(check, IDLE_MS); return; }
      trim(cache).catch(() => {}).finally(() => { countTimer = null; });
    };
    countTimer = setTimeout(check, IDLE_MS);
  }
  async function trim(cache) {
    const counted = clock();
    const keys = await cache.keys();                    // in the order the entries were added
    note(stats.keys, {at: Math.round(counted), ms: Math.round(clock() - counted), n: keys.length}, 100);
    const over = keys.length > limit() ? keys.length - Math.floor(limit() * KEEP) : 0;   // down to 90 %: the next clean-up is far
    if (over <= 0) { writeCount(keys.length, Date.now()); return; }
    // what may go, the oldest first: parts, and a copy of another file in an earlier version than its latest one (the
    // latest by version, not by order: an old page in another tab may store an old version after the new one; review 07.11)
    const rows = keys.map(key => { try { const url = new URL(key.url);
      return {key, path: url.pathname, version: url.searchParams.get("v") || "", part: /\/\d+\.json$/.test(url.pathname)}; }
      catch (_) { return {key, path: "", version: "", part: false}; } });
    const latest = new Map();
    for (const row of rows) if (!row.part && !(latest.get(row.path) > row.version)) latest.set(row.path, row.version);
    const removable = rows.filter(row => row.part || row.version !== latest.get(row.path));
    let removed = 0;
    for (let i = 0; i < Math.min(over, removable.length); i++) if (await cache.delete(removable[i].key)) removed++;
    writeCount(keys.length - removed, Date.now());
  }
  const versionOf = url => url.searchParams.get("v") || "";
  async function store(cache, url, copy) {
    if (replacedOnUpdate.test(pathOf(url))) {        // one copy per file of our own dictionaries
      const same = await cache.keys(url.origin + url.pathname, {ignoreSearch: true});
      if (same.some(key => versionOf(new URL(key.url)) > versionOf(url))) return;      // a later version is kept: not stored
      await cache.put(url.href, copy);
      let gone = 0;
      for (const key of same) if (versionOf(new URL(key.url)) < versionOf(url) && await cache.delete(key)) gone++;
      if (same.some(key => key.url === url.href)) gone++;   // (the same address again: no new entry)
      addCount(1 - gone);
    } else { await cache.put(url.href, copy); addCount(1); }
    const c = readCount();
    if (!c || c.n > limit()) countLater(cache);
  }
  // Counters (speed chat 07.11, read by autoread.html; they change nothing): long taps on the iPhone had ~1.4–1.6 s that
  // were neither network nor page work — about WAIT_MS. Every cache step slower than 200 ms is noted with its time on this
  // page's clock (performance.now, as Resource Timing): opening the cache, looking a file up, reading a kept copy, and
  // each count of the entries (keys() in trim) with its length.
  const SLOW_MS = 200, stats = {stalled: 0, slow: [], keys: []};
  const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const note = (list, row, max) => { list.push(row); if (list.length > max) list.shift(); };
  const timed = async (kind, pending) => { const t = clock(); try { return await pending; }
    finally { const ms = clock() - t; if (ms > SLOW_MS) note(stats.slow, {kind, at: Math.round(t), ms: Math.round(ms)}, 300); } };
  const STALLED = Symbol("stalled");
  const within = (pending, ms) => { let timer = null;
    return Promise.race([pending, new Promise(resolve => { timer = setTimeout(() => resolve(STALLED), ms); })]).finally(() => clearTimeout(timer)); };
  async function cachedFetch(input, options) {
    let url = null;
    lastUse = clock();
    if (!site || Date.now() < pausedUntil || isRequest(input)) return fetch(input, options);
    try { url = new URL(String(input), location.href); } catch (_) { url = null; }
    if (!url || !cacheable(url, options)) return fetch(input, options);
    let cache = null;
    try {                                               // a broken or stalled cache (quota, private mode) only means: ask the network
      const store_ = await timed("open", within(open(), OPEN_WAIT_MS));
      const kept = store_ === STALLED ? STALLED : await timed("match", within(store_.match(url.href, {ignoreVary: true}), WAIT_MS));   // the version in the address is the identity
      if (kept === STALLED) { pausedUntil = Date.now() + PAUSE_MS; cache = null; stats.stalled++; }
      else {
        cache = store_;
        if (kept) {
          // a stored copy that cannot be read (a write cut off when the app was killed) is dropped and asked again
          try { const body = await timed("read", kept.arrayBuffer()); return new Response(body, {status: kept.status, statusText: kept.statusText, headers: kept.headers}); }
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
  host.BibliothekDataCache = Object.freeze({fetch: cachedFetch, enabled: !!site, stats});
})();
