import { Download, ExternalLink } from "lucide-react";

// Zenodo no sirve los ficheros a través del DOI de concepto (solo la página HTML
// redirige a la última versión), así que las descargas necesitan el ID de la versión
// concreta. zenodo_publish.py actualiza ZENODO_RECORD automáticamente tras cada publicación.
const ZENODO_RECORD = "https://zenodo.org/records/21777156";
const ZENODO_CSV    = `${ZENODO_RECORD}/files/dataset.csv?download=1`;
const ZENODO_JSON   = `${ZENODO_RECORD}/files/dataset.json?download=1`;
const ZENODO_XLSX   = `${ZENODO_RECORD}/files/dataset.xlsx?download=1`;
// DOI de concepto: enlace estable que siempre redirige a la última versión publicada.
const ZENODO_LATEST = "https://zenodo.org/records/20692749";

const BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.06em",
  fontWeight: 500,
  padding: "5px 12px",
  border: "1px solid",
  background: "transparent",
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap" as const,
  lineHeight: "1",
};

const DARK: React.CSSProperties  = { ...BASE, borderColor: "rgba(246,244,239,0.3)",  color: "rgba(246,244,239,0.8)"  };
const LIGHT: React.CSSProperties = { ...BASE, borderColor: "rgba(20,20,20,0.25)",    color: "rgba(20,20,20,0.65)"    };

export function ExportButton({ dark = false }: { dark?: boolean }) {
  const s = dark ? DARK : LIGHT;
  const dim = { ...s, opacity: 0.6 };
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", alignItems: "center" }}>
      <a href={ZENODO_CSV}  target="_blank" rel="noopener" style={s} download><Download size={12} />CSV</a>
      <a href={ZENODO_JSON} target="_blank" rel="noopener" style={s} download><Download size={12} />JSON</a>
      <a href={ZENODO_XLSX} target="_blank" rel="noopener" style={s} download><Download size={12} />Excel</a>
      <a href={ZENODO_LATEST} target="_blank" rel="noopener" style={dim}><ExternalLink size={12} />Zenodo</a>
    </div>
  );
}
