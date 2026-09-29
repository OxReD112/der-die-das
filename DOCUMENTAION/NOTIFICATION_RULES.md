# German Learning App --- Notification System Rules

**Status:** Agreed specification / implementation target\
**Scope:** Wortschatz daily-learning notifications\
**Purpose:** Preserve the agreed notification behavior so it is not lost
between development sessions.

------------------------------------------------------------------------

## 1. Notification schedule

Notifications use a fixed daily schedule:

-   **09:30**
-   **12:30**
-   **18:00**
-   **20:00**

The schedule is fixed and does not depend on when the user opens the
app.

If a scheduled notification time has already passed when the user opens
the app, that notification is **not sent later**. Missed notifications
are not "caught up".

------------------------------------------------------------------------

## 2. When notifications are sent

At each scheduled time, the system checks whether today's Wortschatz
task has been completed.

-   If today's task is **not completed**, send the next notification
    from the current notification pool.
-   If today's task **is completed**, send nothing.

Once `DONE` has been received for the current day, all remaining
notifications for that day are stopped.

Example:

``` text
09:30  notification
12:30  notification
14:30  DONE
18:00  nothing
20:00  nothing
```

------------------------------------------------------------------------

## 3. Notification pool

The app prepares a pool of German sentence + translation pairs.

The pool is ordered. Notifications must use the entries **in exactly the
order in which they were prepared**.

The pool has a hard maximum of **4 entries**.

### If there are 4 or more available sentences

Only the first four are stored:

``` text
1 → 2 → 3 → 4
```

Additional sentences are not included in the notification pool.

### If there are fewer than 4 sentences

All available sentences are stored.

If there are fewer entries than the four daily notification slots, the
pool repeats from the beginning.

Example with 2 entries:

``` text
09:30  #1
12:30  #2
18:00  #1
20:00  #2
```

Example with 1 entry:

``` text
09:30  #1
12:30  #1
18:00  #1
20:00  #1
```

If there are **0 entries**, no notification is sent.

------------------------------------------------------------------------

## 4. Notification content

Each notification contains:

-   the German sentence;
-   its Russian translation.

The desired notification should use the application's own vocabulary
content rather than generic reminder text.

The app icon should be used as the notification/app identity when the
push system is implemented.

------------------------------------------------------------------------

## 5. Data sent to the server

The system should minimize transmitted information.

The notification pool sends only:

``` text
date
notifications
```

`notifications` contains the prepared sentence + Russian translation
pairs.

The server does **not** need the user's:

-   complete vocabulary list;
-   complete SRS state;
-   learning history;
-   full statistics;
-   complete application data.

------------------------------------------------------------------------

## 6. DONE event

Completion is sent as a separate event.

Conceptually:

``` text
DONE
```

with the current date and completion information needed by the server.

The purpose is simply to tell the notification system that today's
learning task is finished.

After `DONE` is received for the current day:

-   no further notifications are sent that day;
-   the current day's notification cycle is considered finished.

------------------------------------------------------------------------

## 7. Continuing an existing pool

If today's words were not completed and no new notification pool has
been prepared, the system continues using the **existing/current
notification pool**.

A new pool replaces the previous/current pool when the app prepares and
sends a new pool.

The notification system therefore does not require a new pool to be
generated every single day.

------------------------------------------------------------------------

## 8. Opening the app during the day

Opening the app does not reset the notification schedule.

Example:

``` text
09:30  notification sent
12:30  notification sent
15:00  user opens the app
18:00  notification sent if not DONE
20:00  notification sent if not DONE
```

If the user opens the app for the first time at 15:00, the earlier 09:30
and 12:30 notifications are not sent retroactively.

------------------------------------------------------------------------

## 9. Completing after the final notification

If the user completes today's words after the 20:00 notification, the
system simply:

1.  records `DONE` for today;
2.  prepares/sends the notification pool for the next day.

No additional notification is sent for the finished day.

Example:

``` text
20:00  final scheduled notification
20:30  DONE
      ↓
prepare next day's pool
      ↓
nothing else today
```

------------------------------------------------------------------------

# Notification On / Off Control

## 10. Home screen toggle

The Home screen will contain a small notification toggle.

The visual design should resemble an Apple-style switch:

### ON

-   green;
-   switch knob on the right.

### OFF

-   very dark / black;
-   switch knob on the left;
-   visually subtle against the dark application interface.

There should be no large notification settings panel. The control should
remain small and unobtrusive.

------------------------------------------------------------------------

## 11. Turning notifications OFF

When the user switches notifications from **ON → OFF**:

1.  the local notification setting is saved as OFF;
2.  the app sends a `STOP` state/event to the notification server;
3.  the server stops all notification activity for the user.

While notifications are OFF:

-   no scheduled push notifications are sent;
-   `DONE` status does not cause notifications;
-   the existing notification pool is **not deleted**;
-   the server remains inactive until notifications are enabled again.

Conceptually:

``` text
Notifications ON
      ↓
user switches OFF
      ↓
STOP
      ↓
server inactive
```

------------------------------------------------------------------------

## 12. Turning notifications ON

When the user switches notifications from **OFF → ON**:

1.  the local notification setting is saved as ON;
2.  the app sends a `GO` state/event to the notification server;
3.  the server resumes notification activity.

The existing/current notification pool is reused. The user does not need
to create a new pool merely because notifications were disabled.

Conceptually:

``` text
Notifications OFF
      ↓
user switches ON
      ↓
GO
      ↓
server active again
```

------------------------------------------------------------------------

## 13. No catch-up after OFF period

If notifications are disabled for part of the day, missed notifications
are **not sent retroactively** after notifications are enabled again.

Example:

``` text
09:30  notification sent
11:00  notifications OFF
12:30  skipped
17:00  notifications ON
18:00  notification may be sent
20:00  notification may be sent
```

There is no catch-up for the missed 12:30 notification.

------------------------------------------------------------------------

## 14. Conceptual server state

The notification server should effectively have an active/inactive
state:

``` text
ON
 ↓
scheduled notification checks
 ↓
DONE? ── yes → stop for today
   │
   no
   ↓
send next notification
```

When the user disables notifications:

``` text
ON
 ↓
STOP
 ↓
OFF
```

When the user enables them again:

``` text
OFF
 ↓
GO
 ↓
ON
```

------------------------------------------------------------------------

## 15. Privacy / data minimization principle

The notification system should share the minimum information necessary
to perform its job.

The server should not receive the user's complete learning database.

The intended server-side information is limited to:

-   current notification pool (`date` + `notifications`);
-   daily completion (`DONE`);
-   notification enabled/disabled state (`STOP` / `GO`);
-   the push subscription information required by the push mechanism.

------------------------------------------------------------------------

## 16. Current implementation status

The following behavior has been locally prototyped:

-   preparation of a notification pool;
-   maximum pool size of 4;
-   German sentence + Russian translation stored in the pool;
-   local `DONE` event prototype;
-   local notification pool storage.

The actual remote server, scheduled push delivery, and Home ON/OFF
toggle are **not yet implemented**.

This document describes the agreed target behavior. It should be updated
when an implementation decision is deliberately changed.
