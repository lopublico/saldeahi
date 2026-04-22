import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

import ageData from "@/data/age.json";
import gobiernoData from "@/data/gobierno.json";
import congresoData from "@/data/congreso.json";
import senadoData from "@/data/senado.json";
import partidosData from "@/data/partidos.json";
import autonomiasData from "@/data/autonomias.json";
import universidadesData from "@/data/universidades.json";

const ALL_DATA: { categoria: string; items: any[] }[] = [
  { categoria: "AGE",           items: ageData           },
  { categoria: "Gobierno",      items: gobiernoData      },
  { categoria: "Congreso",      items: congresoData      },
  { categoria: "Senado",        items: senadoData        },
  { categoria: "Partidos",      items: partidosData      },
  { categoria: "Autonomías",    items: autonomiasData    },
  { categoria: "Universidades", items: universidadesData },
];

function escapeCSV(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(): string {
  const rows: string[] = [
    ["Categoría", "Nombre", "Twitter", "Twitter Activo", "Bluesky", "Bluesky Activo", "Mastodon", "Mastodon Activo", "Email"].join(","),
  ];
  for (const { categoria, items } of ALL_DATA) {
    for (const item of items) {
      rows.push([
        escapeCSV(categoria),
        escapeCSV(item.nombre),
        escapeCSV(item.twitter),
        escapeCSV(item.twitter_activo),
        escapeCSV(item.bluesky),
        escapeCSV(item.bluesky_activo),
        escapeCSV(item.mastodon),
        escapeCSV(item.mastodon_activo),
        escapeCSV(item.email),
      ].join(","));
    }
  }
  return rows.join("\n");
}

function buildJSON(): string {
  const result: any[] = [];
  for (const { categoria, items } of ALL_DATA) {
    for (const item of items) {
      result.push({ categoria, ...item });
    }
  }
  return JSON.stringify(result, null, 2);
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton() {
  const date = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline" size="sm"
        onClick={() => download(buildCSV(), `saldeahi-${date}.csv`, "text/csv;charset=utf-8;")}
      >
        <Download className="h-4 w-4 mr-2" />
        Descargar CSV
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={() => download(buildJSON(), `saldeahi-${date}.json`, "application/json")}
      >
        <Download className="h-4 w-4 mr-2" />
        Descargar JSON
      </Button>
    </div>
  );
}
