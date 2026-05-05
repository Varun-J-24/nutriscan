import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useScanHistory } from '../hooks/useScanHistory.js';
import { badgeClass, formatScanTime, scoreTone } from '../utils/dashboardUi.js';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const favoritesOnly = searchParams.get('view') === 'favorites';

  const { history, historyLoading, historyError, favoriteSet, toggleFavorite } = useScanHistory();

  const rows = useMemo(() => {
    if (!favoritesOnly) return history;
    return history.filter((item) => item.barcode && favoriteSet.has(item.barcode));
  }, [favoritesOnly, history, favoriteSet]);

  return (
    <section className="soft-card rounded-2xl p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Scan History</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: favoritesOnly ? 'var(--muted)' : 'var(--teal)' }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ view: 'favorites' })}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: favoritesOnly ? 'var(--teal)' : 'var(--muted)' }}
          >
            Favorites
          </button>
        </div>
      </div>

      {historyError ? <p className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>{historyError}</p> : null}

      <div className="space-y-3 md:hidden">
        {rows.map((item) => (
          <article key={`${item.scannedAt}-${item.productName}`} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.productName}</p>
              <button
                type="button"
                onClick={() => toggleFavorite(item.barcode)}
                className="text-sm"
                style={{ color: 'var(--amber)' }}
              >
                {item.barcode && favoriteSet.has(item.barcode) ? '★' : '☆'}
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{formatScanTime(item.scannedAt)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-md border px-2 py-1 text-xs font-medium ${scoreTone(item.healthScore)}`}>
                Score {item.healthScore}
              </span>
              <span className={`rounded-md border px-2 py-1 text-xs font-medium ${badgeClass[item.expiryStatus]}`}>
                {item.expiryStatus}
              </span>
            </div>
          </article>
        ))}

        {!historyLoading && rows.length === 0 ? (
          <p className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            {favoritesOnly ? 'No favorite history available.' : 'No scan history available.'}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-auto rounded-xl border md:block" style={{ borderColor: 'var(--border)' }}>
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Favorite</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={`${item.scannedAt}-${item.productName}`} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{item.productName}</td>
                <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{formatScanTime(item.scannedAt)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-md border px-2 py-1 text-xs font-medium ${scoreTone(item.healthScore)}`}>
                    {item.healthScore}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-md border px-2 py-1 text-xs font-medium ${badgeClass[item.expiryStatus]}`}>
                    {item.expiryStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.barcode)}
                    className="text-sm"
                    style={{ color: 'var(--amber)' }}
                  >
                    {item.barcode && favoriteSet.has(item.barcode) ? '★' : '☆'}
                  </button>
                </td>
              </tr>
            ))}

            {!historyLoading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm" colSpan={5} style={{ color: 'var(--muted)' }}>
                  {favoritesOnly ? 'No favorite history available.' : 'No scan history available.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
