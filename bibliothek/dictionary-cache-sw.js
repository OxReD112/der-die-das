// Data cache of the reader — the service worker is retired (07.11.2026).
//
// 26.10–06.11 this worker kept the versioned dictionary files on disk. On the iPhone Safari stops an idle worker and the
// next request waits ~1 s for it to start again, even for a file already on disk (autoread 06.11,
// Documentation/QA/iPhone_Autoread_2026-11-06/). Since 07.11 the page keeps the same cache itself (resolver/data-cache.js).
//
// This file stays published (some weeks at least): a phone that still has the old worker fetches this new version on its
// next visit; it activates at once, answers nothing, and removes its own registration. The cache «bibliothek-data-1» is
// kept — the page reads the same files from it. reader/bibliothek.js removes the registration too.
'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.registration.unregister()));
