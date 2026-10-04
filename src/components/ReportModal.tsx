import { Icono } from "@/components/Icono";

// El formulario es el ReportDialog compartido (@lopublico/ui), montado en el Layout; este botón solo le pasa la entidad.
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

export function ReportButton({ item }: Props) {
  const abrir = () =>
    (window as any).lpReport?.open({
      nombre: item.nombre,
      subtitulo: [item.categoria, item.detalle].filter(Boolean).join(" · "),
      datos: [
        { etiqueta: "X / Twitter", valor: item.twitter },
        { etiqueta: "Bluesky", valor: item.bluesky },
        { etiqueta: "Mastodon", valor: item.mastodon },
      ],
    });

  return (
    <button
      type="button"
      className="lp-btn lp-btn--ghost lp-btn--icon lp-btn--sm sd-report-btn"
      onClick={abrir}
      title={`Reportar corrección sobre ${item.nombre}`}
      aria-label="Reportar dato o corrección"
    >
      <Icono nombre="flag" tam={12} />
    </button>
  );
}
