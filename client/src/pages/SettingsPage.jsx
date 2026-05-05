import { useScanHistory } from '../hooks/useScanHistory.js';

export default function SettingsPage() {
  const { clearFavorites, favorites, history, loadHistory } = useScanHistory();

  return (
    <section className="soft-card rounded-2xl p-4 md:p-5">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Settings & Controls</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        Use these controls to reset local preferences and refresh synced data.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Favorites</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{favorites.length} products saved as favorites</p>
          <button
            type="button"
            onClick={clearFavorites}
            className="mt-3 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}
          >
            Clear Favorites
          </button>
        </article>

        <article className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Scan History Sync</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{history.length} history records cached</p>
          <button
            type="button"
            onClick={loadHistory}
            className="mt-3 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}
          >
            Refresh History
          </button>
        </article>
      </div>
    </section>
  );
}
