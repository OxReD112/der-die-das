import webpush from "web-push";

const MAX_NOTIFICATIONS = 4;
const NOTIFICATIONS_ENABLED_PREFIX = "enabled:";
const PUSH_SUBSCRIPTION_PREFIX = "subscription:";

function getIdentity(bodyOrUrl) {
  const explicitUserId =
    bodyOrUrl?.userId ||
    bodyOrUrl?.searchParams?.get?.("userId") ||
    null;

  const deviceId =
    bodyOrUrl?.deviceId ||
    bodyOrUrl?.searchParams?.get?.("deviceId") ||
    null;

  // Until Home is updated to send a separate userId, deviceId acts as
  // the user's current identity. This keeps the current app compatible.
  const userId = explicitUserId || deviceId;

  if (
    typeof userId !== "string" ||
    !userId ||
    typeof deviceId !== "string" ||
    !deviceId
  ) {
    return null;
  }

  return { userId, deviceId };
}

async function registerUser(env, userId) {
  const key = "users:index";
  const stored = await env.GERMAN_NOTIFICATION_STATE.get(key);
  const users = stored ? JSON.parse(stored) : [];

  if (!users.includes(userId)) {
    users.push(userId);
    await env.GERMAN_NOTIFICATION_STATE.put(key, JSON.stringify(users));
  }
}

// Remove anonymous user IDs from the Cron index in ONE write.
// A user who calls /subscribe, /go, /pool or /done again is re-added
// automatically by registerUser().
async function unregisterUsers(env, userIds) {
  if (!userIds.length) return;

  const key = "users:index";
  const stored = await env.GERMAN_NOTIFICATION_STATE.get(key);
  const users = stored ? JSON.parse(stored) : [];
  const remaining = users.filter(id => !userIds.includes(id));

  if (remaining.length !== users.length) {
    await env.GERMAN_NOTIFICATION_STATE.put(key, JSON.stringify(remaining));
  }
}

// Delete every stored key of a user whose devices are all gone.
async function deleteUserData(env, userId) {
  const kv = env.GERMAN_NOTIFICATION_STATE;

  for (const prefix of [`pool:${userId}:`, `done:${userId}:`]) {
    const listed = await kv.list({ prefix });
    for (const key of listed.keys) {
      await kv.delete(key.name);
    }
  }

  await kv.delete(enabledKey(userId));
}

function enabledKey(userId) {
  return `${NOTIFICATIONS_ENABLED_PREFIX}${userId}`;
}

function subscriptionKey(userId, deviceId) {
  return `${PUSH_SUBSCRIPTION_PREFIX}${userId}:${deviceId}`;
}
const VAPID_SUBJECT =
  "https://german-learning-notifications.d45zgw2cgh.workers.dev";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function configureVapid(env) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

async function sendPush(env, notification, userId, deviceId) {
  const stored = await env.GERMAN_NOTIFICATION_STATE.get(
    subscriptionKey(userId, deviceId)
  );

  if (!stored) {
    console.log("[PUSH] No subscription stored.");
    return { ok: false, reason: "no-subscription" };
  }

  const subscription = JSON.parse(stored);

  configureVapid(env);

  const payload = JSON.stringify({
    title: "Hallo",
    body: `${notification.de}\n${notification.ru}`,
    icon: "/icon.png",
    badge: "/icon.png",
    tag: "german-learning-notification",
    url: "/",
  });

  try {
    await webpush.sendNotification(subscription, payload);

    console.log("[PUSH] Notification sent successfully.");
    return { ok: true };
  } catch (error) {
    const statusCode = error?.statusCode || 0;

    console.error(
      "[PUSH] Send failed:",
      statusCode,
      error?.message || error
    );

    // 404/410 means the browser subscription is no longer valid
    // (for example: the Home Screen app was deleted and reinstalled).
    if (statusCode === 404 || statusCode === 410) {
      await env.GERMAN_NOTIFICATION_STATE.delete(
        subscriptionKey(userId, deviceId)
      );
      console.log("[PUSH] Removed expired subscription.");

      return {
        ok: false,
        reason: "expired",
        statusCode,
        expired: true,
      };
    }

    return {
      ok: false,
      reason: "send-failed",
      statusCode,
    };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Health check
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        "German Learning notification server is alive.",
        { headers: CORS_HEADERS }
      );
    }

    // Read current notification state
    if (request.method === "GET" && url.pathname === "/status") {
      const identity = getIdentity(url);

      if (!identity) {
        return jsonResponse(
          { error: "userId and deviceId are required" },
          400
        );
      }

      const stored = await env.GERMAN_NOTIFICATION_STATE.get(
        enabledKey(identity.userId)
      );

      return jsonResponse({
        userId: identity.userId,
        deviceId: identity.deviceId,
        enabled: stored === "1",
      });
    }

    // Return the public VAPID key for browser subscription.
    if (request.method === "GET" && url.pathname === "/push-config") {
      if (!env.VAPID_PUBLIC_KEY) {
        return jsonResponse(
          { error: "VAPID public key is not configured" },
          500
        );
      }

      return jsonResponse({
        publicKey: env.VAPID_PUBLIC_KEY,
      });
    }

    // Save the iPhone Web Push subscription.
    if (request.method === "POST" && url.pathname === "/subscribe") {
      try {
        const body = await request.json();
        const { userId, deviceId, subscription } = body;

        if (
          typeof userId !== "string" ||
          !userId ||
          typeof deviceId !== "string" ||
          !deviceId ||
          !subscription ||
          typeof subscription.endpoint !== "string" ||
          !subscription.keys ||
          typeof subscription.keys.p256dh !== "string" ||
          typeof subscription.keys.auth !== "string"
        ) {
          return jsonResponse(
            { error: "Invalid push subscription" },
            400
          );
        }

        await env.GERMAN_NOTIFICATION_STATE.put(
          subscriptionKey(userId, deviceId),
          JSON.stringify(subscription)
        );

        await registerUser(env, userId);

        console.log(
          `[PUSH] Subscription saved for user ${userId}, device ${deviceId}.`
        );

        return jsonResponse({
          ok: true,
          subscribed: true,
        });
      } catch (error) {
        console.error("Subscribe error:", error);

        return jsonResponse(
          { error: "Invalid request" },
          400
        );
      }
    }

    // Remove the stored push subscription.
    if (
      request.method === "POST" &&
      url.pathname === "/unsubscribe"
    ) {
      try {
        const body = await request.json();
        const identity = getIdentity(body);

        if (!identity) {
          return jsonResponse(
            { error: "userId and deviceId are required" },
            400
          );
        }

        await env.GERMAN_NOTIFICATION_STATE.delete(
          subscriptionKey(identity.userId, identity.deviceId)
        );

        return jsonResponse({
          ok: true,
          subscribed: false,
        });
      } catch (error) {
        console.error("Unsubscribe error:", error);

        return jsonResponse(
          { error: "Invalid request" },
          400
        );
      }
    }

    // STOP: disable scheduled notifications.
    // The notification pool and push subscription are kept.
    if (request.method === "POST" && url.pathname === "/stop") {
      const body = await request.json();
      const identity = getIdentity(body);

      if (!identity) {
        return jsonResponse(
          { error: "userId and deviceId are required" },
          400
        );
      }

      await registerUser(env, identity.userId);

      await env.GERMAN_NOTIFICATION_STATE.put(
        enabledKey(identity.userId),
        "0"
      );

      console.log(
        "[NOTIFICATIONS] STOP — scheduled notifications disabled."
      );

      return jsonResponse({
        ok: true,
        enabled: false,
      });
    }

    // GO: enable scheduled notifications.
    if (request.method === "POST" && url.pathname === "/go") {
      const body = await request.json();
      const identity = getIdentity(body);

      if (!identity) {
        return jsonResponse(
          { error: "userId and deviceId are required" },
          400
        );
      }

      await registerUser(env, identity.userId);

      await env.GERMAN_NOTIFICATION_STATE.put(
        enabledKey(identity.userId),
        "1"
      );

      console.log(
        "[NOTIFICATIONS] GO — scheduled notifications enabled."
      );

      return jsonResponse({
        ok: true,
        enabled: true,
      });
    }

    // Read DONE status
    if (request.method === "GET" && url.pathname === "/done") {
      const identity = getIdentity(url);
      const date = url.searchParams.get("date");

      if (!identity) {
        return jsonResponse(
          { error: "userId and deviceId are required" },
          400
        );
      }

      if (!date) {
        return jsonResponse(
          { error: "date is required" },
          400
        );
      }

      const stored = await env.GERMAN_NOTIFICATION_STATE.get(
        `done:${identity.userId}:${date}`
      );

      if (!stored) {
        return jsonResponse({
          date,
          done: false,
        });
      }

      return new Response(stored, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // Read notification pool
    if (request.method === "GET" && url.pathname === "/pool") {
      const identity = getIdentity(url);

      if (!identity) {
        return jsonResponse(
          { error: "userId and deviceId are required" },
          400
        );
      }

      const date = url.searchParams.get("date");

      if (!date) {
        return jsonResponse(
          { error: "date is required" },
          400
        );
      }

      const stored = await env.GERMAN_NOTIFICATION_STATE.get(
        `pool:${identity.userId}:${date}`
      );

      if (!stored) {
        return jsonResponse(
          { error: "No notification pool found" },
          404
        );
      }

      return new Response(stored, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // Save notification pool
    if (request.method === "POST" && url.pathname === "/pool") {
      try {
        const body = await request.json();
        const { date, notifications, userId, deviceId } = body;

        if (
          typeof userId !== "string" ||
          !userId ||
          typeof deviceId !== "string" ||
          !deviceId
        ) {
          return jsonResponse(
            { error: "userId and deviceId are required" },
            400
          );
        }

        if (typeof date !== "string" || !date) {
          return jsonResponse(
            { error: "date is required" },
            400
          );
        }

        if (!Array.isArray(notifications)) {
          return jsonResponse(
            { error: "notifications must be an array" },
            400
          );
        }

        const pool = notifications
          .slice(0, MAX_NOTIFICATIONS)
          .filter(
            item =>
              item &&
              typeof item.de === "string" &&
              typeof item.ru === "string"
          );

        const state = {
          date,
          notifications: pool,
          updatedAt: new Date().toISOString(),
        };

        await registerUser(env, userId);

        await env.GERMAN_NOTIFICATION_STATE.put(
          `pool:${userId}:${date}`,
          JSON.stringify(state)
        );

        return jsonResponse({
          ok: true,
          date,
          count: pool.length,
        });
      } catch (error) {
        console.error("Pool error:", error);

        return jsonResponse(
          { error: "Invalid request" },
          400
        );
      }
    }

    // Mark today's learning as done
    if (request.method === "POST" && url.pathname === "/done") {
      try {
        const body = await request.json();
        const { date, userId, deviceId } = body;

        if (
          typeof userId !== "string" ||
          !userId ||
          typeof deviceId !== "string" ||
          !deviceId
        ) {
          return jsonResponse(
            { error: "userId and deviceId are required" },
            400
          );
        }

        if (typeof date !== "string" || !date) {
          return jsonResponse(
            { error: "date is required" },
            400
          );
        }

        await registerUser(env, userId);

        await env.GERMAN_NOTIFICATION_STATE.put(
          `done:${userId}:${date}`,
          JSON.stringify({
            date,
            done: true,
            updatedAt: new Date().toISOString(),
          })
        );

        return jsonResponse({
          ok: true,
          date,
          done: true,
        });
      } catch (error) {
        console.error("DONE error:", error);

        return jsonResponse(
          { error: "Invalid request" },
          400
        );
      }
    }

    return new Response("Not found", {
      status: 404,
      headers: CORS_HEADERS,
    });
  },

  async scheduled(controller, env, ctx) {
    const now = new Date(controller.scheduledTime);

    const berlinParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const parts = Object.fromEntries(
      berlinParts.map(({ type, value }) => [type, value])
    );

    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;

    const slots = ["09:30", "12:30", "18:00", "20:00"];

    if (!slots.includes(time)) {
      console.log(
        `[CRON] ${date} ${time} — not a notification slot`
      );
      return;
    }

    console.log(
      `[CRON] Checking notification slot: ${date} ${time}`
    );

    // Each user is independent. The index contains only anonymous IDs.
    const storedUsers = await env.GERMAN_NOTIFICATION_STATE.get("users:index");
    const users = storedUsers ? JSON.parse(storedUsers) : [];

    if (!Array.isArray(users) || users.length === 0) {
      console.log(`[CRON] ${date} ${time} — no registered users.`);
      return;
    }

    const slotIndex = slots.indexOf(time);

    // Users whose devices are gone. Removed from the index after the loop,
    // in one write, so parallel updates cannot overwrite each other.
    const deadUsers = [];
    const expiredUsers = [];

    for (const userId of users) {
      const enabled = await env.GERMAN_NOTIFICATION_STATE.get(
        enabledKey(userId)
      );

      if (enabled !== "1") {
        continue;
      }

      const subscriptionPrefix = `${PUSH_SUBSCRIPTION_PREFIX}${userId}:`;
      const subscriptionKeys = await env.GERMAN_NOTIFICATION_STATE.list({
        prefix: subscriptionPrefix,
      });

      // Enabled, but no device left (e.g. an old ID after a reinstall).
      // Only the index entry is removed; any later app call re-adds it.
      if (subscriptionKeys.keys.length === 0) {
        console.log(`[CRON] User ${userId} has no devices — removed from index.`);
        deadUsers.push(userId);
        continue;
      }

      const done = await env.GERMAN_NOTIFICATION_STATE.get(
        `done:${userId}:${date}`
      );

      if (done) {
        continue;
      }

      const storedPool = await env.GERMAN_NOTIFICATION_STATE.get(
        `pool:${userId}:${date}`
      );

      if (!storedPool) {
        continue;
      }

      let poolState;
      try {
        poolState = JSON.parse(storedPool);
      } catch {
        console.error(`[CRON] Invalid pool for user ${userId}.`);
        continue;
      }

      const pool = Array.isArray(poolState.notifications)
        ? poolState.notifications
        : [];

      if (pool.length === 0) {
        continue;
      }

      const notification = pool[slotIndex % pool.length];

      // The same notification goes to every registered device of this user.
      const results = await Promise.all(
        subscriptionKeys.keys.map(key => {
          const deviceId = key.name.slice(subscriptionPrefix.length);

          return sendPush(env, notification, userId, deviceId).then(result => {
            console.log(
              `[CRON] ${date} ${time} — user ${userId}, device ${deviceId}:`,
              JSON.stringify(result)
            );
            return result;
          });
        })
      );

      // Every device of this user rejected the push as expired:
      // the user is gone, so remove all of their stored data.
      if (results.every(result => result.expired)) {
        console.log(`[CRON] All devices of user ${userId} expired — user removed.`);
        expiredUsers.push(userId);
      }
    }

    for (const userId of expiredUsers) {
      await deleteUserData(env, userId);
    }

    await unregisterUsers(env, [...deadUsers, ...expiredUsers]);
  },
};
