import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createApiClient } from '../services/apiClient.js';

const categoryLabel = { digital: 'Digital', physical: 'Real-World' };

export default function RewardsPage() {
  const { getIdToken } = useAuth();
  const api = useMemo(() => createApiClient(getIdToken), [getIdToken]);

  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getRewards();
      setRewards(res.rewards || []);
      setBalance(res.balance || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleRedeem = async (rewardId) => {
    setRedeemingId(rewardId);
    setToast(null);
    try {
      const res = await api.redeemReward(rewardId);
      setBalance(res.newBalance);
      setToast({ type: 'success', message: `Redeemed "${res.reward.name}"! New balance: ${res.newBalance} pts` });
      await loadRewards();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Redemption failed.' });
    } finally {
      setRedeemingId(null);
    }
  };

  const digital = rewards.filter((r) => r.category === 'digital');
  const physical = rewards.filter((r) => r.category === 'physical');

  return (
    <>
      {/* Balance Header */}
      <section className="soft-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
              Rewards Shop
            </p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              Redeem your points for rewards
            </h2>
          </div>
          <div className="rewards-balance-card flex items-center gap-3 rounded-2xl border px-5 py-3" style={{ borderColor: 'var(--border)' }}>
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{balance.toLocaleString()}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Points Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div
          className={`ui-fade-in rounded-xl border px-4 py-3 text-sm font-medium ${toast.type === 'success' ? 'brand-soft' : 'brand-danger'}`}
        >
          {toast.message}
        </div>
      )}

      {/* Digital Rewards */}
      <section className="soft-card rounded-2xl p-4 md:p-5">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          ⚡ {categoryLabel.digital} Rewards
        </h3>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading rewards...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {digital.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                balance={balance}
                redeeming={redeemingId === reward.id}
                onRedeem={handleRedeem}
              />
            ))}
          </div>
        )}
      </section>

      {/* Real-World Rewards */}
      <section className="soft-card rounded-2xl p-4 md:p-5">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          🎁 {categoryLabel.physical} Rewards
        </h3>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading rewards...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {physical.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                balance={balance}
                redeeming={redeemingId === reward.id}
                onRedeem={handleRedeem}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function RewardCard({ reward, balance, redeeming, onRedeem }) {
  const canAfford = balance >= reward.cost;

  return (
    <article
      className="reward-card group flex flex-col justify-between rounded-xl border p-4 transition-all hover:shadow-lg"
      style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(243,250,247,0.92))' }}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{reward.icon}</span>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{reward.name}</h4>
        </div>
        <p className="mt-2 text-xs leading-5" style={{ color: 'var(--muted)' }}>{reward.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-lg px-2 py-1 text-xs font-bold tabular-nums" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
          {reward.cost.toLocaleString()} pts
        </span>
        <button
          type="button"
          disabled={!canAfford || redeeming}
          onClick={() => onRedeem(reward.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            canAfford
              ? 'brand-primary hover:scale-105'
              : 'cursor-not-allowed opacity-50 border'
          }`}
          style={!canAfford ? { borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface-2)' } : undefined}
        >
          {redeeming ? 'Redeeming...' : canAfford ? 'Redeem' : 'Not enough'}
        </button>
      </div>
    </article>
  );
}
