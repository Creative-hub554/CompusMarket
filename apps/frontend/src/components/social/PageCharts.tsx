"use client";

/**
 * Lightweight SVG bar chart — no external dependencies.
 * Used in the page analytics dashboard for follower growth, post frequency, etc.
 */
export function MiniBarChart({
  data,
  color = "#f59e0b",
  height = 80,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(4, Math.min(16, Math.floor(400 / Math.max(data.length, 1))));
  const gap = Math.max(1, Math.floor(barWidth * 0.3));
  const totalWidth = data.length * (barWidth + gap);
  const chartHeight = height - 20; // leave room for labels

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      aria-hidden="true"
    >
      {data.map((d, i) => {
        const barH = (d.value / max) * chartHeight;
        const x = i * (barWidth + gap);
        const y = chartHeight - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              fill={color}
              opacity={0.85}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {data.length <= 15 && (
              <text
                x={x + barWidth / 2}
                y={chartHeight + 12}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.4}
                className="dark:fill-slate-400"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Lightweight SVG multi-line chart — no external dependencies.
 * Renders multiple data series as smoothed paths.
 */
export function MultiLineChart({
  data,
  height = 80,
}: {
  data: {
    label: string;
    lines: { value: number; color: string; label: string }[];
  }[];
  height?: number;
}) {
  if (data.length === 0) return null;

  const allValues = data.flatMap((d) => d.lines.map((l) => l.value));
  const max = Math.max(...allValues, 1);
  const chartHeight = height - 10;
  const chartWidth = 400;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const lineColors = data[0]?.lines.map((l) => ({ color: l.color, label: l.label })) ?? [];

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${chartWidth} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      aria-hidden="true"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1={0}
          y1={chartHeight * (1 - pct)}
          x2={chartWidth}
          y2={chartHeight * (1 - pct)}
          stroke="currentColor"
          opacity={0.06}
          strokeDasharray="4,4"
        />
      ))}

      {/* Lines */}
      {lineColors.map((lc, lineIdx) => {
        const points = data.map((d, i) => {
          const val = d.lines[lineIdx]?.value ?? 0;
          const x = i * stepX;
          const y = chartHeight - (val / max) * chartHeight;
          return `${x},${y}`;
        });
        return (
          <polyline
            key={lineIdx}
            points={points.join(" ")}
            fill="none"
            stroke={lc.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        );
      })}

      {/* Dots */}
      {lineColors.map((lc, lineIdx) =>
        data.map((d, i) => {
          const val = d.lines[lineIdx]?.value ?? 0;
          const x = i * stepX;
          const y = chartHeight - (val / max) * chartHeight;
          return (
            <circle key={`${lineIdx}-${i}`} cx={x} cy={y} r={2} fill={lc.color} opacity={0.9}>
              <title>{`${d.label} ${lc.label}: ${val}`}</title>
            </circle>
          );
        }),
      )}

      {/* Legend */}
      {lineColors.map((lc, i) => (
        <g key={i}>
          <rect x={i * 90} y={chartHeight + 2} width={8} height={8} rx={2} fill={lc.color} />
          <text x={i * 90 + 12} y={chartHeight + 9} fontSize={8} fill="currentColor" opacity={0.5}>
            {lc.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
