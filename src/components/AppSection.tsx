import { useState, useMemo, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Flag, Search, Info, ChevronUp, ChevronDown } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import ageData from "@/data/age.json";
import gobiernoData from "@/data/gobierno.json";
import congresoData from "@/data/congreso.json";
import senadoData from "@/data/senado.json";
import partidosData from "@/data/partidos.json";
import autonomiasData from "@/data/autonomias.json";
import universidadesData from "@/data/universidades.json";
import lastUpdateData from "@/data/lastUpdate.json";

// ── Actividad de plataformas ───────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function platformRef(d: string | undefined): number {
  return d ? new Date(d + "T00:00:00Z").getTime() : Date.now();
}

const lu = lastUpdateData as any;
const TWITTER_REF  = platformRef(lu.twitter);
const BLUESKY_REF  = platformRef(lu.bluesky);
const MASTODON_REF = platformRef(lu.mastodon);

function isActiveDate(val: unknown, ref: number): boolean {
  if (!val || typeof val !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(val)) return false;
  return ref - new Date(val).getTime() <= THIRTY_DAYS_MS;
}

function twitterOnX(handle: unknown, activo: unknown): boolean {
  if (!handle) return false;
  if (activo == null) return true;
  return isActiveDate(activo, TWITTER_REF);
}

// ── Normalización ──────────────────────────────────────────────────────────────

function normalizeData(data: any[], categoria: string) {
  return data.map((item) => {
    let detalle = "";
    if (categoria === "Congreso" || categoria === "Senado") detalle = item.grupo || "";
    else if (categoria === "AGE")           detalle = item.categoria || "";
    else if (categoria === "Gobierno")      detalle = item.cargo || "";
    else if (categoria === "Partidos")      detalle = item.ambito || "Nacional";
    else if (categoria === "Autonomías")    detalle = item.partido || "";
    else if (categoria === "Universidades") detalle = item.tipo || "Pública";
    else detalle = item.categoria || item.cargo || item.tipo || "";

    return {
      nombre:          (item.nombre || "").trim(),
      detalle,
      categoria,
      twitter:         item.twitter  || null,
      twitter_activo:  twitterOnX(item.twitter, item.twitter_activo),
      bluesky:         item.bluesky  || null,
      bluesky_activo:  isActiveDate(item.bluesky_activo, BLUESKY_REF),
      mastodon:        item.mastodon || null,
      mastodon_activo: isActiveDate(item.mastodon_activo, MASTODON_REF),
      email:           item.email    || null,
    };
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────────

function calculateStats(data: any[]) {
  if (data.length === 0)
    return { enX: 0, fueraDeX: 0, mastodon: 0, bluesky: 0, sinAlternativa: 0 };
  let enX = 0, fueraDeX = 0, mastodon = 0, bluesky = 0, sinAlternativa = 0;
  for (const item of data) {
    if (item.twitter_activo) enX++; else fueraDeX++;
    if (item.mastodon)       mastodon++;
    else if (item.bluesky)   bluesky++;
    else                     sinAlternativa++;
  }
  return { enX, fueraDeX, mastodon, bluesky, sinAlternativa };
}

// ── Badges de plataforma ───────────────────────────────────────────────────────

type BadgeVariant = "danger" | "success" | "sky" | "violet" | "warning" | "absent";

const BADGE_CLS: Record<BadgeVariant, string> = {
  danger:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  sky:     "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  violet:  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500",
  absent:  "bg-muted/40 text-muted-foreground/30",
};

const PLATFORMS = [
  { key: "twitter"  as const, label: "𝕏" },
  { key: "bluesky"  as const, label: "B" },
  { key: "mastodon" as const, label: "M" },
];

function badgeProps(item: any, platform: "twitter" | "bluesky" | "mastodon") {
  if (platform === "twitter") {
    return {
      variant: (item.twitter_activo ? "danger" : "success") as BadgeVariant,
      tip: !item.twitter          ? "Sin cuenta en X"
         : item.twitter_activo    ? `@${item.twitter} · activo en X`
                                  : `@${item.twitter} · inactivo en X`,
      href: item.twitter ? `https://x.com/${item.twitter}` : undefined,
    };
  }
  if (platform === "bluesky") {
    return {
      variant: (!item.bluesky ? "absent" : item.bluesky_activo ? "sky" : "warning") as BadgeVariant,
      tip: !item.bluesky          ? "Sin Bluesky"
         : item.bluesky_activo    ? item.bluesky
                                  : `${item.bluesky} · poco activo`,
      href: item.bluesky ? `https://bsky.app/profile/${item.bluesky}` : undefined,
    };
  }
  return {
    variant: (!item.mastodon ? "absent" : item.mastodon_activo ? "violet" : "warning") as BadgeVariant,
    tip: !item.mastodon         ? "Sin Mastodon"
       : item.mastodon_activo   ? item.mastodon
                                : `${item.mastodon} · poco activo`,
    href: item.mastodon ?? undefined,
  };
}

const BADGE_BASE = "inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-bold leading-none select-none transition-opacity";

const PlatformBadge = ({ label, href, variant, tip }: {
  label: string; href?: string; variant: BadgeVariant; tip: string;
}) => {
  const cls = `${BADGE_BASE} ${BADGE_CLS[variant]} ${href ? "hover:opacity-70 cursor-pointer" : "cursor-default"}`;
  const inner = href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
    : <span className={cls}>{label}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
};

// ── Acciones ───────────────────────────────────────────────────────────────────

const FALLBACK_EMAILS: Record<string, string> = {
  AGE:           "informacion@administracion.gob.es",
  Gobierno:      "presidencia@lamoncloa.gob.es",
  Congreso:      "congreso@congreso.es",
  Senado:        "senado@senado.es",
  Partidos:      "info@partido.es",
  "Autonomías":  "comunicacion@gobierno.regional.es",
  Universidades: "informacion@universidad.es",
};

const REPO = "https://github.com/lopublico/saldeahi";

function generateIssueUrl(item: any) {
  const sub = item.detalle ? ` · ${item.detalle}` : "";
  const row = (label: string, val: string | null) =>
    `| ${label} | ${val ? `\`${val}\`` : "_sin cuenta_"} |`;
  const body =
`## Entidad
**${item.nombre}** (${item.categoria}${sub})

## Datos actuales

| Campo | Valor |
|-------|-------|
${row("X / Twitter", item.twitter)}
${row("Bluesky", item.bluesky)}
${row("Mastodon", item.mastodon)}
${row("Email", item.email)}

## ¿Qué hay que cambiar?

- [ ] X / Twitter → el correcto es:
- [ ] Bluesky → el correcto es:
- [ ] Mastodon → el correcto es:
- [ ] Email → el correcto es:
- [ ] La cuenta ya no existe o está suspendida
- [ ] Falta una cuenta que no aparece
- [ ] Otro motivo:

---
_Gracias por ayudar a mantener los datos actualizados._`;
  const title = `Corrección de datos: ${item.nombre}`;
  return `${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent("datos")}`;
}

function generateMailto(item: any) {
  const email   = item.email || FALLBACK_EMAILS[item.categoria] || "info@gobierno.es";
  const subject = encodeURIComponent("Solicitud de migración a redes federadas");
  const body    = encodeURIComponent(
    `Estimado/a responsable de ${item.nombre},\n\n` +
    `Me pongo en contacto para solicitar que ${item.nombre} considere establecer presencia en redes sociales federadas como Mastodon o Bluesky.\n\n` +
    `Las instituciones públicas democráticas deberían comunicarse a través de plataformas que respeten los valores democráticos y no estén controladas por oligarcas.\n\n` +
    `Atentamente,`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

// ── Tarjeta móvil ──────────────────────────────────────────────────────────────

const MobileCard = ({ item }: { item: any }) => (
  <div className="rounded-lg border bg-background p-3 text-left">
    <div className="font-medium text-sm leading-snug">{item.nombre}</div>
    {item.detalle && (
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {item.categoria} · {item.detalle}
      </div>
    )}
    <div className="flex items-center justify-between mt-3">
      <div className="flex items-center gap-1">
        {PLATFORMS.map(({ key, label }) => (
          <PlatformBadge key={key} label={label} {...badgeProps(item, key)} />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" asChild>
          <a href={generateMailto(item)}>
            <Mail className="h-3 w-3 mr-1" />Exigir
          </a>
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40 hover:opacity-70"
          onClick={() => window.open(generateIssueUrl(item), "_blank")}>
          <Flag className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    </div>
  </div>
);

// ── Stat bar ───────────────────────────────────────────────────────────────────

function StatBar({ pct, barClass, label, detail, tip }: {
  pct: number; barClass: string; label: string; detail: string; tip?: string;
}) {
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums leading-none">{pct}%</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 cursor-help text-muted-foreground/30 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px] text-left">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden bg-muted">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground/50 tabular-nums">{detail}</p>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { value: "total",         label: "Total"          },
  { value: "age",           label: "Administración" },
  { value: "gobierno",      label: "Gobierno"       },
  { value: "congreso",      label: "Congreso"       },
  { value: "senado",        label: "Senado"         },
  { value: "partidos",      label: "Partidos"       },
  { value: "autonomias",    label: "Autonomías"     },
  { value: "universidades", label: "Universidades"  },
];

function TabRow({ items, active, onSelect }: {
  items: typeof TAB_ITEMS; active: string; onSelect: (v: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto no-scrollbar">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={active === it.value}
          onClick={() => onSelect(it.value)}
          className={cn(
            "shrink-0 rounded-md transition-colors whitespace-nowrap font-medium h-8 px-3 text-xs",
            active === it.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface AppSectionProps {
  initialStats: {
    enX: number; fueraDeX: number;
    mastodon: number; bluesky: number; sinAlternativa: number;
  };
}

export function AppSection({ initialStats }: AppSectionProps) {
  const [activeTab,      setActiveTab]      = useState("age");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [sortColumn,     setSortColumn]     = useState<string | null>(null);
  const [sortDirection,  setSortDirection]  = useState<"asc" | "desc">("asc");
  const [stats,          setStats]          = useState(initialStats);

  const allDataByCategory = useMemo(() => ({
    age:           normalizeData(ageData,           "AGE"),
    gobierno:      normalizeData(gobiernoData,      "Gobierno"),
    congreso:      normalizeData(congresoData,      "Congreso"),
    senado:        normalizeData(senadoData,        "Senado"),
    partidos:      normalizeData(partidosData,      "Partidos"),
    autonomias:    normalizeData(autonomiasData,    "Autonomías"),
    universidades: normalizeData(universidadesData, "Universidades"),
  }), []);

  const allData = useMemo(() => Object.values(allDataByCategory).flat(), [allDataByCategory]);

  const rawData = useMemo(() => {
    if (activeTab === "total") return allData;
    return allDataByCategory[activeTab as keyof typeof allDataByCategory] ?? allData;
  }, [activeTab, allData, allDataByCategory]);

  const filteredData = useMemo(() => {
    const source = searchQuery ? allData : rawData;
    if (!searchQuery) return source;
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const q = norm(searchQuery);
    return source.filter((item) =>
      [item.nombre, item.detalle, item.categoria].some((f) => f && norm(f).includes(q))
    );
  }, [rawData, allData, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      let av: any, bv: any;
      if (sortColumn === "twitter") {
        av = a.twitter_activo ? 1 : 0;
        bv = b.twitter_activo ? 1 : 0;
      } else if (sortColumn === "bluesky") {
        av = a.bluesky_activo ? 1 : a.bluesky ? 0.5 : 0;
        bv = b.bluesky_activo ? 1 : b.bluesky ? 0.5 : 0;
      } else if (sortColumn === "mastodon") {
        av = a.mastodon_activo ? 1 : a.mastodon ? 0.5 : 0;
        bv = b.mastodon_activo ? 1 : b.mastodon ? 0.5 : 0;
      } else {
        av = a[sortColumn as keyof typeof a];
        bv = b[sortColumn as keyof typeof b];
      }
      if (av == null) av = "";
      if (bv == null) bv = "";
      if (typeof av !== "number") av = String(av).toLowerCase();
      if (typeof bv !== "number") bv = String(bv).toLowerCase();
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  useEffect(() => {
    setStats(calculateStats(rawData));
  }, [rawData]);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortColumn(col); setSortDirection("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortColumn === col
      ? sortDirection === "asc"
        ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
        : <ChevronDown className="h-3 w-3 inline ml-0.5" />
      : <span className="opacity-30 text-[10px] ml-0.5">↕</span>;

  const half    = Math.ceil(TAB_ITEMS.length / 2);
  const totalX  = stats.enX + stats.fueraDeX;
  const totalFed = stats.mastodon + stats.bluesky + stats.sinAlternativa;

  // Clases repetidas
  const TH_SORT = "py-2 px-4 text-[11px] uppercase tracking-wide font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-left";
  const TH_PLATFORM = "py-2 px-3 text-[11px] uppercase tracking-wide font-medium text-muted-foreground w-12 text-center border-l border-border/40 cursor-pointer hover:text-foreground transition-colors";
  const TD_PLATFORM = "py-2 px-3 align-middle w-12 text-center border-l border-border/20";

  return (
    <TooltipProvider>
      <div className="w-full space-y-5 sm:space-y-6">

        {/* Stats */}
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
          <StatBar
            pct={totalX > 0 ? Math.round((stats.enX / totalX) * 100) : 0}
            barClass="bg-red-400"
            label="siguen en X"
            detail={`${stats.enX} en X · ${stats.fueraDeX} han salido`}
          />
          <StatBar
            pct={totalFed > 0 ? Math.round(((stats.mastodon + stats.bluesky) / totalFed) * 100) : 0}
            barClass="bg-sky-400"
            label="con alternativa (Bluesky o Mastodon)"
            detail={`${stats.mastodon} en Mastodon · ${stats.bluesky} en Bluesky`}
            tip="Bluesky usa AT Protocol, actualmente menos descentralizado que ActivityPub (Mastodon)."
          />
        </div>

        {/* Buscador */}
        <div className="w-full max-w-2xl mx-auto px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text" inputMode="search"
              placeholder="Buscar entidad, ministerio, partido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Pestañas */}
        <div className="w-full px-4">
          <div className="md:hidden space-y-1">
            <TabRow items={TAB_ITEMS.slice(0, half)} active={activeTab} onSelect={setActiveTab} />
            <TabRow items={TAB_ITEMS.slice(half)}    active={activeTab} onSelect={setActiveTab} />
          </div>
          <div className="hidden md:flex justify-center">
            <TabRow items={TAB_ITEMS} active={activeTab} onSelect={setActiveTab} />
          </div>
        </div>

        {/* Leyenda + Tabla */}
        <div className="w-full space-y-3">
          <div className="w-full px-4 space-y-2">
            <p className="text-[11px] text-muted-foreground/50 text-center">
              Actividad medida sobre los 30 días anteriores a la última actualización del conjunto de datos.
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {([
                { cls: BADGE_CLS.danger,  label: "𝕏", text: "Activo en X"               },
                { cls: BADGE_CLS.success, label: "𝕏", text: "Sin cuenta o inactivo en X" },
                { cls: BADGE_CLS.sky,     label: "B",  text: "Bluesky activo"             },
                { cls: BADGE_CLS.warning, label: "B",  text: "Bluesky inactivo"           },
                { cls: BADGE_CLS.violet,  label: "M",  text: "Mastodon activo"            },
                { cls: BADGE_CLS.absent,  label: "·",  text: "Sin cuenta"                 },
              ] as const).map(({ cls, label, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${cls}`}>{label}</span>
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Móvil */}
          <div className="md:hidden px-2">
            {filteredData.length > 0 ? (() => {
              const LIMIT = 40;
              const shown = searchQuery ? filteredData : filteredData.slice(0, LIMIT);
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? <>{filteredData.length} resultado{filteredData.length !== 1 ? "s" : ""} para <strong>"{searchQuery}"</strong></>
                      : <>{filteredData.length} entidad{filteredData.length !== 1 ? "es" : ""}</>
                    }
                  </p>
                  {shown.map((item, i) => <MobileCard key={i} item={item} />)}
                  {!searchQuery && filteredData.length > LIMIT && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      Mostrando {LIMIT} de {filteredData.length}. Usa el buscador para filtrar.
                    </p>
                  )}
                </div>
              );
            })() : (
              <div className="rounded-md border px-6 py-8 text-center text-muted-foreground text-sm">
                Sin resultados{searchQuery ? <> para <strong>"{searchQuery}"</strong></> : ""}
              </div>
            )}
          </div>

          {/* Escritorio */}
          <div className="hidden md:block px-4">
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="flex-row items-center justify-between py-2 px-4 border-b border-border/40">
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{sortedData.length}</span>
                  {" "}de{" "}
                  <span className="font-medium text-foreground">
                    {searchQuery ? allData.length : rawData.length}
                  </span>{" "}entidades
                </span>
                <span className="text-xs text-muted-foreground/50">
                  Pasa el cursor sobre los badges para ver el handle
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className={TH_SORT} onClick={() => handleSort("nombre")}>
                        Nombre <SortIcon col="nombre" />
                      </TableHead>
                      <TableHead
                        className={cn(TH_SORT, "hidden lg:table-cell")}
                        onClick={() => handleSort("detalle")}
                      >
                        Detalle <SortIcon col="detalle" />
                      </TableHead>
                      {PLATFORMS.map(({ key, label }) => (
                        <TableHead key={key} className={TH_PLATFORM} onClick={() => handleSort(key)}>
                          {label} <SortIcon col={key} />
                        </TableHead>
                      ))}
                      <TableHead className="py-2 px-3 w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.length > 0 ? sortedData.map((item, i) => (
                      <TableRow key={i} className="group border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <TableCell className="py-2 px-4 align-middle text-left">
                          <div className="text-sm font-medium leading-snug truncate">{item.nombre}</div>
                        </TableCell>
                        <TableCell className="py-2 px-3 align-middle text-left hidden lg:table-cell">
                          <div className="text-xs text-muted-foreground truncate">{item.detalle}</div>
                        </TableCell>
                        {PLATFORMS.map(({ key, label }) => (
                          <TableCell key={key} className={TD_PLATFORM}>
                            <PlatformBadge label={label} {...badgeProps(item, key)} />
                          </TableCell>
                        ))}
                        <TableCell className="py-2 px-3 align-middle w-44">
                          <div className="flex items-center gap-1 justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm"
                                  className="h-7 px-2 text-[11px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  asChild>
                                  <a href={generateMailto(item)}>
                                    <Mail className="h-3 w-3 shrink-0" />
                                    Exigir migración
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[200px] text-left">
                                Abre tu cliente de correo con un borrador pidiendo a {item.nombre} que se establezca en redes federadas.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 opacity-40 hover:opacity-70 transition-opacity"
                                  onClick={() => window.open(generateIssueUrl(item), "_blank")}>
                                  <Flag className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Proponer corrección de datos</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-sm">
                          No se encontraron resultados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
