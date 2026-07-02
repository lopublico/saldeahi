import { useState, useCallback } from "react";
import { Flag, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const WORKER_URL = "/.netlify/functions/report";
// Site key pública de reCAPTCHA v3 — no es un secreto
const RECAPTCHA_SITE_KEY = import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY ?? "";

const CAMPOS = [
  { value: "twitter",  label: "X / Twitter" },
  { value: "bluesky",  label: "Bluesky" },
  { value: "mastodon", label: "Mastodon" },
  { value: "suspendida", label: "La cuenta está suspendida o no existe" },
  { value: "falta",    label: "Falta una cuenta que no aparece" },
  { value: "otro",     label: "Otro" },
];

type Status = "idle" | "loading" | "ok" | "error";

interface Props {
  item: {
    nombre: string;
    categoria: string;
    detalle: string;
    twitter: string | null;
    bluesky: string | null;
    mastodon: string | null;
  };
}

declare global {
  interface Window {
    grecaptcha: any;
  }
}

function loadRecaptcha(siteKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.grecaptcha) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function ReportButton({ item }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-20 hover:opacity-50 transition-opacity"
        onClick={() => setOpen(true)}
        title="Reportar dato incorrecto"
      >
        <Flag className="h-3 w-3 text-muted-foreground" />
      </Button>
      <ReportModal item={item} open={open} onOpenChange={setOpen} />
    </>
  );
}

function ReportModal({ item, open, onOpenChange }: Props & {
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [campo, setCampo] = useState("");
  const [correcto, setCorrecto] = useState("");
  const [comentario, setComentario] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const needsValue = campo && !["suspendida", "falta", "otro"].includes(campo);

  const reset = useCallback(() => {
    setCampo(""); setCorrecto(""); setComentario("");
    setStatus("idle"); setErrorMsg("");
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campo) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      let recaptcha_token = "";
      if (RECAPTCHA_SITE_KEY) {
        await loadRecaptcha(RECAPTCHA_SITE_KEY);
        recaptcha_token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "report" });
      }

      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:    item.nombre,
          categoria: item.categoria,
          detalle:   item.detalle,
          twitter:   item.twitter,
          bluesky:   item.bluesky,
          mastodon:  item.mastodon,
          campo,
          correcto,
          comentario,
          recaptcha_token,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "error");
      setStatus("ok");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        err.message === "captcha_failed"
          ? "No hemos podido verificar que eres humano. Inténtalo de nuevo."
          : "Ha ocurrido un error al enviar el reporte. Inténtalo de nuevo."
      );
    }
  };

  const sub = item.detalle ? ` · ${item.detalle}` : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reportar dato incorrecto</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-medium text-foreground">{item.nombre}</span>
            {sub && <span className="text-muted-foreground"> ({item.categoria}{sub})</span>}
          </DialogDescription>
        </DialogHeader>

        {status === "ok" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium">¡Gracias por el reporte!</p>
            <p className="text-xs text-muted-foreground">
              Lo revisaremos y actualizaremos los datos si procede.
            </p>
            <Button size="sm" variant="outline" onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="campo">¿Qué hay que corregir?</Label>
              <select
                id="campo"
                value={campo}
                onChange={e => { setCampo(e.target.value); setCorrecto(""); }}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>Selecciona…</option>
                {CAMPOS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {needsValue && (
              <div className="space-y-1.5">
                <Label htmlFor="correcto">Valor correcto</Label>
                <Input
                  id="correcto"
                  placeholder={
                    campo === "twitter"  ? "@handle" :
                    campo === "bluesky"  ? "handle.bsky.social" :
                    campo === "mastodon" ? "https://mastodon.social/@handle" : ""
                  }
                  value={correcto}
                  onChange={e => setCorrecto(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="comentario">Comentario <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                id="comentario"
                placeholder="Cualquier detalle adicional…"
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={!campo || status === "loading"}>
                {status === "loading" && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                Enviar reporte
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              Protegido por reCAPTCHA.{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="underline">Privacidad</a>
              {" · "}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener" className="underline">Condiciones</a>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
