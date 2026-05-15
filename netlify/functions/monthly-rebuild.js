import { schedule } from "@netlify/functions";

/**
 * Netlify Scheduled Function — dispara una reconstrucción del sitio
 * el primer día de cada mes a las 5:00 UTC.
 *
 * Variable requerida en Netlify → Environment variables:
 *   NETLIFY_BUILD_HOOK — URL del build hook (Settings → Build hooks)
 *   El título del hook debe ser "Actualización mensual" para que
 *   check_activity.py se ejecute durante el build (ver netlify.toml).
 */
export const handler = schedule("0 5 1 * *", async () => {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK;

  if (!hookUrl) {
    console.error("NETLIFY_BUILD_HOOK no configurado");
    return { statusCode: 500, body: "missing build hook" };
  }

  const res = await fetch(hookUrl, { method: "POST" });
  console.log(`Build hook disparado: ${res.status}`);
  return { statusCode: 200 };
});
