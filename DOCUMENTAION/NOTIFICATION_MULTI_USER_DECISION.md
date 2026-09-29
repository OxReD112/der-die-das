# NOTIFICATION_MULTI_USER_DECISION.md

# German Learning App — Notification Architecture Decision

## Status

Decision fixed on 19.09.2026.

This document records the agreed future architecture for notifications.

## Decision

The notification system must support multiple independent users/devices.

Each user must have their **own daily notification pool**.

The notification system must NOT use one global notification pool or one global DONE state for everyone.

## Required user isolation

Each user's notification state should be isolated and associated with a unique user/device identifier.

Conceptually:

```text
user/device ID
       ↓
user state
       ├── notification pool
       ├── DONE status
       ├── notifications enabled
       └── push subscription(s)
```

Example:

```text
User A
├── device/user ID
├── push subscription
├── today's pool
└── DONE status

User B
├── device/user ID
├── push subscription
├── today's pool
└── DONE status
```

## Required behavior

- User A receives User A's own vocabulary/sentence pool.
- User B receives User B's own vocabulary/sentence pool.
- User A marking today's learning as DONE must stop notifications **only for User A**.
- User B must continue receiving notifications according to User B's state.
- User A switching Notifications OFF must affect **only User A**.
- User B must not be affected by User A's ON/OFF state.
- One user's push subscription must never overwrite another user's subscription.
- Each user may have a different number of notification pool entries (within the existing maximum of 4).
- The architecture should allow one user to have multiple devices in the future (for example, iPhone + iPad), with those devices receiving the same user's notifications.

## Identity

A full account system with email/password is NOT required at this stage.

The system should use a lightweight unique user/device identifier and avoid unnecessary personal data.

## Current implementation implication

The current single-user prototype stores global values such as:

```text
notification_pool
done:<date>
notifications_enabled
push_subscription
```

These must be replaced/refactored before the final multi-user push implementation so that state is scoped to the appropriate user/device.

For example, conceptually:

```text
pool:<userId>:<date>
done:<userId>:<date>
enabled:<userId>
subscription:<userId>:<deviceId>
```

The exact key structure is an implementation detail and can be decided when the multi-user Worker is implemented.

## Important

This is an architectural decision, not yet a statement that the multi-user implementation is complete.

The existing GO/STOP, Cron, KV, and Web Push work can be reused, but the Worker should be refactored to use user-scoped state before treating the push system as final.
