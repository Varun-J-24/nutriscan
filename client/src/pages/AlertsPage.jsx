import { useMemo } from 'react';
import { useScanHistory } from '../hooks/useScanHistory.js';
import { badgeClass, formatScanTime } from '../utils/dashboardUi.js';

export default function AlertsPage() {
  const { history, historyLoading } = useScanHistory();

  const alertRows = useMemo(
    () => history.filter((item) => item.expiryStatus === 'Expired' || item.expiryStatus === 'Expiring Soon'),
    [history]
  );

  return (
    <section className="soft-card rounded-2xl p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Expiry Alerts</h3>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {alertRows.length} attention-needed items
        </span>
      </div>

      <div className="space-y-3">
        {alertRows.map((item) => (
          <article key={`${item.scannedAt}-${item.productName}`} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.productName}</p>
              <span className={`rounded-md border px-2 py-1 text-xs font-medium ${badgeClass[item.expiryStatus]}`}>
                {item.expiryStatus}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Scanned: {formatScanTime(item.scannedAt)}</p>
          </article>
        ))}

        {!historyLoading && alertRows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No active expiry alerts right now.
          </p>
        ) : null}
      </div>
    </section>
  );
}
