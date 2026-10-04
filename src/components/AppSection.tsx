import { Fragment } from "preact";
import { useState, useMemo, useEffect, useRef } from "preact/hooks";
import { Icono } from "@/components/Icono";
import { ReportButton } from "@/components/ReportModal";
import { JoinRequestButton } from "@/components/JoinRequestModal";

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
      bluesky_eurosky: !!item.bluesky_eurosky,
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

const LEGEND_GROUPS = [
  {
    name: "X",
    key: "x",
    badges: [
      {
        badgeClass: "plataforma-badge plataforma-badge--x-activo sd-badge-legend",
        label: "𝕏",
        tip: "X: Activo (< 30 días)",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--x-inactivo sd-badge-legend",
        label: "𝕏",
        tip: "X: Inactivo",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--x-vacio sd-badge-legend",
        label: "𝕏",
        tip: "X: Sin cuenta",
      },
    ],
  },
  {
    name: "Bluesky",
    key: "b",
    badges: [
      {
        badgeClass: "plataforma-badge plataforma-badge--bluesky-eurosky sd-badge-legend",
        label: "B",
        tip: "Eurosky: En servidor / nodo europeo",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--bluesky-activo sd-badge-legend",
        label: "B",
        tip: "Bluesky: Activo (< 30 días)",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--bluesky-inactivo sd-badge-legend",
        label: "B",
        tip: "Bluesky: Inactivo",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--bluesky-vacio sd-badge-legend",
        label: "B",
        tip: "Bluesky: Sin cuenta",
      },
    ],
  },
  {
    name: "Mastodon",
    key: "m",
    badges: [
      {
        badgeClass: "plataforma-badge plataforma-badge--mastodon-activo sd-badge-legend",
        label: "M",
        tip: "Mastodon: Activo (< 30 días)",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--mastodon-inactivo sd-badge-legend",
        label: "M",
        tip: "Mastodon: Inactivo",
      },
      {
        badgeClass: "plataforma-badge plataforma-badge--mastodon-vacio sd-badge-legend",
        label: "M",
        tip: "Mastodon: Sin cuenta",
      },
    ],
  },
];

function badgeProps(item: any, platform: "twitter" | "bluesky" | "mastodon") {
  if (platform === "twitter") {
    const state: BadgeState = !item.twitter ? "off" : item.twitter_activo ? "on" : "soft";
    return { state, platformKey: "x" as const, label: "𝕏",
      tip: !item.twitter ? "Sin cuenta en X" : item.twitter_activo ? `@${item.twitter} · activo` : `@${item.twitter} · inactivo`,
      href: item.twitter ? `https://x.com/${item.twitter}` : undefined };
  }
  if (platform === "bluesky") {
    const isEurosky = !!item.bluesky && !!item.bluesky_eurosky;
    const state: BadgeState = !item.bluesky ? "off" : item.bluesky_activo ? "on" : "soft";
    return { state, platformKey: "b" as const, label: "B", isEurosky,
      tip: !item.bluesky ? "Sin cuenta en Bluesky" : isEurosky ? `${item.bluesky} · Eurosky (nodo europeo)` : item.bluesky_activo ? `${item.bluesky} · activo` : `${item.bluesky} · inactivo`,
      href: item.bluesky ? `https://bsky.app/profile/${item.bluesky}` : undefined };
  }
  const state: BadgeState = !item.mastodon ? "off" : item.mastodon_activo ? "on" : "soft";
  return { state, platformKey: "m" as const, label: "M",
    tip: !item.mastodon ? "Sin cuenta en Mastodon" : item.mastodon_activo ? `${item.mastodon} · activo` : `${item.mastodon} · inactivo`,
    href: mastodonHref(item.mastodon) };
}

const PlatformBadge = ({ label, href, state, platformKey, isEurosky, tip }: {
  label: string; href?: string; state: BadgeState; platformKey: "x" | "b" | "m"; isEurosky?: boolean; tip: string;
}) => {
  const badgeClass = isEurosky && state !== "off"
    ? `plataforma-badge plataforma-badge--bluesky-eurosky${state === "soft" ? " plataforma-badge--eurosky-inactivo" : ""}`
    : getBadgeClass(state, platformKey);
  const inner = href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${badgeClass} hover:opacity-70`} data-lp-tip={tip}>{label}</a>
    : <span className={badgeClass} data-lp-tip={tip}>{label}</span>;
  return inner;
};

// ── Tarjeta móvil ──────────────────────────────────────────────────────────

const MobileCard = ({ item }: { item: any }) => (
  <div className="sd-card rounded border border-border/40 bg-background p-3 text-left">
    <div className="sd-card-name">{item.nombre}</div>
    {item.detalle && (
      <div className="sd-card-detail">{item.categoria} · {item.grupoShort ?? item.detalle}</div>
    )}
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-3">
      <div className="flex items-center gap-1.5">
        {(["twitter", "bluesky", "mastodon"] as const).map((key) => (
          <PlatformBadge key={key} {...badgeProps(item, key)} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <JoinRequestButton item={item} />
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
  const isFirstRender = useRef(true);
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

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY,
          behavior: "smooth",
        });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("resize", updateScrollIndicators);
      el.removeEventListener("scroll", updateScrollIndicators);
      el.removeEventListener("wheel", onWheel);
    };
  }, [items]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[aria-selected="true"]');
    if (activeBtn) {
      const btnRect = activeBtn.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetLeft = el.scrollLeft + (btnRect.left - elRect.left) - (elRect.width / 2) + (btnRect.width / 2);
      el.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
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

// El detalle («Ministerio») no aporta nada si el propio nombre ya lo dice («Ministerio de Defensa»)
const sinTildes = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const repiteNombre = (nombre: string, detalle: string) => sinTildes(nombre).includes(sinTildes(detalle));

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
  const [quickFilter,   setQuickFilter]   = useState<"all" | "bsky" | "mastodon" | "sin-alt" | "fuera-x">("all");
  const [sortColumn,    setSortColumn]    = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [stats,         setStats]         = useState(initialStats);
  const [statsVersion,  setStatsVersion]  = useState(0);
  const [grupoFilter,   setGrupoFilter]   = useState<string | null>(null);
  const [visibleCount,  setVisibleCount]  = useState(100);
  const statsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    let source = searchQuery ? allData : grupoFilteredData;

    if (quickFilter === "bsky") {
      source = source.filter((item) => !!item.bluesky);
    } else if (quickFilter === "mastodon") {
      source = source.filter((item) => !!item.mastodon);
    } else if (quickFilter === "sin-alt") {
      source = source.filter((item) => item.twitter && !item.bluesky && !item.mastodon);
    } else if (quickFilter === "fuera-x") {
      source = source.filter((item) => !item.twitter_activo);
    }

    if (!searchQuery) return source;
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const tokens = norm(searchQuery).split(/\s+/).filter(Boolean);
    const haystack = (item: any) =>
      [item.nombre, item.detalle, item.categoria].filter(Boolean).map(norm).join(" ");
    return source.filter((item) => {
      const h = haystack(item);
      return tokens.every((t) => h.includes(t));
    });
  }, [grupoFilteredData, allData, searchQuery, quickFilter]);

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

  useEffect(() => { setGrupoFilter(null); setQuickFilter("all"); }, [activeTab]);
  useEffect(() => { setVisibleCount(100); }, [activeTab, searchQuery, grupoFilter, quickFilter, sortColumn, sortDirection]);

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
      ? sortDirection === "asc" ? <Icono nombre="chevron-up" tam={12} className="inline ml-0.5" /> : <Icono nombre="chevron-down" tam={12} className="inline ml-0.5" />
      : <span className="opacity-30 text-[10px] ml-0.5">↕</span>;

  const detalleLabel = DETALLE_LABEL[activeTab] ?? "Detalle";
  const activeLabel = TABS.find(t => t.value === activeTab)?.label ?? "Total";
  const isFiltered = searchQuery.trim().length > 0 || quickFilter !== "all" || !!grupoFilter;

  // Estadísticas calculadas sobre los filtros actualmente aplicados
  const filterAppliedStats = useMemo(() => {
    return calculateStats(filteredData);
  }, [filteredData]);

  const fTotal = filteredData.length;
  const fBase  = fTotal - filterAppliedStats.sinNinguna;
  const fPctX   = fBase > 0 ? Math.round((filterAppliedStats.enX            / fBase) * 100) : 0;
  const fPctB   = fBase > 0 ? Math.round((filterAppliedStats.conBluesky    / fBase) * 100) : 0;
  const fPctM   = fBase > 0 ? Math.round((filterAppliedStats.conMastodon   / fBase) * 100) : 0;
  const fPctSin = fBase > 0 ? Math.round((filterAppliedStats.sinAlternativa / fBase) * 100) : 0;

  return (
    <>
      <div className="sd-app w-full">

        {/* ── 1. Selector de categoría ─────────────────────────── */}
        <div className="sd-tabs-wrap max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 pt-4 pb-2">
          <CategoryTabs items={TABS} active={activeTab} onSelect={setActiveTab} />
        </div>

        {/* ── 3. Barra unificada: Buscador + Filtros rápidos interactivos ── */}
        <div className="sd-toolbar-wrap max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 pt-3 pb-4">
          <div className="sd-toolbar">
            <div className="sd-search-bar">
              <Icono nombre="search" tam={16} className="sd-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                placeholder="Buscar entidad, ministerio, partido…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="sd-search-input"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="sd-search-clear"
                  aria-label="Limpiar búsqueda"
                >
                  ✕
                </button>
              ) : (
                <span className="sd-search-shortcut hidden sm:inline">⌘ K</span>
              )}
            </div>

            <div className="sd-quick-filters" role="group" aria-label="Filtros rápidos">
              <button
                type="button"
                className={`lp-chip ${quickFilter === "all" ? "is-active" : ""}`}
                onClick={() => setQuickFilter("all")}
              >
                Todas
              </button>
              <button
                type="button"
                className={`lp-chip ${quickFilter === "bsky" ? "is-active sd-filter-chip--sky" : ""}`}
                onClick={() => setQuickFilter(f => f === "bsky" ? "all" : "bsky")}
              >
                <span className="sd-dot sd-dot--sky" />
                Con Bluesky
              </button>
              <button
                type="button"
                className={`lp-chip ${quickFilter === "mastodon" ? "is-active sd-filter-chip--mastodon" : ""}`}
                onClick={() => setQuickFilter(f => f === "mastodon" ? "all" : "mastodon")}
              >
                <span className="sd-dot sd-dot--mastodon" />
                Con Mastodon
              </button>
              <button
                type="button"
                className={`lp-chip ${quickFilter === "sin-alt" ? "is-active sd-filter-chip--alert" : ""}`}
                onClick={() => setQuickFilter(f => f === "sin-alt" ? "all" : "sin-alt")}
              >
                <span className="sd-dot sd-dot--alert" />
                Sin alternativa
              </button>
              <button
                type="button"
                className={`lp-chip ${quickFilter === "fuera-x" ? "is-active" : ""}`}
                onClick={() => setQuickFilter(f => f === "fuera-x" ? "all" : "fuera-x")}
              >
                Fuera de X
              </button>
            </div>
          </div>
        </div>

        {/* ── Resultados ───────────────────────────────────────── */}
        <div className="sd-results">

          {/* Móvil */}
          <div className="sd-cards md:hidden max-w-screen-xl mx-auto px-4 sm:px-8 pt-2">
            <details className="sd-mobile-legend-details mb-3">
              <summary className="sd-mobile-legend-summary">
                <span>Leyenda de estados y logos</span>
                <Icono nombre="chevron-down" tam={14} className="inline ml-1" />
              </summary>
              <div className="sd-mobile-legend-content pt-2 pb-1 space-y-2 text-xs">
                <div className="flex items-center gap-3.5 flex-wrap">
                  {LEGEND_GROUPS.map((group) => (
                    <div key={group.key} className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-muted-foreground mr-0.5">{group.name}:</span>
                      <div className="flex items-center gap-0.5">
                        {group.badges.map((b, bIdx) => (
                          <span key={bIdx} className={b.badgeClass} title={b.tip}>{b.label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </details>

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
              <div className="lp-vacio">
                <p className="lp-vacio-titulo">Sin resultados{searchQuery ? <> para <strong>"{searchQuery}"</strong></> : ""}</p>
              </div>
            )}
          </div>

          {/* Escritorio */}
          <div className="sd-table-wrap hidden md:block max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="sd-table-frame">
              <div className="sd-table-topbar">
                <span className="sd-table-count">
                  <strong>{sortedData.length}</strong> {sortedData.length === 1 ? "entidad" : "entidades"}
                  {(quickFilter !== "all" || searchQuery || grupoFilter) && (
                    <span className="sd-table-count-sub"> (de {searchQuery ? allData.length : grupoFilteredData.length})</span>
                  )}
                </span>

                <div className="sd-table-legend-complete hidden md:flex items-center gap-3.5 flex-wrap">
                  {LEGEND_GROUPS.map((group) => (
                    <div key={group.key} className="flex items-center gap-1">
                      <span className="font-mono text-[10.5px] text-muted-foreground mr-0.5">{group.name}:</span>
                      <div className="flex items-center gap-0.5">
                        {group.badges.map((b, bIdx) => (
                          <span key={bIdx} className={`${b.badgeClass} cursor-help`} data-lp-tip={b.tip}>{b.label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div data-slot="table-container" className="relative w-full overflow-x-auto"><table className="sd-table w-full caption-bottom text-sm">
                <thead>
                  <tr className="hover:bg-muted/50 border-b transition-colors">
                    <th className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap sd-table-header sd-col-name" onClick={() => handleSort("nombre")}>
                      Nombre <SortIcon col="nombre" />
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap sd-table-header sd-col-detail hidden lg:table-cell"
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
                          <Icono nombre="chevron-down" tam={14} className={`sd-col-select-icon${grupoFilter ? " sd-col-select-icon--active" : ""}`} />
                        </span>
                      ) : (
                        <>{detalleLabel} <SortIcon col="detalle" /></>
                      )}
                    </th>
                    {(["twitter", "bluesky", "mastodon"] as const).map((key) => (
                      <th key={key} className="h-10 px-2 align-middle font-medium whitespace-nowrap sd-table-header sd-col-platform" onClick={() => handleSort(key)} data-lp-tip={key === "twitter" ? "X (Twitter): cuenta y actividad en los últimos 30 días" : key === "bluesky" ? "Bluesky: cuenta y actividad en los últimos 30 días" : "Mastodon: cuenta y actividad en los últimos 30 días"} aria-label={key === "twitter" ? "X (Twitter)" : key === "bluesky" ? "Bluesky" : "Mastodon"}>
                        {key === "twitter" ? "𝕏" : key === "bluesky" ? "B" : "M"} <SortIcon col={key} />
                      </th>
                    ))}
                    <th className="h-10 px-2 align-middle font-medium whitespace-nowrap sd-table-header sd-col-action text-right">Pedir migración</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length > 0 ? sortedData.slice(0, visibleCount).map((item, i) => (
                    <tr className="hover:bg-muted/50 border-b transition-colors" key={`${item.categoria}·${item.nombre}·${i}`} className="sd-data-row group">
                      <td className="p-2 align-middle whitespace-nowrap sd-cell-name">
                        <div className="sd-entity-name" translate="no">{item.nombre}</div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap sd-cell-detail hidden lg:table-cell">
                        {item.grupoShort ? (
                          <span className="sd-group-tag" data-lp-tip={item.grupoFull}>{item.grupoShort}</span>
                        ) : item.detalle && !repiteNombre(item.nombre, item.detalle) ? (
                          <div className="sd-entity-detail" translate="no" data-lp-tip={item.detalle}>{item.detalle}</div>
                        ) : null}
                      </td>
                      {(["twitter", "bluesky", "mastodon"] as const).map((key) => (
                        <td key={key} className="p-2 align-middle whitespace-nowrap sd-cell-platform">
                          <PlatformBadge {...badgeProps(item, key)} />
                        </td>
                      ))}
                      <td className="p-2 align-middle whitespace-nowrap sd-cell-action">
                        <div className="sd-cell-action-inner">
                          <JoinRequestButton item={item} />
                          <div className="sd-flag-outside">
                            <ReportButton item={item} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr className="hover:bg-muted/50 border-b transition-colors">
                      <td colSpan={6} className="p-2 align-middle whitespace-nowrap">
                        <div className="sd-empty-state">No se encontraron resultados</div>
                      </td>
                    </tr>
                  )}
                  {sortedData.length > visibleCount && (
                    <tr className="hover:bg-muted/50 border-b transition-colors">
                      <td colSpan={6} className="px-2 py-3 align-middle whitespace-nowrap text-center">
                        <button type="button" className="lp-btn lp-btn--outline lp-btn--sm"
                          onClick={() => setVisibleCount(c => c + 200)}>
                          Mostrar más ({visibleCount} de {sortedData.length})
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </div>
          </div>
        </div>

        {/* ── Barra fija inferior con estadísticas siempre visible ── */}
        <div className="sd-fixed-bottom-bar">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="sd-cat-strip sd-cat-strip--bottom-fixed">
              <div className="sd-cat-strip-info">
                <span className="sd-cat-strip-name">
                  {isFiltered ? "Filtros aplicados" : activeLabel}
                </span>
                <span className="sd-cat-strip-sep">·</span>
                <span className="sd-cat-strip-count">
                  <strong>{fTotal}</strong> {fTotal === 1 ? "entidad" : "entidades"}
                  {isFiltered && (
                    <span className="sd-cat-strip-sub"> (de {allData.length})</span>
                  )}
                </span>
              </div>

              <div ref={statsRef} className="sd-cat-strip-metrics sd-stats-reveal">
                <div className="sd-cat-metric" title={`${filterAppliedStats.enX} con actividad en X (< 30 días)`}>
                  <span className="sd-dot sd-dot--x" />
                  <span className="sd-cat-metric-name max-sm:hidden">En X:</span>
                  <span className="sd-cat-metric-pct">{fPctX}%</span>
                  <span className="sd-cat-metric-abs max-sm:hidden">({filterAppliedStats.enX})</span>
                </div>
                <div className="sd-cat-metric" title={`${filterAppliedStats.conBluesky} con cuenta en Bluesky`}>
                  <span className="sd-dot sd-dot--sky" />
                  <span className="sd-cat-metric-name max-sm:hidden">Bluesky:</span>
                  <span className="sd-cat-metric-pct">{fPctB}%</span>
                  <span className="sd-cat-metric-abs max-sm:hidden">({filterAppliedStats.conBluesky})</span>
                </div>
                <div className="sd-cat-metric" title={`${filterAppliedStats.conMastodon} con cuenta en Mastodon`}>
                  <span className="sd-dot sd-dot--mastodon" />
                  <span className="sd-cat-metric-name max-sm:hidden">Mastodon:</span>
                  <span className="sd-cat-metric-pct">{fPctM === 0 && filterAppliedStats.conMastodon > 0 ? "< 1" : fPctM}%</span>
                  <span className="sd-cat-metric-abs max-sm:hidden">({filterAppliedStats.conMastodon})</span>
                </div>
                <div className="sd-cat-metric sd-cat-metric--alert" title={`${filterAppliedStats.sinAlternativa} con presencia en X pero sin Bluesky ni Mastodon`}>
                  <span className="sd-dot sd-dot--alert" />
                  <span className="sd-cat-metric-name max-sm:hidden">Sin alternativa:</span>
                  <span className="sd-cat-metric-pct">{fPctSin}%</span>
                  <span className="sd-cat-metric-abs max-sm:hidden">({filterAppliedStats.sinAlternativa})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
