import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  computePerformanceMetrics,
  formatPerformanceTime,
  loadPuzzleAttempts,
  subscribeAttemptsChanged,
  type PuzzleAttemptRecord,
} from '../lib/performanceStats';

interface PerformanceDashboardProps {
  onPlayDaily?: () => void;
}

type ChartMetric = 'time' | 'score';

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  onPlayDaily,
}) => {
  const { profile, completions } = useGame();
  const [attempts, setAttempts] = useState<PuzzleAttemptRecord[]>(() =>
    loadPuzzleAttempts()
  );
  const [chartMetric, setChartMetric] = useState<ChartMetric>('time');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setAttempts(loadPuzzleAttempts());
    return subscribeAttemptsChanged(sync);
  }, []);

  const metrics = useMemo(
    () => computePerformanceMetrics(completions, profile, attempts),
    [completions, profile, attempts]
  );

  const maxModeSolved = useMemo(
    () => Math.max(1, ...metrics.modeBreakdown.map((m) => m.solved)),
    [metrics.modeBreakdown]
  );

  // SVG chart dimensions
  const chartW = 640;
  const chartH = 220;
  const padTop = 24;
  const padRight = 18;
  const padBottom = 34;
  const padLeft = 48;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  const trendPoints = metrics.recentTrend;
  const activePoint =
    hoveredIdx !== null && trendPoints[hoveredIdx]
      ? trendPoints[hoveredIdx]
      : trendPoints.length > 0
      ? trendPoints[trendPoints.length - 1]
      : null;

  const yValues = trendPoints.map((pt) =>
    chartMetric === 'time' ? pt.durationSeconds : pt.score
  );
  const rawMax = yValues.length > 0 ? Math.max(...yValues, 1) : 100;
  const yMax =
    chartMetric === 'time'
      ? Math.max(30, Math.ceil(rawMax / 30) * 30)
      : Math.max(200, Math.ceil(rawMax / 200) * 200);

  const avgValue =
    chartMetric === 'time' ? metrics.avgTimeSeconds : metrics.avgScore;
  const avgY =
    avgValue !== null
      ? padTop + innerH - Math.min(1, avgValue / yMax) * innerH
      : null;

  const yTicks = [0, 0.5, 1].map((ratio) => {
    const val = Math.round(yMax * ratio);
    const y = padTop + innerH - ratio * innerH;
    return {
      val,
      y,
      label:
        chartMetric === 'time'
          ? formatPerformanceTime(val)
          : val.toLocaleString(),
    };
  });

  return (
    <div className="space-y-8">
      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1.5">
          <div className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
            Win Rate
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#176B52] dark:text-[#2EB88A]">
            {metrics.winRatePct !== null ? `${metrics.winRatePct}%` : '—'}
          </div>
          <div className="text-xs text-[#52606D] dark:text-[#94A3B8] font-mono tabular-nums">
            {metrics.totalAttempted > 0
              ? `${metrics.totalSolved} won · ${metrics.totalAttempted} played`
              : 'No puzzles played yet'}
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1.5">
          <div className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
            Avg. Time per Puzzle
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
            {formatPerformanceTime(metrics.avgTimeSeconds)}
          </div>
          <div className="text-xs text-[#52606D] dark:text-[#94A3B8] font-mono tabular-nums">
            {metrics.fastestTimeSeconds !== null
              ? `Personal fastest ${formatPerformanceTime(
                  metrics.fastestTimeSeconds
                )}`
              : 'Solve a puzzle to record speed'}
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1.5">
          <div className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
            Total Puzzles Solved
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
            {metrics.totalSolved.toLocaleString()}
          </div>
          <div className="text-xs text-[#52606D] dark:text-[#94A3B8] font-mono tabular-nums">
            {metrics.totalWordsFound > 0
              ? `${metrics.totalWordsFound.toLocaleString()} words uncovered`
              : 'Ready for your first win'}
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1.5">
          <div className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
            Streak & Precision
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[#9A5B13] dark:text-[#F59E0B]">
            {metrics.bestStreak}d
          </div>
          <div className="text-xs text-[#52606D] dark:text-[#94A3B8] font-mono tabular-nums">
            Current {metrics.currentStreak}d
            {metrics.hintFreeRatePct !== null
              ? ` · ${metrics.hintFreeRatePct}% no-hint`
              : ''}
          </div>
        </div>
      </div>

      {/* Main Analytics Split: Recent Trend Chart + Mode Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Solve Time & Score Chart */}
        <div className="lg:col-span-7 rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex flex-col justify-between gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-editorial text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                Recent Puzzle Performance
              </h2>
              <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                {trendPoints.length > 0
                  ? `Showing your last ${trendPoints.length} solved ${
                      trendPoints.length === 1 ? 'puzzle' : 'puzzles'
                    } against your overall average`
                  : 'Your solve times and scores will plot here as you complete puzzles'}
              </p>
            </div>

            <div
              role="group"
              aria-label="Chart metric"
              className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#263342]"
            >
              <button
                type="button"
                onClick={() => setChartMetric('time')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartMetric === 'time'
                    ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                    : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                }`}
              >
                Solve Time
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('score')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartMetric === 'score'
                    ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                    : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                }`}
              >
                Score
              </button>
            </div>
          </div>

          {trendPoints.length === 0 ? (
            <div className="py-10 px-4 text-center border border-dashed border-[#D4DDD6] dark:border-[#2A3849] rounded-xl space-y-3">
              <p className="text-sm font-medium text-[#131B23] dark:text-[#F1F5F9]">
                No completed puzzle sessions yet
              </p>
              <p className="text-xs text-[#52606D] dark:text-[#94A3B8] max-w-sm mx-auto">
                Finish today&apos;s Daily Challenge or any Word Game to unlock
                your solve-time trend, win-rate tracker, and mode breakdown.
              </p>
              {onPlayDaily && (
                <button
                  type="button"
                  onClick={onPlayDaily}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Play Today&apos;s Daily Puzzle</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Bar Inspection Strip */}
              {activePoint && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#ECEFEA] dark:border-[#223040] text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                      {activePoint.fullTitle}
                    </span>
                    <span className="text-[#52606D] dark:text-[#94A3B8]">
                      {' '}
                      · {activePoint.modeCategory}
                      {activePoint.dateLabel ? ` · ${activePoint.dateLabel}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums text-[#131B23] dark:text-[#E2E8F0] shrink-0">
                    <span>
                      Time{' '}
                      <strong>
                        {formatPerformanceTime(activePoint.durationSeconds)}
                      </strong>
                    </span>
                    <span aria-hidden="true" className="text-[#94A3B8]">
                      ·
                    </span>
                    <span className="text-[#176B52] dark:text-[#2EB88A]">
                      <strong>{activePoint.score.toLocaleString()}</strong> pts
                    </span>
                    <span aria-hidden="true" className="text-[#94A3B8]">
                      ·
                    </span>
                    <span>{activePoint.hintsUsed} hints</span>
                  </div>
                </div>
              )}

              {/* Responsive SVG Bar Chart */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  role="img"
                  aria-label={
                    chartMetric === 'time'
                      ? 'Bar chart of solve time across recent completed puzzles'
                      : 'Bar chart of score across recent completed puzzles'
                  }
                  className="w-full h-auto min-w-[420px]"
                >
                  {/* Horizontal Gridlines & Y-Axis Ticks */}
                  {yTicks.map((tick) => (
                    <g key={tick.val}>
                      <line
                        x1={padLeft}
                        y1={tick.y}
                        x2={chartW - padRight}
                        y2={tick.y}
                        className="stroke-[#E6EAE5] dark:stroke-[#243242]"
                        strokeWidth={1}
                      />
                      <text
                        x={padLeft - 8}
                        y={tick.y + 4}
                        textAnchor="end"
                        className="fill-[#52606D] dark:fill-[#94A3B8] font-mono text-[11px]"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {/* Bars */}
                  {trendPoints.map((pt, idx) => {
                    const count = trendPoints.length;
                    const slotW = innerW / Math.max(count, 1);
                    const barW = Math.min(40, Math.max(14, slotW * 0.54));
                    const cx = padLeft + slotW * idx + slotW / 2;
                    const val =
                      chartMetric === 'time' ? pt.durationSeconds : pt.score;
                    const ratio = Math.min(1, Math.max(0.04, val / yMax));
                    const barH = Math.max(4, ratio * innerH);
                    const x = cx - barW / 2;
                    const y = padTop + innerH - barH;
                    const isFocused =
                      hoveredIdx === idx ||
                      (hoveredIdx === null && idx === trendPoints.length - 1);

                    return (
                      <g
                        key={pt.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`${pt.fullTitle}, time ${formatPerformanceTime(
                          pt.durationSeconds
                        )}, score ${pt.score} points`}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onFocus={() => setHoveredIdx(idx)}
                        onBlur={() => setHoveredIdx(null)}
                        className="cursor-pointer outline-none"
                      >
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={barH}
                          rx={6}
                          className={`transition-opacity duration-150 ${
                            isFocused
                              ? 'fill-[#176B52] dark:fill-[#2EB88A]'
                              : 'fill-[#176B52]/45 dark:fill-[#2EB88A]/45 hover:fill-[#176B52]/80 dark:hover:fill-[#2EB88A]/80'
                          }`}
                        />
                        <text
                          x={cx}
                          y={chartH - 10}
                          textAnchor="middle"
                          className={`font-mono text-[10px] ${
                            isFocused
                              ? 'fill-[#131B23] dark:fill-[#F1F5F9] font-semibold'
                              : 'fill-[#52606D] dark:fill-[#94A3B8]'
                          }`}
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dashed Average Reference Line */}
                  {avgY !== null && avgValue !== null && (
                    <g pointerEvents="none">
                      <line
                        x1={padLeft}
                        y1={avgY}
                        x2={chartW - padRight}
                        y2={avgY}
                        className="stroke-[#B45309] dark:stroke-[#F59E0B]"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartW - padRight}
                        y={Math.max(14, avgY - 6)}
                        textAnchor="end"
                        className="fill-[#9A5B13] dark:fill-[#F59E0B] font-mono text-[10px] font-semibold"
                      >
                        Avg{' '}
                        {chartMetric === 'time'
                          ? formatPerformanceTime(avgValue)
                          : `${avgValue.toLocaleString()} pts`}
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Right: Performance by Game Mode */}
        <div className="lg:col-span-5 rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex flex-col justify-between gap-5">
          <div className="space-y-1">
            <h2 className="font-editorial text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
              Breakdown by Game Mode
            </h2>
            <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
              Puzzles solved, average pace, and win rate across every LexiLoom
              mode
            </p>
          </div>

          <div className="space-y-4">
            {metrics.modeBreakdown.map((item) => {
              const barPct =
                item.solved > 0
                  ? Math.max(8, Math.round((item.solved / maxModeSolved) * 100))
                  : 0;
              return (
                <div key={item.modeCategory} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                      {item.modeCategory}
                    </span>
                    <span className="font-mono tabular-nums text-[#52606D] dark:text-[#94A3B8]">
                      <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                        {item.solved}
                      </strong>{' '}
                      solved
                      {item.avgTimeSeconds !== null
                        ? ` · Avg ${formatPerformanceTime(item.avgTimeSeconds)}`
                        : ''}
                      {item.winRatePct !== null
                        ? ` · ${item.winRatePct}% win`
                        : ''}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#ECEFEA] dark:bg-[#0F1721] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#176B52] dark:bg-[#2EB88A] transition-all duration-300"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#ECEFEA] dark:border-[#223040] flex items-center justify-between text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span>Average Score</span>
            <span className="font-mono tabular-nums font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              {metrics.avgScore !== null
                ? `${metrics.avgScore.toLocaleString()} pts`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
