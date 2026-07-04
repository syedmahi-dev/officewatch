import { useEffect, useState } from 'react';
import { useDataLayer } from './hooks/useDataLayer';
import { PowerMeter } from './components/PowerMeter';
import { AlertsPanel } from './components/AlertsPanel';
import { DeviceStatusPanel } from './components/DeviceStatusPanel';
import {
  Activity,
  Bell,
  Lightbulb,
  Moon,
  RefreshCw,
  Sun,
  WifiOff,
} from 'lucide-react';

const THEME_STORAGE_KEY = 'officewatch-theme';
const KNOWN_ROOM_COUNT = 3;

export default function App() {
  const [wsUrl, setWsUrl] = useState('');
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? 'dark';
  });

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
      const host = backendUrl.replace(/^https?:\/\//, '');
      setWsUrl(`${wsProtocol}//${host}/ws`);
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      setWsUrl(`${protocol}//${window.location.host}/ws`);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const {
    devices,
    alerts,
    usage,
    isConnected,
    hasInitialData,
    backendHealthy,
  } = useDataLayer(wsUrl || 'ws://localhost:3000/ws');

  const isDark = theme === 'dark';
  const totalDevices = devices.length;
  const activeDevices = devices.filter((device) => device.status === 'on').length;
  const activeRooms = new Set(
    devices.filter((device) => device.status === 'on').map((device) => device.room),
  ).size;

  const summaryCards = [
    {
      label: 'Devices on',
      value: totalDevices === 0 ? '0' : `${activeDevices}/${totalDevices}`,
      icon: Lightbulb,
    },
    {
      label: 'Rooms active',
      value: `${activeRooms}/${KNOWN_ROOM_COUNT}`,
      icon: Activity,
    },
    {
      label: 'Open alerts',
      value: `${alerts.length}`,
      icon: Bell,
    },
  ];

  if (!hasInitialData) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--page-bg)] px-4 py-4 text-[var(--text-primary)] md:px-8 md:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_38%),radial-gradient(circle_at_top_right,var(--glow-secondary),transparent_30%)]"
        />
        <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] max-w-7xl flex-col justify-center gap-6">
          <div className="overflow-hidden rounded-[32px] border border-[var(--border-strong)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-xl md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-4">
                <div className="h-7 w-40 animate-pulse rounded-full bg-[var(--surface-soft)]" />
                <div className="space-y-3">
                  <div className="h-12 w-64 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
                  <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-[var(--surface-soft)]" />
                  <div className="h-4 w-full max-w-lg animate-pulse rounded-full bg-[var(--surface-soft)]" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-32 animate-pulse rounded-full bg-[var(--surface-soft)]" />
                <div className="h-10 w-28 animate-pulse rounded-full bg-[var(--surface-soft)]" />
                <div className="h-10 w-28 animate-pulse rounded-full bg-[var(--surface-soft)]" />
              </div>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4"
                >
                  <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  <div className="mt-4 h-9 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-[var(--surface-muted)]" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-6">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]"
                >
                  <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-soft)]" />
                  <div className="mt-6 h-14 w-40 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
                  <div className="mt-6 space-y-3">
                    <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-soft)]" />
                    <div className="h-3 w-11/12 animate-pulse rounded-full bg-[var(--surface-soft)]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]">
              <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--surface-soft)]" />
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4"
                  >
                    <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                    <div className="mt-4 h-10 w-full animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
                    <div className="mt-4 h-3 w-1/2 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Connecting to the OfficeWatch stream...
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                We are waiting for the live backend server to deliver the first snapshot.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--page-bg)] px-4 py-4 text-[var(--text-primary)] transition-colors md:px-8 md:py-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_top_right,var(--glow-secondary),transparent_28%)]"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-12rem] top-32 h-80 w-80 rounded-full bg-[var(--glow-primary)] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-[var(--border-strong)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium tracking-[0.12em] text-[var(--text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-strong)] shadow-[0_0_12px_rgba(48,210,135,0.55)]" />
                Live office energy monitor
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] md:text-5xl">
                    OfficeWatch
                  </h1>
                </div>
                <p className="max-w-2xl text-balance text-sm leading-6 text-[var(--text-secondary)] md:text-base md:leading-7">
                  Live status, power usage, and alerts for the full office.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] active:scale-[0.98]"
                  aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>

                {!backendHealthy && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200">
                    Backend degraded
                  </span>
                )}

                {!isConnected ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-100">
                    <WifiOff className="h-4 w-4" />
                    Reconnecting
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent-strong)] shadow-[0_0_10px_rgba(48,210,135,0.6)]" />
                    Live stream
                  </span>
                )}
              </div>

            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {summaryCards.map(({ label, value, icon: Icon }) => (
              <article
                key={label}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {label}
                    </p>
                    <p className="mt-3 font-numeric text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                      {value}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="space-y-6">
            <PowerMeter usage={usage} />
            <AlertsPanel alerts={alerts} />
          </div>
          <div>
            <DeviceStatusPanel devices={devices} isConnected={isConnected} />
          </div>
        </main>
      </div>
    </div>
  );
}
