import webpush from "web-push";

const MAX_NOTIFICATIONS = 4;
const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";
const PUSH_SUBSCRIPTION_KEY = "push_subscription";
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

async function sendPush(env, notification) {
  const stored = await env.GERMAN_NOTIFICATION_STATE.get(
    PUSH_SUBSCRIPTION_KEY
  );

  if (!stored) {
    console.log("[PUSH] No subscription stored.");
    return { ok: false, reason: "no-subscription" };
  }

  const subscription = JSON.parse(stored);

  configureVapid(env);

  const payload = JSON.stringify({
    title: "Deutsch",
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

    // 404/410 means the browser subscription is no longer valid.
    if (statusCode === 404 || statusCode === 410) {
      await env.GERMAN_NOTIFICATION_STATE.delete(
        PUSH_SUBSCRIPTION_KEY
      );
      console.log("[PUSH] Removed expired subscription.");
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
      const stored = await env.GERMAN_NOTIFICATION_STATE.get(
        NOTIFICATIONS_ENABLED_KEY
      );

      return jsonResponse({
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
        const subscription = await request.json();

        if (
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
          PUSH_SUBSCRIPTION_KEY,
          JSON.stringify(subscription)
        );

        console.log("[PUSH] Subscription saved.");

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
      await env.GERMAN_NOTIFICATION_STATE.delete(
        PUSH_SUBSCRIPTION_KEY
      );

      return jsonResponse({
        ok: true,
        subscribed: false,
      });
    }

    // STOP: disable scheduled notifications.
    // The notification pool and push subscription are kept.
    if (request.method === "POST" && url.pathname === "/stop") {
      await env.GERMAN_NOTIFICATION_STATE.put(
        NOTIFICATIONS_ENABLED_KEY,
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
      await env.GERMAN_NOTIFICATION_STATE.put(
        NOTIFICATIONS_ENABLED_KEY,
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
      const date = url.searchParams.get("date");

      if (!date) {
        return jsonResponse(
          { error: "date is required" },
          400
        );
      }

      const stored = await env.GERMAN_NOTIFICATION_STATE.get(
        `done:${date}`
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
      const stored = await env.GERMAN_NOTIFICATION_STATE.get(
        "notification_pool"
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
        const { date, notifications } = body;

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

        await env.GERMAN_NOTIFICATION_STATE.put(
          "notification_pool",
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
        const { date } = body;

        if (typeof date !== "string" || !date) {
          return jsonResponse(
            { error: "date is required" },
            400
          );
        }

        await env.GERMAN_NOTIFICATION_STATE.put(
          `done:${date}`,
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

    // Notifications are OFF by default.
    const enabled = await env.GERMAN_NOTIFICATION_STATE.get(
      NOTIFICATIONS_ENABLED_KEY
    );

    if (enabled !== "1") {
      console.log(
        `[CRON] ${date} ${time} — notifications are OFF. Nothing to send.`
      );
      return;
    }

    // DONE stops all remaining notifications for the day.
    const done = await env.GERMAN_NOTIFICATION_STATE.get(
      `done:${date}`
    );

    if (done) {
      console.log(
        `[CRON] ${date} ${time} — DONE already received. Nothing to send.`
      );
      return;
    }

    const storedPool = await env.GERMAN_NOTIFICATION_STATE.get(
      "notification_pool"
    );

    if (!storedPool) {
      console.log(
        `[CRON] ${date} ${time} — no notification pool found.`
      );
      return;
    }

    const poolState = JSON.parse(storedPool);
    const pool = Array.isArray(poolState.notifications)
      ? poolState.notifications
      : [];

    if (pool.length === 0) {
      console.log(
        `[CRON] ${date} ${time} — notification pool is empty.`
      );
      return;
    }

    const slotIndex = slots.indexOf(time);
    const notification = pool[slotIndex % pool.length];

    // Do not block the scheduled handler longer than necessary.
    ctx.waitUntil(
      sendPush(env, notification).then(result => {
        console.log(
          `[CRON] ${date} ${time} — push result:`,
          JSON.stringify(result)
        );
      })
    );
  },
};
