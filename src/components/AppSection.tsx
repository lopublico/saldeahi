import { useState, useMemo, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mainbar } from "@/components/Mainbar";
import {
  CheckCircle, Radiation, XCircle, Mail, Flag,
  ArrowUpDown, Search, Info,
} from "lucide-react";
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

// ── Plataformas ────────────────────────────────────────────────────────────────

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
      twitter:         item.twitter         || null,
      twitter_activo:  twitterOnX(item.twitter, item.twitter_activo),
      bluesky:         item.bluesky         || null,
      bluesky_activo:  isActiveDate(item.bluesky_activo,  BLUESKY_REF),
      mastodon:        item.mastodon        || null,
      mastodon_activo: isActiveDate(item.mastodon_activo, MASTODON_REF),
      email:           item.email           || null,
      raw:             item,
    };
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────────

function calculateStats(data: any[]) {
  const total = data.length;
  if (total === 0)
    return { enX: 0, fueraDeX: 0, mastodon: 0, bluesky: 0, sinAlternativa: 0 };

  let enX = 0, fueraDeX = 0, mastodon = 0, bluesky = 0, sinAlternativa = 0;
  data.forEach((item) => {
    if (item.twitter_activo) enX++; else fueraDeX++;
    if (item.mastodon)        mastodon++;
    else if (item.bluesky)    bluesky++;
    else                      sinAlternativa++;
  });
  return { enX, fueraDeX, mastodon, bluesky, sinAlternativa };
}

// ── Iconos ─────────────────────────────────────────────────────────────────────

const TwitterIcon = ({ handle, activo }: { handle?: string | null; activo?: boolean }) => {
  const icon = (!handle || !activo)
    ? <Radiation className="h-5 w-5 text-emerald-600" />
    : <Radiation className="h-5 w-5 text-red-500" />;
  if (handle) {
    return (
      <a href={`https://twitter.com/${handle}`} target="_blank" rel="noopener noreferrer"
        className="inline-block hover:opacity-70 transition-opacity">{icon}</a>
    );
  }
  return icon;
};

const BlueskyIcon = ({ handle, activo }: { handle?: string | null; activo?: boolean }) => {
  const icon = !handle
    ? <XCircle className="h-5 w-5 text-slate-300" />
    : !activo
      ? <CheckCircle className="h-5 w-5 text-amber-400" />
      : <CheckCircle className="h-5 w-5 text-emerald-600" />;
  if (handle) {
    return (
      <a href={`https://bsky.app/profile/${handle}`} target="_blank" rel="noopener noreferrer"
        className="inline-block hover:opacity-70 transition-opacity">{icon}</a>
    );
  }
  return icon;
};

const MastodonIcon = ({ handle, activo }: { handle?: string | null; activo?: boolean }) => {
  const icon = !handle
    ? <XCircle className="h-5 w-5 text-slate-300" />
    : !activo
      ? <CheckCircle className="h-5 w-5 text-amber-400" />
      : <CheckCircle className="h-5 w-5 text-emerald-600" />;
  if (handle) {
    return (
      <a href={handle} target="_blank" rel="noopener noreferrer"
        className="inline-block hover:opacity-70 transition-opacity">{icon}</a>
    );
  }
  return icon;
};

// ── Mailto / Issue ─────────────────────────────────────────────────────────────

const FALLBACK_EMAILS: Record<string, string> = {
  AGE: "informacion@administracion.gob.es",
  Gobierno: "presidencia@lamoncloa.gob.es",
  Congreso: "congreso@congreso.es",
  Senado: "senado@senado.es",
  Partidos: "info@partido.es",
  "Autonomías": "comunicacion@gobierno.regional.es",
  Universidades: "informacion@universidad.es",
};

const REPO = "https://github.com/lopublico/saldeahi";

function generateIssueUrl(item: any) {
  const title = `Corrección de datos: ${item.nombre}`;
  const tw = item.twitter  ? `\`${item.twitter}\``  : "_sin cuenta_";
  const bs = item.bluesky  ? `\`${item.bluesky}\``  : "_sin cuenta_";
  const md = item.mastodon ? `\`${item.mastodon}\`` : "_sin cuenta_";
  const em = item.email    ? `\`${item.email}\``    : "_no disponible_";
  const sub = item.detalle ? ` · ${item.detalle}`   : "";
  const body =
`## Entidad\n**${item.nombre}** (${item.categoria}${sub})\n\n## Datos que figuran ahora\n\n| Campo | Valor actual |\n|-------|-------------|\n| X / Twitter | ${tw} |\n| Bluesky | ${bs} |\n| Mastodon | ${md} |\n| Email | ${em} |\n\n## ¿Qué hay que cambiar?\n\n- [ ] **X / Twitter** → el correcto es: \n- [ ] **Bluesky** → el correcto es: \n- [ ] **Mastodon** → el correcto es: \n- [ ] **Email** → el correcto es: \n- [ ] La cuenta ya no existe o está suspendida\n- [ ] Falta una cuenta que no aparece\n- [ ] Otro motivo: \n\n---\n_Gracias por ayudar a mantener los datos actualizados._`;
  return `${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent("datos")}`;
}

function generateMailto(item: any) {
  const email = item.email || FALLBACK_EMAILS[item.categoria] || "info@gobierno.es";
  const subject = encodeURIComponent("Solicitud de migración a redes federadas");
  const body = encodeURIComponent(
    `Estimado/a responsable de ${item.nombre},\n\nMe pongo en contacto para solicitar que ${item.nombre} considere establecer presencia en redes sociales federadas como Mastodon o Bluesky.\n\nLas instituciones públicas democráticas deberían comunicarse a través de plataformas que respeten los valores democráticos y no estén controladas por oligarcas.\n\nAtentamente,`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

// ── Tarjeta móvil ──────────────────────────────────────────────────────────────

const MobileCard = ({ item }: { item: any }) => (
  <div className="rounded-lg border bg-background p-4 space-y-4 text-left">
    <div>
      <div className="font-semibold text-sm leading-snug">{item.nombre}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {item.categoria}{item.detalle ? ` · ${item.detalle}` : ""}
      </div>
    </div>
    <div className="space-y-2">
      {[
        { label: "X/Twitter", el: <TwitterIcon handle={item.twitter} activo={item.twitter_activo} /> },
        { label: "Bluesky",   el: <BlueskyIcon  handle={item.bluesky}  activo={item.bluesky_activo}  /> },
        { label: "Mastodon",  el: <MastodonIcon handle={item.mastodon} activo={item.mastodon_activo} /> },
      ].map(({ label, el }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {el}
        </div>
      ))}
    </div>
    <div className="flex gap-2 pt-1">
      <Button variant="outline" size="sm" className="flex-1" asChild>
        <a href={generateMailto(item)}>
          <Mail className="h-4 w-4 mr-2" />Exigir migración
        </a>
      </Button>
      <Button variant="ghost" size="sm" className="px-3" title="Proponer corrección"
        onClick={() => window.open(generateIssueUrl(item), "_blank")}>
        <Flag className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  </div>
);

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

function TabRow({ items, active, onSelect }: { items: typeof TAB_ITEMS; active: string; onSelect: (v: string) => void }) {
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
    enX: number;
    fueraDeX: number;
    mastodon: number;
    bluesky: number;
    sinAlternativa: number;
  };
}

export function AppSection({ initialStats }: AppSectionProps) {
  const [activeTab, setActiveTab]       = useState("age");
  const [searchQuery, setSearchQuery]   = useState("");
  const [sortColumn, setSortColumn]     = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [stats, setStats]               = useState(initialStats);

  // ── Datos ──────────────────────────────────────────────────────────────────

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
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = normalize(searchQuery);
    return source.filter((item) =>
      [item.nombre, item.detalle, item.categoria].some(
        (f) => f && normalize(f).includes(q)
      )
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

  // ── Stats ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setStats(calculateStats(rawData));
  }, [rawData]);

  // ── Ordenación ─────────────────────────────────────────────────────────────

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  // ── Derivados de tab ───────────────────────────────────────────────────────

  const half = Math.ceil(TAB_ITEMS.length / 2);
  const totalX   = stats.enX + stats.fueraDeX;
  const totalFed = stats.mastodon + stats.bluesky + stats.sinAlternativa;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ── Barras ── */}
      <div className="w-full max-w-2xl mx-auto px-4 space-y-3">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground">¿Siguen en X?</span>
            <span className="text-xs text-muted-foreground tabular-nums">{totalX} entidades</span>
          </div>
          <Mainbar
            trackClassName="ring-0 shadow-none"
            segments={[
              { label: "Fuera de X",  value: stats.fueraDeX, colorClass: "bg-emerald-500" },
              { label: "Siguen en X", value: stats.enX,      colorClass: "bg-red-400"     },
            ]}
            ariaLabel={`${stats.fueraDeX} fuera de X, ${stats.enX} siguen en X`}
            height={10} roundedClass="rounded-sm" showCounts
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-foreground">Con alternativas federadas</span>
              <div className="group relative">
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-60 p-2.5 bg-popover text-popover-foreground text-xs rounded-md shadow-md border border-border z-10">
                  <strong>Bluesky</strong> usa AT Protocol, actualmente menos descentralizado que ActivityPub (Mastodon).
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{totalFed} entidades</span>
          </div>
          <Mainbar
            trackClassName="ring-0 shadow-none"
            segments={[
              { label: "Mastodon",        value: stats.mastodon,       colorClass: "bg-violet-500" },
              { label: "Bluesky",         value: stats.bluesky,        colorClass: "bg-sky-400"    },
              { label: "Sin alternativa", value: stats.sinAlternativa, colorClass: "bg-border"     },
            ]}
            ariaLabel={`${stats.mastodon} en Mastodon, ${stats.bluesky} en Bluesky, ${stats.sinAlternativa} sin alternativa`}
            height={10} roundedClass="rounded-sm" showCounts
          />
        </div>
      </div>

      {/* ── Buscador ── */}
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

      {/* ── Pestañas ── */}
      <div className="w-full px-4">
        {/* Móvil: dos filas */}
        <div className="md:hidden space-y-1">
          <TabRow items={TAB_ITEMS.slice(0, half)} active={activeTab} onSelect={setActiveTab} />
          <TabRow items={TAB_ITEMS.slice(half)}    active={activeTab} onSelect={setActiveTab} />
        </div>
        {/* Escritorio: fila única centrada */}
        <div className="hidden md:flex justify-center">
          <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1">
            {TAB_ITEMS.map((it) => (
              <button
                key={it.value}
                role="tab"
                aria-selected={activeTab === it.value}
                onClick={() => setActiveTab(it.value)}
                className={cn(
                  "flex-none rounded-md transition-colors whitespace-nowrap font-medium h-8 px-3 text-xs",
                  activeTab === it.value
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="w-full px-2 sm:px-4">

        {/* Móvil */}
        <div className="md:hidden">
          {(() => {
            const LIMIT = 40;
            const shown = searchQuery ? filteredData : filteredData.slice(0, LIMIT);
            return filteredData.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-left">
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
            ) : (
              <div className="rounded-md border px-6 py-8 text-center text-muted-foreground text-sm">
                Sin resultados{searchQuery ? <> para <strong>"{searchQuery}"</strong></> : ""}
              </div>
            );
          })()}
        </div>

        {/* Escritorio */}
        <div className="hidden md:block">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between py-2.5 px-4">
              <span className="text-sm text-muted-foreground">
                Mostrando{" "}
                <span className="font-medium text-foreground">{sortedData.length}</span> de{" "}
                <span className="font-medium text-foreground">
                  {searchQuery ? allData.length : rawData.length}
                </span>{" "}
                entidades
              </span>
            </CardHeader>
            <CardContent>
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {[
                      { col: "nombre",   label: "Nombre",    cls: "" },
                      { col: "detalle",  label: "Detalle",   cls: "text-center hidden md:table-cell" },
                      { col: "twitter",  label: "X/Twitter", cls: "w-24 text-center" },
                      { col: "bluesky",  label: "Bluesky",   cls: "w-24 text-center" },
                      { col: "mastodon", label: "Mastodon",  cls: "w-24 text-center" },
                    ].map(({ col, label, cls }) => (
                      <TableHead
                        key={col}
                        className={cn("cursor-pointer hover:text-foreground transition-colors", cls)}
                        onClick={() => handleSort(col)}
                      >
                        <div className={cn("flex items-center gap-1.5", cls.includes("text-center") ? "justify-center" : "")}>
                          <span className={col !== "nombre" && col !== "detalle" ? "hidden sm:inline" : ""}>{label}</span>
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                          {sortColumn === col && (
                            <span className="text-xs text-muted-foreground">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">
                      <span className="hidden sm:inline">Acción</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length > 0 ? (
                    sortedData.map((item, index) => (
                      <TableRow key={index} id={`row-${index}`} className="group">
                        <TableCell className="font-medium text-left max-w-md">
                          <div className="truncate text-sm sm:text-base">{item.nombre}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-center max-w-xs hidden md:table-cell">
                          <div className="truncate">{item.detalle}</div>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center">
                            <TwitterIcon handle={item.twitter} activo={item.twitter_activo} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center">
                            <BlueskyIcon handle={item.bluesky} activo={item.bluesky_activo} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center">
                            <MastodonIcon handle={item.mastodon} activo={item.mastodon_activo} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="outline" size="sm" className="h-9 px-2 sm:px-4 whitespace-nowrap" asChild>
                              <a href={generateMailto(item)}>
                                <Mail className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Exigir migración</span>
                              </a>
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="sm" className="h-9 w-9 p-0"
                                    onClick={() => window.open(generateIssueUrl(item), "_blank")}
                                  >
                                    <Flag className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Proponer corrección</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
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

      {/* ── Leyenda ── */}
      <div className="w-full max-w-4xl mx-auto px-4 mb-10">
        <div className="bg-muted/30 rounded-lg p-4 sm:p-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
            {[
              {
                title: "Twitter/X",
                items: [
                  { icon: <Radiation className="h-4 w-4 text-emerald-600 flex-shrink-0" />, text: "Sin cuenta o inactiva" },
                  { icon: <Radiation className="h-4 w-4 text-red-500 flex-shrink-0" />,     text: "Cuenta activa" },
                ],
              },
              {
                title: "Bluesky",
                items: [
                  { icon: <XCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />,     text: "Sin cuenta" },
                  { icon: <CheckCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />, text: "Cuenta inactiva" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />, text: "Cuenta activa" },
                ],
              },
              {
                title: "Mastodon",
                items: [
                  { icon: <XCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />,     text: "Sin cuenta" },
                  { icon: <CheckCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />, text: "Cuenta inactiva" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />, text: "Cuenta activa" },
                ],
              },
            ].map(({ title, items }) => (
              <div key={title}>
                <p className="font-medium mb-2">{title}</p>
                <ul className="space-y-2 text-muted-foreground">
                  {items.map(({ icon, text }) => (
                    <li key={text} className="flex items-center gap-2">
                      {icon}<span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
