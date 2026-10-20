"use client";

interface ResumenBarProps {
  total: number;
  ok: number;
  f: number;
  j: number;
  l: number;
}

export function ResumenBar({ total, ok, f, j, l }: ResumenBarProps) {
  if (total === 0) return null;

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Resumen</span>
        <span className="text-muted-foreground">{total} jugadores</span>
      </div>

      <div className="mb-2 flex h-3 overflow-hidden rounded-full">
        {ok > 0 && (
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${pct(ok)}%` }}
          />
        )}
        {j > 0 && (
          <div
            className="bg-yellow-500 transition-all"
            style={{ width: `${pct(j)}%` }}
          />
        )}
        {l > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${pct(l)}%` }}
          />
        )}
        {f > 0 && (
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${pct(f)}%` }}
          />
        )}
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          OK: {ok}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          F: {f}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          J: {j}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          L: {l}
        </span>
      </div>
    </div>
  );
}
