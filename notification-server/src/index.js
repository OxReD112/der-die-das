const MAX_NOTIFICATIONS = 4;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("German Learning notification server is alive.");
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
    const now = new Date();

    const berlinTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(now);

    console.log(`[CRON TEST] Worker ran at Berlin time: ${berlinTime}`);
  },
};
