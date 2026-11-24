import React, { useEffect, useMemo, useState } from 'react';

interface ConfettiBurstProps {
  triggerKey: number;
  /** 'board' covers the containing relative board surface; 'viewport' covers the full screen */
  scope?: 'viewport' | 'board';
  particleCount?: number;
}

interface ConfettiPiece {
  id: number;
  leftPct: number;
  topPct: number;
  delayMs: number;
  durationMs: number;
  driftPx: number;
  swayPx: number;
  rotateDeg: number;
  widthPx: number;
  heightPx: number;
  color: string;
  shape: 'ribbon' | 'square' | 'circle' | 'diamond';
}

const CONFETTI_COLORS = [
  '#176B52', // Forest Pine
  '#2EB88A', // Luminous Emerald
  '#F59E0B', // Warm Gold
  '#D97706', // Deep Amber
  '#1E4E79', // Maritime Blue
  '#E11D48', // Editorial Crimson
  '#0F766E', // Deep Teal
];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  triggerKey,
  scope = 'viewport',
  particleCount,
}) => {
  const [visible, setVisible] = useState(false);

  const count = particleCount ?? (scope === 'board' ? 68 : 72);

  const pieces = useMemo<ConfettiPiece[]>(() => {
    if (triggerKey <= 0) return [];
    const shapes: ConfettiPiece['shape'][] = [
      'ribbon',
      'square',
      'circle',
      'diamond',
    ];
    return Array.from({ length: count }, (_, i) => {
      const seed = (i * 9301 + triggerKey * 49297 + (scope === 'board' ? 7919 : 0)) % 233280;
      const r1 = (seed % 1000) / 1000;
      const r2 = ((seed * 7 + 13) % 1000) / 1000;
      const r3 = ((seed * 17 + 31) % 1000) / 1000;
      const r4 = ((seed * 29 + 53) % 1000) / 1000;
      const shape = shapes[i % shapes.length];

      // Stratified horizontal coverage so confetti spans the entire board edge to edge
      const bucketPct = ((i + 0.2 + r1 * 0.6) / count) * 96 + 2;

      return {
        id: i,
        leftPct: Math.min(98, Math.max(2, bucketPct)),
        topPct: scope === 'board' ? -4 + r4 * 22 : -4 + r4 * 8,
        delayMs: Math.round(r2 * 520),
        durationMs: (scope === 'board' ? 1850 : 2300) + Math.round(r3 * 1150),
        driftPx: Math.round((r2 - 0.5) * (scope === 'board' ? 120 : 200)),
        swayPx: Math.round((r4 - 0.5) * 44),
        rotateDeg: Math.round((r1 >= 0.5 ? 1 : -1) * (420 + r3 * 540)),
        widthPx:
          shape === 'ribbon'
            ? 11
            : shape === 'circle'
            ? 8
            : shape === 'diamond'
            ? 8
            : 9,
        heightPx:
          shape === 'ribbon'
            ? 5
            : shape === 'circle'
            ? 8
            : shape === 'diamond'
            ? 8
            : 9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape,
      };
    });
  }, [triggerKey, scope, count]);

  useEffect(() => {
    if (triggerKey <= 0) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 3900);
    return () => window.clearTimeout(timer);
  }, [triggerKey]);

  if (!visible || pieces.length === 0) return null;

  const isBoard = scope === 'board';

  return (
    <div
      aria-hidden="true"
      className={
        isBoard
          ? 'pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl'
          : 'pointer-events-none fixed inset-0 z-[60] overflow-hidden'
      }
    >
      {pieces.map((p) => {
        const borderRadius =
          p.shape === 'circle'
            ? '9999px'
            : p.shape === 'diamond'
            ? '2px'
            : '2px';

        return (
          <span
            key={`${scope}-${triggerKey}-${p.id}`}
            className="lexiloom-confetti-piece absolute block will-change-transform"
            style={
              {
                left: `${p.leftPct}%`,
                top: `${p.topPct}%`,
                width: `${p.widthPx}px`,
                height: `${p.heightPx}px`,
                backgroundColor: p.color,
                borderRadius,
                clipPath:
                  p.shape === 'diamond'
                    ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                    : undefined,
                animationDelay: `${p.delayMs}ms`,
                animationDuration: `${p.durationMs}ms`,
                '--confetti-drift': `${p.driftPx}px`,
                '--confetti-sway': `${p.swayPx}px`,
                '--confetti-rot': `${p.rotateDeg}deg`,
                '--confetti-mid-y': isBoard ? '220px' : '44vh',
                '--confetti-late-y': isBoard ? '420px' : '82vh',
                '--confetti-end-y': isBoard ? '580px' : '108vh',
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
};
