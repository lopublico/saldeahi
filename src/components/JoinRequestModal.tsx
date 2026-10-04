import { useState, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import { Icono } from "@/components/Icono";

export interface JoinItem {
  nombre: string;
  categoria: string;
  detalle: string;
  grupoShort?: string | null;
  grupoFull?: string | null;
  twitter: string | null;
  twitter_activo?: boolean;
  bluesky: string | null;
  bluesky_activo?: boolean;
  mastodon: string | null;
  mastodon_activo?: boolean;
  email: string | null;
}

interface JoinRequestButtonProps {
  item: JoinItem;
}

export function JoinRequestButton({ item }: JoinRequestButtonProps) {
  const hasAlternative = !!item.bluesky || !!item.mastodon;
  const isTwitterActive = !!item.twitter_activo;

  // Si ya tiene cuenta en Bluesky o Mastodon y ha abandonado X (o no tiene X): no se hace nada
  if (hasAlternative && !isTwitterActive) {
    return null;
  }

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lp-btn lp-btn--outline lp-btn--sm sd-join-trigger-btn"
        title={`Pedir a ${item.nombre} que migre a redes abiertas y federadas`}
      >
        <Icono nombre="megaphone" tam={12} className="opacity-70" />
        <span>Pedir migración</span>
      </button>
      <JoinRequestModal item={item} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ── Generadores de mensajes dinámicos según el estado de la entidad ──────

function getDynamicTweet(item: JoinItem): string {
  const hasBluesky = !!item.bluesky;
  const isBlueskyActive = !!item.bluesky_activo;
  const hasMastodon = !!item.mastodon;
  const hasTwitter = !!item.twitter;
  const isTwitterActive = !!item.twitter_activo;

  // Caso 1.5: Tiene Bluesky y Mastodon
  if (hasBluesky && hasMastodon) {
    if (hasTwitter && isTwitterActive) {
      return `Hola @${item.twitter}, ya tenéis presencia en redes abiertas (Bluesky y Mastodon). Os animamos a dar el paso definitivo y abandonar X, una red en manos de un tecnooligarca. #SalDeAhí`;
    }
    return "";
  }

  // Caso 1.2 y 1.3: Tiene Bluesky pero NO Mastodon (e.g. La Moncloa)
  if (hasBluesky && !hasMastodon) {
    if (!isBlueskyActive) {
      return `Hola @${item.twitter}, al parecer tenéis cuenta en Bluesky (@${item.bluesky}), pero está inactiva. Os animamos a reactivarla y a dar el paso de abandonar X, una red en manos de un tecnooligarca. #SalDeAhí`;
    }
    return `Hola @${item.twitter}, gran paso con vuestra cuenta en Bluesky. Para una comunicación plenamente soberana, os pedimos abrir cuenta en Mastodon y dar el paso definitivo de abandonar X. #SalDeAhí`;
  }

  // Caso 1.4: Tiene Mastodon pero NO Bluesky
  if (!hasBluesky && hasMastodon) {
    return `Hola @${item.twitter}, gran paso con vuestra cuenta en Mastodon. Os pedimos abrir también en Bluesky o Eurosky y dar el paso definitivo de abandonar X, una red en manos de un tecnooligarca. #SalDeAhí`;
  }

  // Caso 1.1: No tiene ni Bluesky ni Mastodon
  return `Hola @${item.twitter}, la ciudadanía necesita canales de información pública abiertos e independientes. ¿Cuándo abriréis cuenta oficial en redes abiertas como Bluesky o Mastodon? #SalDeAhí`;
}

function getDynamicBsky(item: JoinItem): string {
  const isBlueskyActive = !!item.bluesky_activo;

  // Caso 2.1: Bluesky inactivo y sin Mastodon (e.g. La Moncloa)
  if (!isBlueskyActive) {
    return `Hola @${item.bluesky}, la ciudadanía echa en falta actividad en esta cuenta institucional. Además, os pedimos dar el paso hacia la soberanía digital: uníos a Eurosky y abrid una cuenta en Mastodon (o usad puentes). #SalDeAhí https://saldeahi.es`;
  }

  // Caso 2.2: Bluesky activo y sin Mastodon
  return `Hola @${item.bluesky}, gran paso con esta cuenta en Bluesky. Para una comunicación pública verdaderamente soberana y abierta, os pedimos valorar la migración a Eurosky y abrir una cuenta en Mastodon (o usar puentes). #SalDeAhí https://saldeahi.es`;
}

function getDynamicEmailSubject(item: JoinItem): string {
  const hasBluesky = !!item.bluesky;
  const isBlueskyActive = !!item.bluesky_activo;
  const hasMastodon = !!item.mastodon;

  // Caso 3.5: Ambas redes abiertas
  if (hasBluesky && hasMastodon) {
    return `Petición ciudadana: abandono definitivo de X y apuesta íntegra por redes libres`;
  }

  // Caso 3.2 y 3.3: Bluesky sin Mastodon
  if (hasBluesky && !hasMastodon) {
    if (!isBlueskyActive) {
      return `Petición ciudadana: reactivación en Bluesky, cuenta en Mastodon y abandono de X`;
    }
    return `Petición ciudadana: apertura de cuenta en Mastodon y abandono de X`;
  }

  // Caso 3.4: Mastodon sin Bluesky
  if (!hasBluesky && hasMastodon) {
    return `Petición ciudadana: cuenta institucional en Bluesky o Eurosky y abandono de X`;
  }

  // Caso 3.1: Sin Bluesky ni Mastodon
  return `Petición ciudadana: migración institucional a redes abiertas (Bluesky y Mastodon)`;
}

function getDynamicEmailBody(item: JoinItem): string {
  const hasBluesky = !!item.bluesky;
  const isBlueskyActive = !!item.bluesky_activo;
  const hasMastodon = !!item.mastodon;

  // Caso 3.5: Ambas redes abiertas
  if (hasBluesky && hasMastodon) {
    return `Estimado/a representante o equipo de ${item.nombre}:

Le escribo para celebrar que ya cuenten con presencia en redes abiertas y federadas como Mastodon y Bluesky.

Al mismo tiempo, como ciudadano/a le solicito que valore dar el paso definitivo y abandonar su actividad institucional en X (Twitter), una plataforma privada en manos de un tecnooligarca cuyos algoritmos e intereses no garantizan un espacio público neutral ni democrático.

La comunicación institucional debe priorizar los estándares abiertos y la soberanía digital de la ciudadanía.

Agradeciendo de antemano su atención, reciba un cordial saludo.`;
  }

  // Caso 3.2: Bluesky inactivo (>30d), sin Mastodon
  if (hasBluesky && !isBlueskyActive && !hasMastodon) {
    return `Estimado/a representante o equipo de ${item.nombre}:

Le escribo en primer lugar para valorar positivamente que cuenten con un perfil en Bluesky (@${item.bluesky}), si bien actualmente se encuentra inactivo, por lo que le animo a reactivar su publicación periódica.

Al mismo tiempo, como ciudadano/a le solicito que su entidad valore dar el paso hacia una soberanía digital plena:
1. Reactivar su presencia y abrir una cuenta oficial en Mastodon (fediverso público), o evaluar la integración en Eurosky.
2. Dar el paso definitivo de abandonar su actividad institucional en X (Twitter), una plataforma en manos de un tecnooligarca cuyos intereses privados y algoritmos opacos no garantizan un espacio público neutral ni democrático.

La comunicación pública no debería depender en exclusiva de monopolios privados.

Agradeciendo de antemano su atención, reciba un cordial saludo.`;
  }

  // Caso 3.3: Bluesky activo (<30d), sin Mastodon
  if (hasBluesky && isBlueskyActive && !hasMastodon) {
    return `Estimado/a representante o equipo de ${item.nombre}:

Le escribo en primer lugar para felicitar a su entidad por mantener presencia activa en Bluesky (@${item.bluesky}).

Para avanzar hacia una comunicación pública verdaderamente soberana y europea, le solicito que valore dar los siguientes pasos fundamentales:
1. Abrir una cuenta oficial en Mastodon (fediverso público) o considerar la adhesión a Eurosky, garantizando un estándar abierto e interoperable, independiente de cualquier empresa privada.
2. Dar el paso definitivo de abandonar su actividad institucional en X (Twitter), una plataforma privada en manos de un tecnooligarca que compromete la neutralidad y la privacidad ciudadana.

La información institucional debe pertenecer al espacio público libre y soberano.

Agradeciendo de antemano su atención, reciba un cordial saludo.`;
  }

  // Caso 3.4: Mastodon sin Bluesky
  if (!hasBluesky && hasMastodon) {
    return `Estimado/a representante o equipo de ${item.nombre}:

Le escribo en primer lugar para felicitar a su entidad por mantener una cuenta activa en Mastodon y el fediverso público.

Al mismo tiempo, como ciudadano/a le solicito que valore avanzar hacia una soberanía digital integral:
1. Abrir también una cuenta en Bluesky (prioritariamente a través de un nodo europeo como Eurosky) para facilitar el acceso de toda la ciudadanía.
2. Dar el paso definitivo de abandonar su actividad institucional en X (Twitter), una red privada en manos de un tecnooligarca.

La comunicación institucional debe pertenecer al espacio público y no depender de monopolios privados.

Agradeciendo de antemano su atención, reciba un cordial saludo.`;
  }

  // Caso 3.1: Sin Bluesky ni Mastodon
  return `Estimado/a representante o equipo de ${item.nombre}:

Le escribo como ciudadano/a para solicitarle que valore iniciar la migración hacia redes sociales abiertas, descentralizadas y federadas, como Mastodon y Bluesky, y abandonar progresivamente la actividad en X (Twitter).

La comunicación pública no debería depender en exclusiva de plataformas privadas con algoritmos opacos en manos de magnates tecnológicos. La soberanía digital, la transparencia y el derecho de la ciudadanía a recibir información institucional en estándares libres requieren una presencia activa en estos nuevos espacios.

Agradeciendo de antemano su atención, reciba un cordial saludo.`;
}

interface JoinRequestModalProps {
  item: JoinItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Canal = "tweet" | "bsky" | "email";

// Bloque de edición común a los tres canales: texto editable + copiar + acción principal
function Redactor({ copiado, onCopiar, etiquetaCopiar, accion, children }: {
  copiado: boolean; onCopiar: () => void; etiquetaCopiar: [string, string]; accion?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="sd-join-pane">
      {children}
      <div className="sd-join-acciones">
        <button type="button" className="lp-btn lp-btn--outline lp-btn--sm" onClick={onCopiar}>
          {copiado ? <><Icono nombre="check" tam={14} /> {etiquetaCopiar[1]}</> : <><Icono nombre="copy" tam={14} /> {etiquetaCopiar[0]}</>}
        </button>
        {accion}
      </div>
    </div>
  );
}

export function JoinRequestModal({ item, open, onOpenChange }: JoinRequestModalProps) {
  const hasBluesky = !!item.bluesky;
  const isBlueskyActive = !!item.bluesky_activo;
  const hasMastodon = !!item.mastodon;
  const hasTwitter = !!item.twitter;
  const isTwitterActive = !!item.twitter_activo;
  const hasEmail = !!item.email;

  // Visibilidad de canales: si ya está en Bluesky y Mastodon no hay canal Bluesky
  const showTwitterTab = hasTwitter && (!hasBluesky || !hasMastodon || isTwitterActive);
  const showBlueskyTab = hasBluesky && !hasMastodon;
  const canalInicial: Canal = showTwitterTab ? "tweet" : showBlueskyTab ? "bsky" : "email";

  const [canal, setCanal] = useState<Canal>(canalInicial);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [tweetText, setTweetText] = useState(() => getDynamicTweet(item));
  const [emailSubject, setEmailSubject] = useState(() => getDynamicEmailSubject(item));
  const [emailBody, setEmailBody] = useState(() => getDynamicEmailBody(item));
  const [bskyText, setBskyText] = useState(() => getDynamicBsky(item));

  // Textos y canal activo se reinician cada vez que se abre el modal o cambia la entidad
  useEffect(() => {
    if (!open) return;
    setCanal(canalInicial);
    setTweetText(getDynamicTweet(item));
    setEmailSubject(getDynamicEmailSubject(item));
    setEmailBody(getDynamicEmailBody(item));
    setBskyText(getDynamicBsky(item));
    setCopiado(null);
  }, [open, item, canalInicial]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onOpenChange]);

  const copiar = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado(null), 2000);
  };

  const enlaceExterno = (href: string, texto: string, estilo?: React.CSSProperties) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn--solid lp-btn--sm" style={estilo}>
      <span>{texto}</span><Icono nombre="external-link" tam={12} />
    </a>
  );
  const punto = (color: string) => <span className="sd-join-dot" style={{ background: color }} />;
  const chip = (activo: boolean, texto: string, color?: string) => (
    <span className={`lp-badge ${activo ? "" : "lp-badge--outline"}`} style={activo && color ? { background: color, color: "#fff" } : undefined}>{texto}</span>
  );

  const estado = hasBluesky && hasMastodon
    ? isTwitterActive ? "Presente en Bluesky y Mastodon. El mensaje le anima a abandonar definitivamente 𝕏." : "Presente en Bluesky y Mastodon y ha dejado 𝕏."
    : hasBluesky && !isBlueskyActive
    ? isTwitterActive ? "Cuenta en Bluesky inactiva (> 30 días). El mensaje pide reactivarla, unirse a Mastodon o Eurosky y abandonar 𝕏." : "Cuenta en Bluesky inactiva (> 30 días)."
    : hasBluesky
    ? isTwitterActive ? "Cuenta activa en Bluesky. El mensaje pide abrir cuenta en Mastodon o Eurosky y abandonar 𝕏." : "Cuenta activa en Bluesky."
    : hasMastodon
    ? isTwitterActive ? "Cuenta en Mastodon. El mensaje pide abrir en Bluesky o Eurosky y abandonar 𝕏." : "Cuenta en Mastodon."
    : hasTwitter ? "Solo tiene presencia en 𝕏. No está en ninguna red pública abierta." : "No tiene presencia social pública registrada.";

  const tab = (id: Canal, icono: React.ReactNode, texto: string, color: string) => (
    <button type="button" className="lp-tab" aria-selected={canal === id} onClick={() => setCanal(id)}>
      {icono}<span>{texto}</span>{punto(color)}
    </button>
  );

  if (!open) return null;

  // Portal a <body>: el modal vive dentro de una fila de tabla y position:fixed no debe depender de sus ancestros
  return createPortal(
    <div className="lp-backdrop is-open" onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div className="lp-modal sd-join" role="dialog" aria-modal="true" aria-label="Pedir migración a redes federadas">
        <div className="lp-modal-head">
          <div>
            <h2 className="lp-modal-title"><Icono nombre="megaphone" tam={16} style={{ display: "inline", marginRight: 6 }} />Pedir migración a redes federadas</h2>
            <p className="sd-join-sub">Elige una opción para solicitar a esta entidad o representante que migre a canales abiertos y soberanos.</p>
          </div>
          <button type="button" className="lp-btn lp-btn--ghost lp-btn--icon lp-btn--sm" aria-label="Cerrar" onClick={() => onOpenChange(false)}>✕</button>
        </div>

        <div className="sd-join-ficha">
          <div className="sd-join-ficha-top">
            <div>
              <div className="sd-join-nombre">{item.nombre}</div>
              <div className="sd-join-meta">{item.categoria}{item.grupoFull ? ` · ${item.grupoFull}` : item.detalle ? ` · ${item.detalle}` : ""}</div>
            </div>
            <div className="sd-join-chips">
              {chip(hasTwitter, hasTwitter ? `@${item.twitter}` : "Sin 𝕏", "#171717")}
              {chip(hasBluesky, hasBluesky ? `@${item.bluesky}` : "Sin B", "#0085ff")}
              {chip(hasMastodon, hasMastodon ? "M" : "Sin M", "#6364ff")}
            </div>
          </div>
          <div className="sd-join-estado">{punto(hasBluesky && hasMastodon ? "#10b981" : hasBluesky || hasMastodon ? "#f59e0b" : "#f43f5e")}<span>{estado}</span></div>
        </div>

        <div className="lp-tabs sd-join-tabs">
          {showTwitterTab && tab("tweet", <span aria-hidden="true">𝕏</span>, "Publicar en 𝕏", "#10b981")}
          {showBlueskyTab && tab("bsky", <Icono nombre="share-2" tam={14} />, "Bluesky", isBlueskyActive ? "#10b981" : "#f59e0b")}
          {tab("email", <Icono nombre="mail" tam={14} />, "Mandar un correo", hasEmail ? "#10b981" : "#a3a3a3")}
        </div>

        {canal === "tweet" && showTwitterTab && (
          <Redactor copiado={copiado === "tweet"} onCopiar={() => copiar(tweetText, "tweet")} etiquetaCopiar={["Copiar texto", "Copiado"]} accion={enlaceExterno(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "Publicar en 𝕏")}>
            <div className="sd-join-linea"><span>Mencionando a <strong>@{item.twitter}</strong></span><span>{tweetText.length}/280</span></div>
            <textarea className="lp-input lp-textarea" rows={4} value={tweetText} onChange={(e) => setTweetText(e.target.value)} />
          </Redactor>
        )}

        {canal === "bsky" && showBlueskyTab && (
          <Redactor copiado={copiado === "bsky"} onCopiar={() => copiar(bskyText, "bsky")} etiquetaCopiar={["Copiar texto", "Copiado"]} accion={enlaceExterno(`https://bsky.app/intent/compose?text=${encodeURIComponent(bskyText)}`, "Publicar en Bluesky", { background: "#0085ff", borderColor: "#0085ff" })}>
            <div className="sd-join-linea">
              <span>Mencionando a <strong>@{item.bluesky}</strong> <span className={`lp-badge ${isBlueskyActive ? "lp-badge--ok" : "lp-badge--warn"}`}>{isBlueskyActive ? "Activo" : "Inactivo (>30d)"}</span></span>
              <span>{bskyText.length}/300</span>
            </div>
            <p className="sd-join-sub">{isBlueskyActive
              ? "Ya está en Bluesky. El mensaje le propone unirse a Eurosky (nodo europeo) y abrir una cuenta en Mastodon:"
              : "Tiene cuenta en Bluesky, pero inactiva. El mensaje le pide reactivarla, sumarse a Eurosky y abrir una cuenta en Mastodon:"}</p>
            <textarea className="lp-input lp-textarea" rows={4} value={bskyText} onChange={(e) => setBskyText(e.target.value)} />
          </Redactor>
        )}

        {canal === "email" && (
          <Redactor copiado={copiado === "email-full"} onCopiar={() => copiar(`Asunto: ${emailSubject}\n\n${emailBody}`, "email-full")} etiquetaCopiar={["Copiar mensaje", "Plantilla copiada"]} accion={hasEmail && (
            <a href={`mailto:${item.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} className="lp-btn lp-btn--solid lp-btn--sm">
              <Icono nombre="mail" tam={14} /><span>Abrir en tu gestor de correo</span><Icono nombre="external-link" tam={12} />
            </a>
          )}>
            {hasEmail ? (
              <div className="sd-join-linea sd-join-para">
                <span>Para: <strong>{item.email}</strong></span>
                <button type="button" className="lp-btn lp-btn--ghost lp-btn--sm" onClick={() => copiar(item.email!, "email-addr")}>
                  {copiado === "email-addr" ? <><Icono nombre="check" tam={12} /> Copiado</> : <><Icono nombre="copy" tam={12} /> Copiar correo</>}
                </button>
              </div>
            ) : (
              <div className="lp-callout lp-callout--warn"><Icono nombre="info" tam={16} className="shrink-0" />
                <span>No disponemos de una dirección de correo público registrada para esta entidad. Puedes copiar esta plantilla para enviarla mediante su formulario web oficial, sede electrónica o buzón ciudadano.</span>
              </div>
            )}
            <label className="lp-label">Asunto:<input className="lp-input" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></label>
            <label className="lp-label">Cuerpo del mensaje:<textarea className="lp-input lp-textarea" rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} /></label>
          </Redactor>
        )}
      </div>
    </div>,
    document.body
  );
}
