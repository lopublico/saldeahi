import * as React from "react";
import { cn } from "@/lib/utils";

type Segment = {
  label: string;
  value: number;
  colorClass?: string;
};

type Props = {
  segments: Segment[];
  total?: number;
  height?: number;
  roundedClass?: string;
  ariaLabel?: string;
  className?: string;
  trackClassName?: string;
  showCounts?: boolean;
};

export function Mainbar({
  segments,
  total,
  height = 10,
  roundedClass = "rounded-sm",
  ariaLabel,
  className,
  trackClassName,
  showCounts = false,
}: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const sum = total ?? segments.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  const aria = ariaLabel ?? segments.map((s) => `${s.label}: ${s.value}`).join(", ");

  const defaultColors = [
    "bg-emerald-500",
    "bg-amber-500",
    "bg-red-500",
    "bg-slate-400",
  ];

  return (
    <div className={cn("w-full", className)}>
      {/* Track */}
      <div
        role="img"
        aria-label={aria}
        className={cn("w-full overflow-hidden bg-muted", roundedClass, trackClassName)}
        style={{ height }}
      >
        <div className="flex h-full gap-px">
          {segments.map((seg, i) => {
            const pct = sum > 0 ? (seg.value / sum) * 100 : 0;
            return (
              <div
                key={`${seg.label}-${i}`}
                className={cn(
                  "relative h-full transition-[width] ease-[cubic-bezier(.16,1,.3,1)]",
                  "first:rounded-l-[inherit] last:rounded-r-[inherit]",
                  seg.colorClass ?? defaultColors[i] ?? "bg-slate-400"
                )}
                aria-hidden="true"
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  transitionDuration: "700ms",
                  transitionDelay: `${80 * i}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {segments.map((seg, i) => {
          const pct = sum > 0 ? Math.round((seg.value / sum) * 100) : 0;
          const dotClass = seg.colorClass ?? defaultColors[i] ?? "bg-slate-400";
          return (
            <li key={`legend-${seg.label}-${i}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("inline-block size-2 rounded-[2px]", dotClass)} aria-hidden="true" />
              <span>{seg.label}</span>
              {showCounts && (
                <span className="tabular-nums font-medium text-foreground">{seg.value}</span>
              )}
              <span className="tabular-nums">({pct}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
