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
 */
(() => {
  "use strict";
  const GENERATION = "bibliothek-data-1";   // a new value drops the whole old cache (at the first page that sees it)
  const MAX_ENTRIES = 8000;                 // ~31 MB of parts (32768 parts since 07.11, ~3.9 KB each) + ~12 MB of our own dictionaries; the oldest parts go first
  const TRIM_EVERY = 50;                    // count the entries after this many new files
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
    const over = keys.length - limit();
    if (over <= 0) return;
    // what may go, the oldest first: parts, and a copy of another file in an earlier version than its latest one (the
    // latest by version, not by order: an old page in another tab may store an old version after the new one; review 07.11)
    const rows = keys.map(key => { try { const url = new URL(key.url);
      return {key, path: url.pathname, version: url.searchParams.get("v") || "", part: /\/\d+\.json$/.test(url.pathname)}; }
      catch (_) { return {key, path: "", version: "", part: false}; } });
    const latest = new Map();
    for (const row of rows) if (!row.part && !(latest.get(row.path) > row.version)) latest.set(row.path, row.version);
    const removable = rows.filter(row => row.part || row.version !== latest.get(row.path));
    for (let i = 0; i < Math.min(over, removable.length); i++) await cache.delete(removable[i].key);
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
  // Spare request (speed chat 07.11, a trial: off unless bibliothek.html?hedge=1). On the iPhone, after a few seconds of
  // network silence, the second and later requests of a batch sometimes wait ~1 s before they are sent (Safari / iOS; the
  // first request of the batch goes at once; Documentation/QA/iPhone_Autoread_2026-11-07/). A part that has not answered
  // well past the usual time is asked once more; the first answer wins, the other request is cancelled. The threshold
  // follows the network (3 × the median of the last answers, at least 500 ms), at most 2 spare requests at a time, and an
  // error only when both fail — the same file either way. The spare goes past the browser's HTTP cache (Chromium holds a
  // second request for the same address until the first one has finished).
  let hedge = false;
  try { hedge = typeof location !== "undefined" && new URLSearchParams(location.search).get("hedge") === "1"; } catch (_) { hedge = false; }
  const HEDGE_MIN_MS = 500, HEDGE_FIRST_MS = 600, HEDGE_FACTOR = 3, HEDGE_MAX_SPARE = 2, HEDGE_SAMPLES = 20;
  const answered = [], stats = {enabled: hedge, spare: 0, spareWon: 0, firstWon: 0, bothFailed: 0, capped: 0};
  let spareInFlight = 0;
  // (the usual time: the answer time of the request that won, from its own start — a held first request that a spare had to
  // save does not raise it, a slow network does; review 07.11)
  const threshold = () => { if (!answered.length) return HEDGE_FIRST_MS;
    const sorted = [...answered].sort((a, b) => a - b); return Math.max(HEDGE_MIN_MS, HEDGE_FACTOR * sorted[sorted.length >> 1]); };
  const noteAnswer = ms => { answered.push(ms); if (answered.length > HEDGE_SAMPLES) answered.shift(); };
  function networkFetch(input, options, url) {
    if (!hedge || !/\/\d+\.json$/.test(url.pathname) || (options && options.signal) || typeof AbortController === "undefined") return fetch(input, options);
    const started = performance.now();
    return new Promise((resolve, reject) => {
      const first = new AbortController();
      let spare = null, spareStarted = 0, done = false, failed = 0, firstError = null, timer = null;
      const settle = (response, winner) => {
        if (done) return; done = true; clearTimeout(timer);
        (winner === first ? spare : first)?.abort();
        if (spare) { spareInFlight--; stats[winner === spare ? "spareWon" : "firstWon"]++; }
        noteAnswer(performance.now() - (winner === spare ? spareStarted : started));
        resolve(response);
      };
      const fail = (error, which) => {
        if (done) return;
        failed++; if (!firstError) firstError = error;
        if (which === first && !spare) { done = true; clearTimeout(timer); reject(error); return; }   // as before: no second request
        if (failed >= 2) { done = true; spareInFlight--; stats.bothFailed++; reject(firstError); }
      };
      fetch(input, {...(options || {}), signal: first.signal}).then(r => settle(r, first), e => fail(e, first));
      timer = setTimeout(() => {
        if (done) return;
        if (spareInFlight >= HEDGE_MAX_SPARE) { stats.capped++; return; }
        spare = new AbortController(); spareStarted = performance.now(); spareInFlight++; stats.spare++;
        // past the browser's own cache: a browser may hold a second request for an address until the first one is done
        fetch(input, {...(options || {}), cache: "no-store", signal: spare.signal}).then(r => settle(r, spare), e => fail(e, spare));
      }, threshold());
    });
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
    const response = await networkFetch(input, options, url);
    if (cache && response.status === 200 && response.type === "basic") {
      try { const copy = response.clone(); store(cache, url, copy).catch(() => {}); } catch (_) {}
    }
    return response;
  }
  // the first open (reading the list of entries) happens while the page loads, not at the first tap
  if (site) setTimeout(() => { open().catch(() => {}); }, 0);
  host.BibliothekDataCache = Object.freeze({fetch: cachedFetch, enabled: !!site, hedge: stats});
})();
