/**
 * Netlify Function — recibe reportes del formulario de saldeahi.es,
 * valida reCAPTCHA v3 y abre un GitHub Issue.
 *
 * Variables de entorno (Netlify dashboard → Site → Environment variables):
 *   RECAPTCHA_SECRET   — secret key de Google reCAPTCHA v3
 *   GITHUB_TOKEN       — personal access token con permiso issues:write
 *   GITHUB_REPO        — "usuario/repo"
 */

const ALLOWED_ORIGIN = process.env.URL ?? "https://saldeahi.avelrom.es";

export async function handler(event) {
  const origin = event.headers["origin"] ?? "";

  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json({ error: "method_not_allowed" }, 405, corsHeaders);
  }

  let body;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json({ error: "invalid_json" }, 400, corsHeaders);
  }

  const { nombre, categoria, detalle, twitter, bluesky, mastodon,
          campo, correcto, comentario, recaptcha_token } = body;

  if (!nombre || !campo || !recaptcha_token) {
    return json({ error: "missing_fields" }, 400, corsHeaders);
  }

  // ── reCAPTCHA v3 ────────────────────────────────────────────────────────────
  const recaptchaRes = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${recaptcha_token}`,
    }
  );
  const recaptchaData = await recaptchaRes.json();

  if (!recaptchaData.success || recaptchaData.score < 0.5) {
    return json({ error: "captcha_failed", score: recaptchaData.score ?? 0 }, 403, corsHeaders);
  }

  // ── Construir issue ──────────────────────────────────────────────────────────
  const sub   = detalle ? ` · ${detalle}` : "";
  const row   = (label, val) => `| ${label} | ${val ? `\`${val}\`` : "_sin cuenta_"} |`;
  const title = `Corrección de datos: ${nombre}`;

  const issueBody =
`## Entidad
**${nombre}** (${categoria}${sub})

## Datos actuales

| Campo | Valor |
|-------|-------|
${row("X / Twitter", twitter ?? null)}
${row("Bluesky", bluesky ?? null)}
${row("Mastodon", mastodon ?? null)}

## Corrección solicitada

**Campo:** ${campo}
**Valor correcto:** ${correcto || "_(no especificado)_"}
${comentario ? `\n**Comentario:** ${comentario}` : ""}

---
_Enviado mediante el formulario de saldeahi.es_`;

  // ── Crear issue en GitHub ────────────────────────────────────────────────────
  const ghRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent":   "saldeahi-netlify-fn/1.0",
        Accept:         "application/vnd.github+json",
      },
      body: JSON.stringify({ title, body: issueBody, labels: ["datos"] }),
    }
  );

  if (!ghRes.ok) {
    console.error("GitHub API error:", ghRes.status, await ghRes.text());
    return json({ error: "github_error" }, 502, corsHeaders);
  }

  const issue = await ghRes.json();
  return json({ ok: true, issue_url: issue.html_url }, 200, corsHeaders);
}

function json(data, statusCode, headers = {}) {
  return {
    statusCode,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
