import { Link } from 'react-router-dom';
import { useScanHistory } from '../hooks/useScanHistory.js';
import { badgeClass, scoreTone, shortAgo } from '../utils/dashboardUi.js';

export default function HomePage() {
  const { history, historyLoading, favoriteSet, toggleFavorite } = useScanHistory();
  const recentCards = history.slice(0, 4);

  return (
    <>
      <section className="soft-card rounded-2xl p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[1.3fr,0.9fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
              Multipage Dashboard
            </p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              Navigate scanner, history, alerts, and settings from separate pages
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              This keeps workflows focused and easier to maintain.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/dashboard/scanner" className="brand-primary w-full rounded-lg px-4 py-2 text-center text-sm font-medium sm:w-auto">
                Open Scanner
              </Link>
              <Link
                to="/dashboard/history"
                className="w-full rounded-lg border px-4 py-2 text-center text-sm font-medium sm:w-auto"
                style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}
              >
                View History
              </Link>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(223,232,255,0.94) 46%, rgba(227,248,237,0.95) 100%)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              Total scans
            </p>
            <p className="mt-2 text-4xl font-semibold" style={{ color: 'var(--ink)' }}>{history.length}</p>
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>All records are per-user.</p>
          </div>
        </div>
      </section>

      <section className="soft-card rounded-2xl p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Recent Scans</h3>
          <Link to="/dashboard/history" className="text-xs" style={{ color: 'var(--green)' }}>
            View all
          </Link>
        </div>

        {historyLoading ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading recent scans...</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentCards.map((item) => (
            <article key={`${item.scannedAt}-${item.productName}`} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.productName}</p>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item.barcode)}
                  className="text-xs"
                  title="Toggle favorite"
                  style={{ color: 'var(--amber)' }}
                >
                  {item.barcode && favoriteSet.has(item.barcode) ? '★' : '☆'}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{shortAgo(item.scannedAt)}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${scoreTone(item.healthScore)}`}>
                  {item.healthScore}
                </span>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${badgeClass[item.expiryStatus]}`}>
                  {item.expiryStatus}
                </span>
              </div>
            </article>
          ))}

          {!historyLoading && recentCards.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No scans yet. Open scanner to add your first product.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
