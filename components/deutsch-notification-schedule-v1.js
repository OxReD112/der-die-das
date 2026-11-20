/* Deutsch · which sentence a notification brings, and when — v1 (20.11.2026)
   The one place of the notification rule. Before 20.11 it lived only inside the notification server
   (notification-server/src/index.js). Now the server takes it from here, and the native app runs this very file
   (JavaScriptCore) to lay out the notifications on the phone itself, 14 days ahead — so the site and the app
   cannot drift apart. Rules only: no network, no storage, no page.

     DeutschNotificationSchedule.SLOTS            → ["09:30", "12:30", "18:00", "20:00"] (Berlin time on the server,
                                                    the phone's clock in the app)
     DeutschNotificationSchedule.LOOKBACK         → 30: how many earlier lists are looked at when today's is missing
     DeutschNotificationSchedule.slotIndex(time)  → 0…3 for "HH:MM", or -1 when it is not a notification time
     DeutschNotificationSchedule.dayNumber(date)  → days since 1970-01-01 for "YYYY-MM-DD"
     DeutschNotificationSchedule.parsePool(stored)→ the sentences of one stored list (a JSON string or the object
                                                    { date, notifications }), or null when it is empty / unreadable
     DeutschNotificationSchedule.earlierDates(dates, date)
                                                  → the dates (YYYY-MM-DD) before `date`, newest first, at most
                                                    LOOKBACK of them — the order the lists are tried in
     DeutschNotificationSchedule.pick(pool, slotIndex, date, fallbackFrom)
                                                  → the sentence of this slot: today's list one sentence per slot;
                                                    an older list (fallbackFrom = its date) shifted by one sentence
                                                    per day, so the same slot does not repeat the same sentence daily
     DeutschNotificationSchedule.pickNotification(pools, date, slotIndex, doneDate)
                                                  → { de, ru, fromDate } or null — the whole rule in one call (for
                                                    the app): pools = [{ date, notifications }] (any order);
                                                    null when doneDate === date (today's Wortschatz is done), when
                                                    slotIndex is not 0…3, or when there is no usable list.
                                                    fromDate = the date of the list used (== date for today's).

   The rule (unchanged from the server, 20.11):
     1. done today → nothing;
     2. today's list, if it has sentences;
     3. otherwise the newest earlier list with sentences, among the LOOKBACK newest earlier dates (a later list —
        never);
     4. the sentence: pool[(slotIndex + shift) % pool.length], shift = dayNumber(date) for an older list, 0 for
        today's.
   A sentence is { de, ru } on the server (the page sends sentence → de, translation → ru); the site's own list
   (localStorage deutschNotificationPoolV1) keeps { sentence, translation } — pickNotification reads both. */
(function (root) {
  "use strict";

  const SLOTS = Object.freeze(["09:30", "12:30", "18:00", "20:00"]);
  const LOOKBACK = 30;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;

  const slotIndex = time => SLOTS.indexOf(time);

  // Days since 1970-01-01 for a "YYYY-MM-DD" date.
  const dayNumber = date => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);

  function parsePool(stored) {
    if (!stored) return null;
    try {
      const state = typeof stored === "string" ? JSON.parse(stored) : stored;
      const pool = Array.isArray(state.notifications) ? state.notifications : [];
      return pool.length ? pool : null;
    } catch (e) {
      return null;
    }
  }

  // Dates ending a key are YYYY-MM-DD, so a plain sort is a date sort.
  const earlierDates = (dates, date) =>
    dates
      .filter(d => DATE.test(d) && d < date)
      .sort()
      .reverse()
      .slice(0, LOOKBACK);

  function pick(pool, index, date, fallbackFrom) {
    const shift = fallbackFrom ? dayNumber(date) : 0;
    return pool[(index + shift) % pool.length];
  }

  function pickNotification(pools, date, index, doneDate) {
    if (doneDate === date) return null;
    if (!(index >= 0 && index < SLOTS.length)) return null;
    const byDate = new Map();
    for (const p of Array.isArray(pools) ? pools : []) {
      if (p && typeof p.date === "string" && !byDate.has(p.date)) byDate.set(p.date, p);
    }
    let pool = parsePool(byDate.get(date));
    let fallbackFrom = null;
    if (!pool) {
      for (const d of earlierDates([...byDate.keys()], date)) {
        pool = parsePool(byDate.get(d));
        if (pool) { fallbackFrom = d; break; }
      }
    }
    if (!pool) return null;
    const item = pick(pool, index, date, fallbackFrom) || {};
    return {
      de: String(item.de ?? item.sentence ?? ""),
      ru: String(item.ru ?? item.translation ?? ""),
      fromDate: fallbackFrom || date
    };
  }

  root.DeutschNotificationSchedule = Object.freeze({
    SLOTS, LOOKBACK, slotIndex, dayNumber, parsePool, earlierDates, pick, pickNotification
  });
})(typeof window !== "undefined" ? window : globalThis);
