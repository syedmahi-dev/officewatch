import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Zap } from 'lucide-react';

export function PowerMeter({ usage }) {
  const wattsRef = useRef(null);
  const previousWatts = useRef(usage.totalWattsNow);

  useEffect(() => {
    if (!wattsRef.current) {
      return undefined;
    }

    const animatedValue = {
      value: previousWatts.current,
    };

    const tween = gsap.to(animatedValue, {
      value: usage.totalWattsNow,
      duration: 0.8,
      ease: 'power2.out',
      snap: { value: 1 },
      onUpdate: () => {
        if (!wattsRef.current) {
          return;
        }

        wattsRef.current.textContent = Math.round(animatedValue.value).toLocaleString();
      },
    });

    previousWatts.current = usage.totalWattsNow;

    return () => {
      tween.kill();
    };
  }, [usage.totalWattsNow]);

  const loadState = usage.totalWattsNow > 0 ? 'Load is active' : 'No active draw';

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="absolute -right-16 top-[-4rem] h-48 w-48 rounded-full bg-[rgba(34,211,238,0.15)] blur-3xl"
      />

      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">Power meter</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[24px] border border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-[var(--surface-soft)] to-transparent p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Current load
            </p>
            <div className="mt-4 flex items-end gap-3 font-numeric">
              <span
                ref={wattsRef}
                className="text-5xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] md:text-6xl"
              >
                {usage.totalWattsNow.toLocaleString()}
              </span>
              <span className="pb-2 text-lg font-medium text-emerald-300">W</span>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.18)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-strong)] shadow-[0_0_10px_rgba(48,210,135,0.6)]" />
              {loadState}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-[var(--surface-soft)] to-transparent p-5">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Estimated today</p>
              <p className="mt-3 font-numeric text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {usage.todayEstimatedKwh.toFixed(2)}
                <span className="ml-2 text-base font-medium text-cyan-300">kWh</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
