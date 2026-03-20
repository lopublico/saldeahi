import { useState, useEffect } from "react";
import { Mainbar } from "@/components/Mainbar";
import { Info } from "lucide-react";

interface MainbarWrapperProps {
  initialStats: {
    enX: number;
    fueraDeX: number;
    mastodon: number;
    bluesky: number;
    sinAlternativa: number;
  };
}

export function MainbarWrapper({ initialStats }: MainbarWrapperProps) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const handleStatsChange = (e: any) => setStats(e.detail);
    window.addEventListener('stats-change', handleStatsChange);
    return () => window.removeEventListener('stats-change', handleStatsChange);
  }, []);

  const totalX = stats.enX + stats.fueraDeX;
  const totalFed = stats.mastodon + stats.bluesky + stats.sinAlternativa;

  return (
    <div className="space-y-3 w-full">

      {/* Barra 1: Estado en X */}
      <div className="w-full">
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
          height={10}
          roundedClass="rounded-sm"
          showCounts
        />
      </div>

      {/* Barra 2: Alternativas federadas */}
      <div className="w-full">
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
          height={10}
          roundedClass="rounded-sm"
          showCounts
        />
      </div>

    </div>
  );
}
