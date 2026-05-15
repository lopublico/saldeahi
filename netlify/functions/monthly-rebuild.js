/**
 * Netlify Scheduled Function — dispara una reconstrucción del sitio
 * el primer día de cada mes para actualizar las fechas de actividad
 * en Bluesky y Mastodon (APIs gratuitas consultadas durante el build).
 *
 * Variable de entorno requerida (Netlify dashboard → Environment variables):
 *   NETLIFY_BUILD_HOOK  — URL del build hook del sitio (Settings → Build hooks)
 *
 * Cron: "0 5 1 * *" → 5:00 UTC del día 1 de cada mes
 */

const { schedule } = require("@netlify/functions");

const handler = schedule("0 5 1 * *", async () => {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK;

  if (!hookUrl) {
    console.error("NETLIFY_BUILD_HOOK no configurado — reconstrucción omitida");
    return { statusCode: 500, body: "missing build hook" };
  }

  try {
    const res = await fetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger_title: "Actualización mensual automática" }),
    });
    console.log(`Build hook disparado: ${res.status}`);
    return { statusCode: 200 };
  } catch (err) {
    console.error("Error al disparar build hook:", err);
    return { statusCode: 500, body: String(err) };
  }
});

module.exports = { handler };
