import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Bell, Clock } from 'lucide-react';

export function AlertsPanel({ alerts }) {
  const alertItems = Array.isArray(alerts) ? alerts : [];

  return (
    <section className="flex min-h-[320px] flex-col rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Alerts</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)]">
          <Bell className="h-4 w-4" />
          {alertItems.length === 0 ? 'All quiet' : `${alertItems.length} active`}
        </div>
      </div>

      <div className="relative mt-6 flex-1">
        <ul className="space-y-3">
          <AnimatePresence mode="popLayout">
            {alertItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-soft)] px-6 text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-base font-medium text-[var(--text-primary)]">
                  No active alerts right now
                </p>
              </motion.div>
            )}

            {alertItems.map((alert) => (
              <motion.li
                key={alert.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                className="rounded-[24px] border border-[var(--alert-border)] bg-[var(--alert-bg)] p-4 shadow-sm transition-all duration-200 hover:border-[var(--alert-border-hover)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--alert-icon-border)] bg-[var(--alert-icon-bg)] text-[var(--alert-icon-text)] shadow-sm">
                      {alert.type === 'after-hours' ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-6 text-[var(--text-primary)]">{alert.message}</p>
                      <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--alert-subtext)]">
                        {alert.type === 'after-hours' ? 'After hours' : 'Long runtime'}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-[var(--alert-badge-border)] bg-[var(--alert-badge-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--alert-badge-text)] shadow-sm">
                    {new Date(alert.triggeredAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}
