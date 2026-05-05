import { Link } from 'react-router-dom';
import { useScanHistory } from '../hooks/useScanHistory.js';
import { useGamification } from '../hooks/useGamification.js';
import { badgeClass, scoreTone, shortAgo } from '../utils/dashboardUi.js';

const tierColors = {
  emerald: 'var(--green)',
  green: 'var(--green)',
  amber: 'var(--amber)',
  red: 'var(--danger)'
};

const levelBadgeColors = {
  bronze: 'linear-gradient(135deg, #cd7f32, #e6a15e)',
  silver: 'linear-gradient(135deg, #b0b0b0, #d4d4d4)',
  gold: 'linear-gradient(135deg, #d4a017, #f0d060)',
  emerald: 'linear-gradient(135deg, #19a463, #2dd88a)',
  prismatic: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c, #fda085)'
};

export default function HomePage() {
  const { history, historyLoading, favoriteSet, toggleFavorite } = useScanHistory();
  const { profile, achievements, loading: gamLoading } = useGamification();
  const recentCards = history.slice(0, 4);

  return (
    <>
      {/* ── Gamification Dashboard ── */}
      {profile && !gamLoading && (
        <section className="soft-card ui-fade-in rounded-2xl p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
              Your Progress
            </p>
            <Link to="/dashboard/rewards" className="text-xs font-medium" style={{ color: 'var(--green)' }}>
              Rewards Shop →
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Level Card */}
            <div className="gamification-stat-card rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: levelBadgeColors[profile.levelColor] || levelBadgeColors.bronze }}
                >
                  {profile.level}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{profile.levelTitle}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Level {profile.level}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div
                    className="level-progress-bar h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round(profile.progressToNextLevel * 100)}%`,
                      background: levelBadgeColors[profile.levelColor] || levelBadgeColors.bronze
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] tabular-nums" style={{ color: 'var(--muted)' }}>
                  {Math.round(profile.progressToNextLevel * 100)}% to Level {profile.level + 1}
                </p>
              </div>
            </div>

            {/* Streak Card */}
            <div className="gamification-stat-card rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Current Streak</p>
                <span className="streak-fire text-lg">{profile.currentStreak > 0 ? '🔥' : '💤'}</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {profile.currentStreak}
                <span className="ml-1 text-xs font-normal" style={{ color: 'var(--muted)' }}>days</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Best: {profile.longestStreak}</p>
                {profile.streakFreezes > 0 && (
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                    ❄️ {profile.streakFreezes}
                  </span>
                )}
              </div>
            </div>

            {/* Points Card */}
            <div className="gamification-stat-card rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Points Balance</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {profile.currentBalance.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                Total earned: {profile.totalPoints.toLocaleString()}
              </p>
            </div>

            {/* Health Tier Card */}
            <div className="gamification-stat-card rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Health Tier</p>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: tierColors[profile.healthClassification?.color] || 'var(--muted)' }}
                />
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {profile.healthClassification?.tier || 'No data'}
                </p>
              </div>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                Avg Score: {profile.avgHealthScore || '--'} · {profile.totalScans} scans
              </p>
            </div>
          </div>

          {/* Recent Badges */}
          {profile.badges?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Badges Earned</p>
              <div className="flex flex-wrap gap-2">
                {achievements
                  .filter((a) => a.unlocked)
                  .map((badge) => (
                    <span
                      key={badge.id}
                      className="badge-pop inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                      style={{ borderColor: 'var(--border)', background: 'var(--green-soft)', color: 'var(--green)' }}
                      title={badge.description}
                    >
                      {badge.icon} {badge.name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Original Dashboard Content ── */}
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
