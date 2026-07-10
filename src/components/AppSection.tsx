import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReportButton } from "@/components/ReportModal";

import "@/styles/sd-app.css";

import ageData from "@/data/age.json";
import organosData from "@/data/organos.json";
import gobiernoData from "@/data/gobierno.json";
import congresoData from "@/data/congreso.json";
import senadoData from "@/data/senado.json";
import partidosData from "@/data/partidos.json";
import autonomiasData from "@/data/autonomias.json";
import universidadesData from "@/data/universidades.json";
import lastUpdateData from "@/data/lastUpdate.json";

// ── Actividad de plataformas ───────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function platformRef(d: string | undefined): number {
  return d ? new Date(d + "T00:00:00Z").getTime() : Date.now();
}

const lastUpdate = lastUpdateData as any;
const TWITTER_REF  = platformRef(lastUpdate.twitter);
const BLUESKY_REF  = platformRef(lastUpdate.bluesky);
const MASTODON_REF = platformRef(lastUpdate.mastodon);

function isActiveDate(val: unknown, ref: number): boolean {
  if (!val || typeof val !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(val)) return false;
  return ref - new Date(val).getTime() <= THIRTY_DAYS_MS;
}

function mastodonHref(handle: string | null): string | undefined {
  if (!handle) return undefined;
  const handleClean = handle.replace(/^@/, "");
  const atPosition = handleClean.indexOf("@");
  if (atPosition === -1) return undefined;
  return `https://${handleClean.slice(atPosition + 1)}/@${handleClean.slice(0, atPosition)}`;
}

function twitterOnX(handle: unknown, activo: unknown): boolean {
  if (!handle) return false;
  if (activo == null) return false;
  return isActiveDate(activo, TWITTER_REF);
}

// ── Etiqueta de columna por pestaña ───────────────────────────────────────

// ── Partición de la AGE en tres pestañas ──────────────────────────────────

const ADMIN_TIPOS = new Set([
  "Presidencia del Gobierno", "Ministerio", "Secretaría de Estado",
  "Delegación del Gobierno", "Seguridad y Defensa",
]);
const EMPRESAS_TIPOS = new Set([
  "Entidad Pública Empresarial", "Sociedad Mercantil Estatal", "Fundación Estatal",
]);

const ageAdministracion = (ageData as any[]).filter((x) => ADMIN_TIPOS.has(x.categoria));
const ageEmpresas       = (ageData as any[]).filter((x) => EMPRESAS_TIPOS.has(x.categoria));
const ageOrganismos     = (ageData as any[]).filter(
  (x) => !ADMIN_TIPOS.has(x.categoria) && !EMPRESAS_TIPOS.has(x.categoria));

// ── Partición de Autonomías: institucional vs. organismos autonómicos ─────

const AUTONOMIAS_INSTITUCIONAL_TIPOS = new Set(["Presidente/a", "Gobierno", "Parlamento"]);

const autonomiasInstitucional = (autonomiasData as any[]).filter(
  (x) => AUTONOMIAS_INSTITUCIONAL_TIPOS.has(x.tipo));
const organismosAutonomicos = (autonomiasData as any[]).filter(
  (x) => !AUTONOMIAS_INSTITUCIONAL_TIPOS.has(x.tipo));

const DETALLE_LABEL: Record<string, string> = {
  total:          "Detalle",
  administracion: "Tipo",
  organismos:     "Tipo",
  empresas:       "Tipo",
  organos:        "Tipo",
  gobierno:      "Cargo",
  congreso:      "Grupo",
  senado:        "Grupo",
  partidos:      "Ámbito",
  autonomias:    "CC.AA.",
  organismosautonomicos: "CC.AA.",
  universidades: "Tipo",
};

// ── Grupos parlamentarios ──────────────────────────────────────────────────

const CONGRESO_ABBREV: Record<string, string> = {
  "Grupo Parlamentario Popular en el Congreso": "PP",
  "Grupo Parlamentario Socialista": "PSOE",
  "Grupo Parlamentario VOX": "VOX",
  "Grupo Parlamentario Plurinacional SUMAR": "SUMAR",
  "Grupo Parlamentario Mixto": "Mixto",
  "Grupo Parlamentario Junts per Catalunya": "Junts",
  "Grupo Parlamentario Republicano": "ERC",
  "Grupo Parlamentario Euskal Herria Bildu": "EH Bildu",
  "Grupo Parlamentario Vasco (EAJ-PNV)": "PNV",
};

const SENADO_ABBREV: Record<string, string> = {
  "GPP": "PP", "GPS": "PSOE", "GPERB": "ERC·Bildu",
  "GPIC": "Izq. Conf.", "GPPLU": "Plural", "GPV": "PNV", "GPMX": "Mixto",
};

const GRUPO_FULLNAME: Record<string, string> = {
  "PP":         "Partido Popular",
  "PSOE":       "Partido Socialista Obrero Español",
  "VOX":        "VOX",
  "SUMAR":      "Sumar",
  "ERC":        "Esquerra Republicana de Catalunya",
  "EH Bildu":   "Euskal Herria Bildu",
  "Junts":      "Junts per Catalunya",
  "PNV":        "EAJ – Partido Nacionalista Vasco",
  "Mixto":      "Grupo Parlamentario Mixto",
  "ERC·Bildu":  "ERC + EH Bildu (Senado)",
  "Izq. Conf.": "Izquierda Confederal (Senado)",
  "Plural":     "Grupo Plural (Junts, CC, BNG…)",
};

// ── Normalización de datos ─────────────────────────────────────────────────

function normalizeData(data: any[], categoria: string) {
  return data.map((item) => {
    let detalle = "";
    let grupoShort: string | null = null;
    let grupoFull:  string | null = null;

    if (categoria === "Congreso") {
      detalle    = item.grupo || "";
      grupoShort = CONGRESO_ABBREV[detalle] ?? null;
      grupoFull  = grupoShort ? (GRUPO_FULLNAME[grupoShort] ?? detalle) : detalle;
    } else if (categoria === "Senado") {
      detalle    = item.grupo || "";
      grupoShort = (SENADO_ABBREV[detalle] ?? detalle) || null;
      grupoFull  = grupoShort ? (GRUPO_FULLNAME[grupoShort] ?? `Grupo ${grupoShort}`) : detalle;
    } else if (categoria === "Administración")          detalle = item.categoria || "";
    else if (categoria === "Organismos públicos")       detalle = item.categoria || "";
    else if (categoria === "Empresas y fundaciones")    detalle = item.categoria || "";
    else if (categoria === "Órganos del Estado") detalle = item.categoria || "";
    else if (categoria === "Gobierno")        detalle = item.cargo || "";
    else if (categoria === "Partidos")        detalle = item.ambito || "Nacional";
    else if (categoria === "Autonomías")      detalle = item.ccaa || "";
    else if (categoria === "Organismos autonómicos") detalle = item.ccaa || "";
    else if (categoria === "Universidades")   detalle = item.tipo || "Pública";

    return {
      nombre:          (item.nombre || "").trim(),
      detalle,
      grupoShort,
      grupoFull,
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

// ── Estadísticas ───────────────────────────────────────────────────────────

function calculateStats(data: any[]) {
  if (data.length === 0)
    return { enX: 0, fueraDeX: 0, conBluesky: 0, conMastodon: 0, conAlternativa: 0, sinAlternativa: 0, sinNinguna: 0 };
  let enX = 0, conBluesky = 0, conMastodon = 0, conAlternativa = 0, sinAlternativa = 0, sinNinguna = 0;
  for (const item of data) {
    if (item.twitter_activo) enX++;
    if (item.bluesky)  conBluesky++;
    if (item.mastodon) conMastodon++;
    if (item.bluesky || item.mastodon) conAlternativa++;
    else if (item.twitter) sinAlternativa++;
    if (!item.twitter && !item.bluesky && !item.mastodon) sinNinguna++;
  }
  return { enX, fueraDeX: data.length - enX, conBluesky, conMastodon, conAlternativa, sinAlternativa, sinNinguna };
}

// ── Badges de plataforma ───────────────────────────────────────────────────

type BadgeState = "on" | "soft" | "off";

const BADGE_STATE_SUFFIX: Record<BadgeState, string> = {
  on: "activo", soft: "inactivo", off: "vacio",
};
const BADGE_PLATFORM_NAME: Record<"x" | "b" | "m", string> = {
  x: "x", b: "bluesky", m: "mastodon",
};

function getBadgeClass(state: BadgeState, platform: "x" | "b" | "m"): string {
  return `plataforma-badge plataforma-badge--${BADGE_PLATFORM_NAME[platform]}-${BADGE_STATE_SUFFIX[state]}`;
}

function badgeProps(item: any, platform: "twitter" | "bluesky" | "mastodon") {
  if (platform === "twitter") {
    const state: BadgeState = !item.twitter ? "off" : item.twitter_activo ? "on" : "soft";
    return { state, platformKey: "x" as const, label: "𝕏",
      tip: !item.twitter ? "Sin cuenta en X" : item.twitter_activo ? `@${item.twitter} · activo` : `@${item.twitter} · inactivo`,
      href: item.twitter ? `https://x.com/${item.twitter}` : undefined };
  }
  if (platform === "bluesky") {
    const state: BadgeState = !item.bluesky ? "off" : item.bluesky_activo ? "on" : "soft";
    return { state, platformKey: "b" as const, label: "B",
      tip: !item.bluesky ? "Sin cuenta en Bluesky" : item.bluesky_activo ? `${item.bluesky} · activo` : `${item.bluesky} · inactivo`,
      href: item.bluesky ? `https://bsky.app/profile/${item.bluesky}` : undefined };
  }
  const state: BadgeState = !item.mastodon ? "off" : item.mastodon_activo ? "on" : "soft";
  return { state, platformKey: "m" as const, label: "M",
    tip: !item.mastodon ? "Sin cuenta en Mastodon" : item.mastodon_activo ? `${item.mastodon} · activo` : `${item.mastodon} · inactivo`,
    href: mastodonHref(item.mastodon) };
}

const PlatformBadge = ({ label, href, state, platformKey, tip }: {
  label: string; href?: string; state: BadgeState; platformKey: "x" | "b" | "m"; tip: string;
}) => {
  const badgeClass = getBadgeClass(state, platformKey);
  const inner = href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${badgeClass} hover:opacity-70`}>{label}</a>
    : <span className={badgeClass}>{label}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
};

// ── Gráfico donut ──────────────────────────────────────────────────────────

function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const filledArc = (Math.max(0, Math.min(100, pct)) / 100) * circumference;
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" className="sd-donut">
      <circle cx={17} cy={17} r={radius} fill="none" stroke="var(--sd-line)" strokeWidth={4.5} />
      <circle cx={17} cy={17} r={radius} fill="none" stroke={color} strokeWidth={4.5}
        style={{ strokeDasharray: `${filledArc} ${circumference}`, transition: "stroke-dasharray 0.55s cubic-bezier(0.4,0,0.2,1)" }}
        transform="rotate(-90 17 17)"
      />
    </svg>
  );
}

// ── Tarjeta móvil ──────────────────────────────────────────────────────────

const MobileCard = ({ item }: { item: any }) => (
  <div className="sd-card rounded border border-border/40 bg-background p-3 text-left">
    <div className="sd-card-name">{item.nombre}</div>
    {item.detalle && (
      <div className="sd-card-detail">{item.categoria} · {item.grupoShort ?? item.detalle}</div>
    )}
    <div className="flex items-center justify-between mt-3">
      <div className="flex items-center gap-1.5">
        {(["twitter", "bluesky", "mastodon"] as const).map((key) => (
          <PlatformBadge key={key} {...badgeProps(item, key)} />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <ReportButton item={item} />
      </div>
    </div>
  </div>
);

// ── Pestañas de categoría ──────────────────────────────────────────────────

const TABS = [
  { value: "total",          label: "Total",                  group: "todas"   },
  { value: "gobierno",       label: "Gobierno",               group: "estado"  },
  { value: "administracion", label: "Administración",         group: "estado"  },
  { value: "organismos",     label: "Organismos públicos",    group: "estado"  },
  { value: "empresas",       label: "Empresas y fundaciones", group: "estado"  },
  { value: "organos",        label: "Órganos del Estado",     group: "poderes" },
  { value: "congreso",       label: "Congreso",               group: "poderes" },
  { value: "senado",         label: "Senado",                 group: "poderes" },
  { value: "partidos",       label: "Partidos",               group: "partidos" },
  { value: "autonomias",     label: "Autonomías",             group: "ccaa"    },
  { value: "organismosautonomicos", label: "Organismos autonómicos", group: "ccaa" },
  { value: "universidades",  label: "Universidades",          group: "universidades" },
];

function CategoryTabs({ items, active, onSelect }: {
  items: typeof TABS; active: string; onSelect: (v: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const updateScrollIndicators = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftIndicator(scrollLeft > 2);
    setShowRightIndicator(scrollWidth - clientWidth - scrollLeft > 2);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollIndicators();
    window.addEventListener("resize", updateScrollIndicators);
    el.addEventListener("scroll", updateScrollIndicators);

    return () => {
      window.removeEventListener("resize", updateScrollIndicators);
      el.removeEventListener("scroll", updateScrollIndicators);
    };
  }, [items]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('[aria-selected="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [active]);

  return (
    <div className={`sd-tabs-container ${showLeftIndicator ? "can-scroll-left" : ""} ${showRightIndicator ? "can-scroll-right" : ""}`}>
      <div
        ref={scrollContainerRef}
        role="tablist"
        className="sd-category-nav no-scrollbar"
      >
        {items.map((tab, i) => {
          const prevGroup = i > 0 ? items[i - 1].group : null;
          const isNewGroup = i > 0 && tab.group !== prevGroup;
          return (
            <Fragment key={tab.value}>
              {isNewGroup && <span className="sd-category-divider" aria-hidden="true" />}
              <button
                role="tab"
                aria-selected={active === tab.value}
                onClick={() => onSelect(tab.value)}
                className="sd-category-btn"
              >
                {tab.label}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

interface AppSectionProps {
  initialStats: {
    enX: number; fueraDeX: number;
    conBluesky: number; conMastodon: number; conAlternativa: number; sinAlternativa: number;
    sinNinguna: number;
  };
}

export function AppSection({ initialStats }: AppSectionProps) {
  const [activeTab,     setActiveTab]     = useState("total");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [sortColumn,    setSortColumn]    = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [stats,         setStats]         = useState(initialStats);
  const [statsVersion,  setStatsVersion]  = useState(0);
  const [grupoFilter,   setGrupoFilter]   = useState<string | null>(null);
  const [visibleCount,  setVisibleCount]  = useState(100);
  const statsRef = useRef<HTMLDivElement>(null);

  const dataByCategory = useMemo(() => ({
    administracion: normalizeData(ageAdministracion, "Administración"),
    organismos:     normalizeData(ageOrganismos,     "Organismos públicos"),
    empresas:       normalizeData(ageEmpresas,       "Empresas y fundaciones"),
    organos:       normalizeData(organosData,       "Órganos del Estado"),
    gobierno:      normalizeData(gobiernoData,      "Gobierno"),
    congreso:      normalizeData(congresoData,      "Congreso"),
    senado:        normalizeData(senadoData,        "Senado"),
    partidos:      normalizeData(partidosData,      "Partidos"),
    autonomias:    normalizeData(autonomiasInstitucional, "Autonomías"),
    organismosautonomicos: normalizeData(organismosAutonomicos, "Organismos autonómicos"),
    universidades: normalizeData(universidadesData, "Universidades"),
  }), []);

  const allData = useMemo(() => Object.values(dataByCategory).flat(), [dataByCategory]);

  const rawData = useMemo(() => {
    if (activeTab === "total") return allData;
    return dataByCategory[activeTab as keyof typeof dataByCategory] ?? allData;
  }, [activeTab, allData, dataByCategory]);

  const uniqueGroups = useMemo(() => {
    const seen = new Set<string>();
    if (activeTab === "congreso" || activeTab === "senado") {
      for (const item of rawData) if (item.grupoShort) seen.add(item.grupoShort);
    } else if (["administracion", "organismos", "empresas", "organos", "organismosautonomicos"].includes(activeTab)) {
      for (const item of rawData) if (item.detalle) seen.add(item.detalle);
    }
    return Array.from(seen);
  }, [rawData, activeTab]);

  const grupoFilteredData = useMemo(() => {
    if (!grupoFilter) return rawData;
    const key = ["administracion", "organismos", "empresas", "organos", "organismosautonomicos"].includes(activeTab) ? "detalle" : "grupoShort";
    return rawData.filter((item) => item[key] === grupoFilter);
  }, [rawData, grupoFilter, activeTab]);

  const filteredData = useMemo(() => {
    const source = searchQuery ? allData : grupoFilteredData;
    if (!searchQuery) return source;
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const tokens = norm(searchQuery).split(/\s+/).filter(Boolean);
    const haystack = (item: any) =>
      [item.nombre, item.detalle, item.categoria].filter(Boolean).map(norm).join(" ");
    return source.filter((item) => {
      const h = haystack(item);
      return tokens.every((t) => h.includes(t));
    });
  }, [grupoFilteredData, allData, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      let av: any, bv: any;
      if (sortColumn === "twitter") { av = a.twitter_activo ? 1 : 0; bv = b.twitter_activo ? 1 : 0; }
      else if (sortColumn === "bluesky")  { av = a.bluesky_activo ? 1 : a.bluesky ? 0.5 : 0;  bv = b.bluesky_activo ? 1 : b.bluesky ? 0.5 : 0; }
      else if (sortColumn === "mastodon") { av = a.mastodon_activo ? 1 : a.mastodon ? 0.5 : 0; bv = b.mastodon_activo ? 1 : b.mastodon ? 0.5 : 0; }
      else { av = a[sortColumn as keyof typeof a]; bv = b[sortColumn as keyof typeof b]; }
      if (av == null) av = ""; if (bv == null) bv = "";
      if (typeof av !== "number") av = String(av).toLowerCase();
      if (typeof bv !== "number") bv = String(bv).toLowerCase();
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  useEffect(() => { setGrupoFilter(null); }, [activeTab]);
  useEffect(() => { setVisibleCount(100); }, [activeTab, searchQuery, grupoFilter, sortColumn, sortDirection]);

  useEffect(() => {
    setStats(calculateStats(grupoFilteredData));
    setStatsVersion(v => v + 1);
  }, [grupoFilteredData]);

  // Reproduce la animación CSS sin remontar (preserva la transición de los donuts)
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    el.classList.remove("sd-stats-reveal");
    void el.offsetWidth; // fuerza reflow
    el.classList.add("sd-stats-reveal");
  }, [statsVersion]);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDirection("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortColumn === col
      ? sortDirection === "asc" ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />
      : <span className="opacity-30 text-[10px] ml-0.5">↕</span>;

  const detalleLabel = DETALLE_LABEL[activeTab] ?? "Detalle";

  const third = Math.ceil(TABS.length / 3);
  const half  = Math.ceil(TABS.length / 2);
  const total = stats.enX + stats.fueraDeX;
  const base  = total - stats.sinNinguna;
  const pctX   = base > 0 ? Math.round((stats.enX           / base) * 100) : 0;
  const pctB   = base > 0 ? Math.round((stats.conBluesky    / base) * 100) : 0;
  const pctM   = base > 0 ? Math.round((stats.conMastodon   / base) * 100) : 0;
  const pctSin = base > 0 ? Math.round((stats.sinAlternativa / base) * 100) : 0;
  const activeLabel = TABS.find(t => t.value === activeTab)?.label ?? "Total";

  return (
    <TooltipProvider>
      <div className="sd-app w-full">


        {/* ── Búsqueda ─────────────────────────────────────────── */}
        <div className="sd-search-wrap px-6 sm:px-14 pt-5 pb-5">
          <div className="sd-search-bar">
            <Search className="sd-search-icon h-4 w-4" />
            <input type="text" inputMode="search"
              placeholder="Buscar entidad, ministerio, partido…"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              className="sd-search-input"
            />
            <span className="sd-search-shortcut hidden sm:inline">⌘ K</span>
          </div>
        </div>


        {/* ── Pestañas ─────────────────────────────────────────── */}
        <div className="sd-tabs-wrap px-6 sm:px-14 pt-4 pb-3">
          <CategoryTabs items={TABS} active={activeTab} onSelect={setActiveTab} />
        </div>

        {/* ── Estadísticas de la categoría ─────────────────────── */}
        <div className="sd-stats-section px-6 sm:px-14 py-4 pb-8">
          <div className="sd-stats-heading">
            {activeLabel} <span>· {total} entidades</span>
          </div>
          <div ref={statsRef} className="sd-stats-grid sd-stats-reveal grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0">
            <div className="hidden sm:block sd-grid-divider sd-grid-divider-q1" />
            <div className="hidden sm:block sd-grid-divider sd-grid-divider-half" />
            <div className="hidden sm:block sd-grid-divider sd-grid-divider-q3" />

            <div className="sd-stat-item sm:pr-6">
              <MiniDonut pct={pctX} color="#1a1a1a" />
              <div className="sd-stat-content">
                <div className="sd-stat-value">{pctX}%</div>
                <div className="sd-stat-label">En X · {stats.enX}</div>
              </div>
            </div>

            <div className="sd-stat-item sm:px-6">
              <MiniDonut pct={pctB} color="var(--sd-sky)" />
              <div className="sd-stat-content">
                <div className="sd-stat-value">{pctB}%</div>
                <div className="sd-stat-label">Bluesky · {stats.conBluesky}</div>
              </div>
            </div>

            <div className="sd-stat-item sm:px-6">
              <MiniDonut pct={pctM === 0 && stats.conMastodon > 0 ? 1 : pctM} color="var(--sd-mastodon)" />
              <div className="sd-stat-content">
                <div className="sd-stat-value">{pctM === 0 && stats.conMastodon > 0 ? "< 1" : pctM}%</div>
                <div className="sd-stat-label">Mastodon · {stats.conMastodon}</div>
              </div>
            </div>

            <div className="sd-stat-item sm:pl-6">
              <MiniDonut pct={pctSin} color="var(--sd-rose-pink)" />
              <div className="sd-stat-content">
                <div className="sd-stat-value">{pctSin}%</div>
                <div className="sd-stat-label sd-stat-label--alert">Sin alternativa · {stats.sinAlternativa}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Leyenda ──────────────────────────────────────────── */}
        <div className="sd-platform-legend px-6 sm:px-14 pb-3 pt-4 flex flex-wrap gap-x-5 gap-y-2">
          {([
            { platformKey: "x" as const, label: "𝕏", text: "X activo/inactivo/sin cuenta"        },
            { platformKey: "b" as const, label: "B",  text: "Bluesky activo/inactivo/sin cuenta"  },
            { platformKey: "m" as const, label: "M",  text: "Mastodon activo/inactivo/sin cuenta" },
          ]).map(({ platformKey, label, text }) => (
            <span key={platformKey} className="sd-legend-entry">
              <span className={getBadgeClass("on",   platformKey)}>{label}</span>
              <span className={getBadgeClass("soft", platformKey)}>{label}</span>
              <span className={getBadgeClass("off",  platformKey)}>{label}</span>
              <span>{text}</span>
            </span>
          ))}
        </div>

        {/* ── Resultados ───────────────────────────────────────── */}
        <div className="sd-results">

          {/* Móvil */}
          <div className="sd-cards md:hidden px-4 pt-2">
            {filteredData.length > 0 ? (() => {
              const LIMIT = 40;
              const shown = searchQuery ? filteredData : filteredData.slice(0, LIMIT);
              return (
                <div className="space-y-2">
                  <p className="sd-mobile-counter">
                    {searchQuery
                      ? <>{filteredData.length} resultado{filteredData.length !== 1 ? "s" : ""} para <strong>"{searchQuery}"</strong></>
                      : <>{filteredData.length} entidad{filteredData.length !== 1 ? "es" : ""}</>
                    }
                  </p>
                  {shown.map((item, i) => <MobileCard key={i} item={item} />)}
                  {!searchQuery && filteredData.length > LIMIT && (
                    <p className="sd-mobile-counter sd-mobile-counter-center">
                      Mostrando {LIMIT} de {filteredData.length}. Usa el buscador para filtrar.
                    </p>
                  )}
                </div>
              );
            })() : (
              <div className="sd-no-results">
                Sin resultados{searchQuery ? <> para <strong>"{searchQuery}"</strong></> : ""}
              </div>
            )}
          </div>

          {/* Escritorio */}
          <div className="sd-table-wrap hidden md:block px-6 sm:px-14">
            <div className="sd-table-frame">
              <div className="sd-table-topbar">
                <span className="sd-table-count">
                  <strong>{sortedData.length}</strong> de <strong>{searchQuery ? allData.length : grupoFilteredData.length}</strong> entidades
                </span>
              </div>

              <Table className="sd-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sd-table-header sd-col-name" onClick={() => handleSort("nombre")}>
                      Nombre <SortIcon col="nombre" />
                    </TableHead>
                    <TableHead className="sd-table-header sd-col-detail hidden lg:table-cell"
                      onClick={uniqueGroups.length === 0 ? () => handleSort("detalle") : undefined}
                      style={{ cursor: uniqueGroups.length > 0 ? "default" : undefined }}
                    >
                      {uniqueGroups.length > 0 ? (
                        <span className="sd-col-select-wrap">
                          <select
                            value={grupoFilter ?? ""}
                            onChange={(e) => { e.stopPropagation(); setGrupoFilter(e.target.value || null); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`sd-col-select${grupoFilter ? " sd-col-select--active" : ""}`}
                          >
                            <option value="">{detalleLabel}</option>
                            {uniqueGroups.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                          <ChevronDown className={`sd-col-select-icon${grupoFilter ? " sd-col-select-icon--active" : ""}`} />
                        </span>
                      ) : (
                        <>{detalleLabel} <SortIcon col="detalle" /></>
                      )}
                    </TableHead>
                    {(["twitter", "bluesky", "mastodon"] as const).map((key) => (
                      <TableHead key={key} className="sd-table-header sd-col-platform" onClick={() => handleSort(key)}>
                        {key === "twitter" ? "𝕏" : key === "bluesky" ? "B" : "M"} <SortIcon col={key} />
                      </TableHead>
                    ))}
                    <TableHead className="sd-table-header sd-col-actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length > 0 ? sortedData.slice(0, visibleCount).map((item, i) => (
                    <TableRow key={`${item.categoria}·${item.nombre}·${i}`} className="sd-data-row group">
                      <TableCell className="sd-cell-name">
                        <div className="sd-entity-name">{item.nombre}</div>
                      </TableCell>
                      <TableCell className="sd-cell-detail hidden lg:table-cell">
                        {item.grupoShort ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="sd-group-tag">{item.grupoShort}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{item.grupoFull}</TooltipContent>
                          </Tooltip>
                        ) : item.detalle ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="sd-entity-detail">{item.detalle}</div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[260px] text-left">{item.detalle}</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      {(["twitter", "bluesky", "mastodon"] as const).map((key) => (
                        <TableCell key={key} className="sd-cell-platform">
                          <PlatformBadge {...badgeProps(item, key)} />
                        </TableCell>
                      ))}
                      <TableCell className="sd-cell-actions">
                        <div className="sd-row-actions">
                          <ReportButton item={item} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="sd-empty-state">No se encontraron resultados</div>
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedData.length > visibleCount && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-3">
                        <Button variant="outline" size="sm"
                          className="text-xs text-foreground border-border hover:bg-muted"
                          onClick={() => setVisibleCount(c => c + 200)}>
                          Mostrar más ({visibleCount} de {sortedData.length})
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
