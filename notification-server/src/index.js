const MAX_NOTIFICATIONS = 4;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("German Learning notification server is alive.");
    }

    // Mark today's learning as done
if (request.method === "POST" && url.pathname === "/done") {
  try {
    const body = await request.json();
    const { date } = body;

    if (typeof date !== "string" || !date) {
      return new Response(
        JSON.stringify({ error: "date is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
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

    return new Response(
      JSON.stringify({
        ok: true,
        date,
        done: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("DONE error:", error);

    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

    // Read DONE status
if (request.method === "GET" && url.pathname === "/done") {
  const date = url.searchParams.get("date");

  if (!date) {
    return new Response(
      JSON.stringify({ error: "date is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const stored = await env.GERMAN_NOTIFICATION_STATE.get(
    `done:${date}`
  );

  if (!stored) {
    return new Response(
      JSON.stringify({
        date,
        done: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(stored, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
    
    // Read notification pool
if (request.method === "GET" && url.pathname === "/pool") {
  const stored = await env.GERMAN_NOTIFICATION_STATE.get(
    "notification_pool"
  );

  if (!stored) {
    return new Response(
      JSON.stringify({ error: "No notification pool found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(stored, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
    
    // Save notification pool
    if (request.method === "POST" && url.pathname === "/pool") {
      try {
        const body = await request.json();

        const { date, notifications } = body;

        if (typeof date !== "string" || !date) {
          return new Response(
            JSON.stringify({ error: "date is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (!Array.isArray(notifications)) {
          return new Response(
            JSON.stringify({ error: "notifications must be an array" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const pool = notifications
          .slice(0, MAX_NOTIFICATIONS)
          .filter(item =>
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

        return new Response(
          JSON.stringify({
            ok: true,
            date,
            count: pool.length,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Pool error:", error);

        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not found", { status: 404 });
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

  // This Cron run is not one of our notification slots.
  if (!slots.includes(time)) {
    console.log(`[CRON] ${date} ${time} — not a notification slot`);
    return;
  }

  console.log(`[CRON] Checking notification slot: ${date} ${time}`);

  // Check whether today's learning is already completed.
  const done = await env.GERMAN_NOTIFICATION_STATE.get(`done:${date}`);

  if (done) {
    console.log(`[CRON] ${date} ${time} — DONE already received. Nothing to send.`);
    return;
  }

  // Read the current notification pool.
  const storedPool = await env.GERMAN_NOTIFICATION_STATE.get(
    "notification_pool"
  );

  if (!storedPool) {
    console.log(`[CRON] ${date} ${time} — no notification pool found.`);
    return;
  }

  const poolState = JSON.parse(storedPool);
  const pool = Array.isArray(poolState.notifications)
    ? poolState.notifications
    : [];

  if (pool.length === 0) {
    console.log(`[CRON] ${date} ${time} — notification pool is empty.`);
    return;
  }

  // For now we only log what would be sent.
  // Actual push delivery comes later.
  const slotIndex = slots.indexOf(time);
  const notification = pool[slotIndex % pool.length];

  console.log(
    `[CRON TEST] Would send #${(slotIndex % pool.length) + 1}:`,
    notification.de,
    "—",
    notification.ru
  );
},
