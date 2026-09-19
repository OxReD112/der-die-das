export default {
  async fetch(request) {
    return new Response("German Learning notification server is alive.");
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
