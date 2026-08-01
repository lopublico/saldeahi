const ALLOWED_ORIGIN = Deno.env.get("URL") || "https://saldeahi.avelrom.es";

export default async (request, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Verify request origin using custom header
  const isVerified = request.headers.get("x-verified-request") === "true";
  if (!isVerified) {
    return new Response(JSON.stringify({ error: "request_blocked" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { nombre, categoria, detalle, twitter, bluesky, mastodon,
          campo, correcto, comentario, recaptcha_token, email_confirm } = body;

  // Block honeypot submissions
  if (email_confirm) {
    return new Response(JSON.stringify({ error: "request_blocked" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!nombre || !campo || !recaptcha_token) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── reCAPTCHA v3 ────────────────────────────────────────────────────────────
  const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET");
  const recaptchaRes = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${RECAPTCHA_SECRET}&response=${recaptcha_token}`,
    }
  );
  const recaptchaData = await recaptchaRes.json();

  if (!recaptchaData.success || recaptchaData.score < 0.5) {
    return new Response(JSON.stringify({ error: "captcha_failed", score: recaptchaData.score ?? 0 }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  const GITHUB_REPO = Deno.env.get("GITHUB_REPO");
  const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
  
  const ghRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent":   "saldeahi-netlify-fn/1.0",
        Accept:         "application/vnd.github+json",
      },
      body: JSON.stringify({ title, body: issueBody, labels: ["datos"] }),
    }
  );

  if (!ghRes.ok) {
    console.error("GitHub API error:", ghRes.status, await ghRes.text());
    return new Response(JSON.stringify({ error: "github_error" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const issue = await ghRes.json();
  return new Response(JSON.stringify({ ok: true, issue_url: issue.html_url }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};
