/* Deutsch · calendar day keys — v1 (2026-09-27)
   The one place Home turns a date into the "YYYY-MM-DD" key that daily stats, snapshots and the
   Wortschatz tile compare against. Local time, computed at noon so daylight-saving changes can
   never shift the day.
     DeutschDay.key()        → today, e.g. "2026-09-27"
     DeutschDay.key(21)      → 21 days ago
     DeutschDay.add(k, n)    → key n days after key k (n may be negative) */
(function () {
  "use strict";

  const pad = n => String(n).padStart(2, "0");
  const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function key(daysBack = 0) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - daysBack);
    return format(d);
  }

  function add(dayKey, n) {
    const [y, m, d] = dayKey.split("-").map(Number);
    const t = new Date(y, m - 1, d, 12);
    t.setDate(t.getDate() + n);
    return format(t);
  }

  window.DeutschDay = Object.freeze({ key, add });
})();
