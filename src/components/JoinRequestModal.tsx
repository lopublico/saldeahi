import { useState, useEffect } from "react";
import {
  Megaphone, Mail, Twitter, Copy, Check, ExternalLink,
  Share2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="sd-join-trigger-btn"
        title={`Pedir a ${item.nombre} que migre a redes abiertas y federadas`}
      >
        <Megaphone className="h-3 w-3 mr-1 opacity-70" />
        <span>Pedir migración</span>
      </Button>
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

export function JoinRequestModal({ item, open, onOpenChange }: JoinRequestModalProps) {
  const hasBluesky = !!item.bluesky;
  const isBlueskyActive = !!item.bluesky_activo;
  const hasMastodon = !!item.mastodon;
  const hasTwitter = !!item.twitter;
  const isTwitterActive = !!item.twitter_activo;
  const hasEmail = !!item.email;

  // Lógica de visibilidad de pestañas
  const showTwitterTab = hasTwitter && (!hasBluesky || !hasMastodon || isTwitterActive);
  // Caso 2.3: si ya está en Bluesky y Mastodon, el botón/pestaña en Bluesky no existe
  const showBlueskyTab = hasBluesky && !hasMastodon;
  const showEmailTab = true;

  const defaultTab: "tweet" | "bsky" | "email" = showTwitterTab
    ? "tweet"
    : showBlueskyTab
    ? "bsky"
    : "email";

  const [activeTab, setActiveTab] = useState<"tweet" | "email" | "bsky">(defaultTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [tweetText, setTweetText] = useState(() => getDynamicTweet(item));
  const [emailSubject, setEmailSubject] = useState(() => getDynamicEmailSubject(item));
  const [emailBody, setEmailBody] = useState(() => getDynamicEmailBody(item));
  const [bskyText, setBskyText] = useState(() => getDynamicBsky(item));

  // Actualizar textos y pestaña activa siempre que se abra el modal o cambie el item
  useEffect(() => {
    if (open) {
      setActiveTab(showTwitterTab ? "tweet" : showBlueskyTab ? "bsky" : "email");
      setTweetText(getDynamicTweet(item));
      setEmailSubject(getDynamicEmailSubject(item));
      setEmailBody(getDynamicEmailBody(item));
      setBskyText(getDynamicBsky(item));
      setCopiedKey(null);
    }
  }, [open, item, showTwitterTab, showBlueskyTab]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  const bskyIntentUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(bskyText)}`;
  const mailtoUrl = hasEmail
    ? `mailto:${item.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 text-foreground">
        <DialogHeader className="space-y-1.5 text-left border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-muted text-foreground">
              <Megaphone className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-semibold">
              Pedir migración a redes federadas
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Elige una opción para solicitar a esta entidad o representante que migre a canales abiertos y soberanos.
          </DialogDescription>

          {/* Ficha de la entidad */}
          <div className="mt-3 p-3 rounded-md bg-muted/60 border border-border/70 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm leading-tight text-foreground">{item.nombre}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  {item.categoria}
                  {item.grupoFull ? ` · ${item.grupoFull}` : item.detalle ? ` · ${item.detalle}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                <span className={`px-1.5 py-0.5 rounded ${hasTwitter ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold" : "bg-muted text-muted-foreground border border-dashed border-border"}`}>
                  {hasTwitter ? `@${item.twitter}` : "Sin 𝕏"}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${hasBluesky ? "bg-[#0085ff] text-white font-semibold" : "bg-muted text-muted-foreground border border-dashed border-border"}`}>
                  {hasBluesky ? `@${item.bluesky}` : "Sin B"}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${hasMastodon ? "bg-[#6364ff] text-white font-semibold" : "bg-muted text-muted-foreground border border-dashed border-border"}`}>
                  {hasMastodon ? "M" : "Sin M"}
                </span>
              </div>
            </div>

            <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 pt-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${hasBluesky && hasMastodon ? "bg-emerald-500" : hasBluesky || hasMastodon ? "bg-amber-500" : "bg-rose-500"}`} />
              <span>
                {hasBluesky && hasMastodon
                  ? isTwitterActive
                    ? "Presente en Bluesky y Mastodon. El mensaje le anima a abandonar definitivamente 𝕏."
                    : "Presente en Bluesky y Mastodon y ha dejado 𝕏."
                  : hasBluesky && !isBlueskyActive
                  ? isTwitterActive
                    ? "Cuenta en Bluesky inactiva (> 30 días). El mensaje pide reactivarla, unirse a Mastodon o Eurosky y abandonar 𝕏."
                    : "Cuenta en Bluesky inactiva (> 30 días)."
                  : hasBluesky
                  ? isTwitterActive
                    ? "Cuenta activa en Bluesky. El mensaje pide abrir cuenta en Mastodon o Eurosky y abandonar 𝕏."
                    : "Cuenta activa en Bluesky."
                  : hasMastodon
                  ? isTwitterActive
                    ? "Cuenta en Mastodon. El mensaje pide abrir en Bluesky o Eurosky y abandonar 𝕏."
                    : "Cuenta en Mastodon."
                  : hasTwitter
                  ? "Solo tiene presencia en 𝕏. No está en ninguna red pública abierta."
                  : "No tiene presencia social pública registrada."}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Selector de canal */}
        <div className="pt-2">
          <div className="flex items-center gap-1 border-b border-border pb-2 text-xs font-mono">
            {showTwitterTab && (
              <button
                type="button"
                onClick={() => setActiveTab("tweet")}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === "tweet"
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Twitter className="h-3.5 w-3.5" />
                <span>Publicar en 𝕏</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
              </button>
            )}

            {showBlueskyTab && (
              <button
                type="button"
                onClick={() => setActiveTab("bsky")}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === "bsky"
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Bluesky</span>
                <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${isBlueskyActive ? "bg-emerald-500" : "bg-amber-500"}`} />
              </button>
            )}

            {showEmailTab && (
              <button
                type="button"
                onClick={() => setActiveTab("email")}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === "email"
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Mandar un correo</span>
                <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${hasEmail ? "bg-emerald-500" : "bg-neutral-400"}`} />
              </button>
            )}
          </div>

          {/* ── Pestaña 1: Tuit en 𝕏 ── */}
          {activeTab === "tweet" && showTwitterTab && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Mencionando a <strong className="text-foreground font-mono">@{item.twitter}</strong>
                </span>
                <span className="font-mono text-[11px]">{tweetText.length}/280</span>
              </div>

              <Textarea
                rows={4}
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                className="text-xs font-sans leading-relaxed resize-none"
              />

              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(tweetText, "tweet")}
                  className="text-xs font-mono"
                >
                  {copiedKey === "tweet" ? (
                    <><Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Copiado</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar texto</>
                  )}
                </Button>

                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <span>Publicar en 𝕏</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* ── Pestaña 2: Publicar en Bluesky ── */}
          {activeTab === "bsky" && showBlueskyTab && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>Mencionando a</span>
                  <strong className="text-foreground font-mono">@{item.bluesky}</strong>
                  {isBlueskyActive ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                      Activo
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-medium">
                      Inactivo (&gt;30d)
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px]">{bskyText.length}/300</span>
              </div>

              <div className="text-[11px] text-muted-foreground">
                {!isBlueskyActive ? (
                  <span>Tiene cuenta en Bluesky, pero inactiva. El mensaje le pide reactivarla, sumarse a Eurosky y abrir una cuenta en Mastodon:</span>
                ) : (
                  <span>Ya está en Bluesky. El mensaje le propone unirse a Eurosky (nodo europeo) y abrir una cuenta en Mastodon:</span>
                )}
              </div>

              <Textarea
                rows={4}
                value={bskyText}
                onChange={(e) => setBskyText(e.target.value)}
                className="text-xs font-sans leading-relaxed resize-none"
              />

              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(bskyText, "bsky")}
                  className="text-xs font-mono"
                >
                  {copiedKey === "bsky" ? (
                    <><Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Copiado</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar texto</>
                  )}
                </Button>

                <a
                  href={bskyIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-[#0085ff] text-white hover:opacity-90 transition-opacity"
                >
                  <span>Publicar en Bluesky</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* ── Pestaña 3: Correo electrónico ── */}
          {activeTab === "email" && showEmailTab && (
            <div className="space-y-3 pt-3">
              {hasEmail ? (
                <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/50 border border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono">Para:</span>
                    <strong className="font-mono text-foreground text-[11.5px]">{item.email}</strong>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-mono"
                    onClick={() => handleCopy(item.email!, "email-addr")}
                  >
                    {copiedKey === "email-addr" ? (
                      <><Check className="h-3 w-3 mr-1 text-emerald-500" /> Copiado</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copiar correo</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11.5px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    No disponemos de una dirección de correo público registrada para esta entidad.
                    Puedes copiar esta plantilla para enviarla mediante su formulario web oficial, sede electrónica o buzón ciudadano.
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-muted-foreground">Asunto:</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="text-xs font-sans h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-muted-foreground">Cuerpo del mensaje:</label>
                <Textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(`Asunto: ${emailSubject}\n\n${emailBody}`, "email-full")}
                  className="text-xs font-mono"
                >
                  {copiedKey === "email-full" ? (
                    <><Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Plantilla copiada</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar mensaje</>
                  )}
                </Button>

                {hasEmail && (
                  <a
                    href={mailtoUrl}
                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Abrir en tu gestor de correo</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
