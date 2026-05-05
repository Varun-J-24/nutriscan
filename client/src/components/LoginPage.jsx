import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const LOGO_SRC = '/nutriscan-logo.png';

const features = [
  {
    title: 'AI Powered Analysis',
    description: 'Smart insights about ingredients and nutrition risks.'
  },
  {
    title: 'Expiry Alerts',
    description: 'Get notified before your product goes bad.'
  },
  {
    title: 'Healthier Choices',
    description: 'Make better decisions for daily consumption.'
  }
];

const featurePills = [
  { background: 'linear-gradient(135deg, rgba(11,31,77,0.20), rgba(25,164,99,0.20))', color: '#0b1f4d' },
  { background: 'linear-gradient(135deg, rgba(25,164,99,0.22), rgba(47,143,190,0.18))', color: '#0f6b45' },
  { background: 'linear-gradient(135deg, rgba(11,31,77,0.16), rgba(47,143,190,0.20))', color: '#1b4a7a' }
];

export default function LoginPage() {
  const { loginWithGoogle, loginLocal, registerLocal, authError } = useAuth();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [localMode, setLocalMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (loginError) {
      setError(loginError.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (localMode === 'register') {
        await registerLocal(form);
      } else {
        await loginLocal({ email: form.email, password: form.password });
      }
    } catch (authLocalError) {
      setError(authLocalError.message || 'Local authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-[30px] brand-panel md:grid-cols-2">
        <section className="relative p-7 md:p-12">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-r from-[#dde7ff] via-[#dff6ee] to-[#e3f2ff]/90" />
          <div className="relative">
            <div className="flex items-center">
              <img
                src={LOGO_SRC}
                alt="NutriScan logo"
                className="brand-logo-clean h-auto w-full max-w-[320px] object-contain"
              />
            </div>

            <div className="mt-10 space-y-6">
              {features.map((feature, index) => (
                <article key={feature.title} className="flex gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-sm"
                    style={{
                      background: featurePills[index].background,
                      color: featurePills[index].color
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{feature.title}</h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-gradient-to-b from-[#eef5ff] via-[#ecf8f2] to-[#edf7ff] p-7 md:p-12">
          <div className="w-full max-w-sm rounded-3xl border p-8 shadow-panel brand-panel" style={{ borderColor: 'var(--border)' }}>
            <h1 className="text-center text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Welcome to NutriScan</h1>
            <p className="mt-2 text-center text-sm" style={{ color: 'var(--muted)' }}>Login to continue</p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || Boolean(authError)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition disabled:opacity-60"
              style={{ borderColor: 'rgba(255,255,255,0.7)', background: 'linear-gradient(135deg, rgba(11,31,77,0.14), rgba(25,164,99,0.14))', color: 'var(--ink)' }}
            >
              <span>🔐</span>
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            {authError ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--amber)' }}>{authError}</p>
            ) : null}

            <p className="my-4 text-center text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>or</p>

            <div className="mb-3 grid grid-cols-2 rounded-xl p-1" style={{ background: 'linear-gradient(135deg, rgba(11,31,77,0.08), rgba(25,164,99,0.08))' }}>
              <button
                type="button"
                onClick={() => setLocalMode('login')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  localMode === 'login' ? 'bg-white shadow-sm' : ''
                }`}
                style={{
                  color: localMode === 'login' ? 'var(--ink)' : 'var(--muted)'
                }}
              >
                Local Login
              </button>
              <button
                type="button"
                onClick={() => setLocalMode('register')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  localMode === 'register' ? 'bg-white shadow-sm' : ''
                }`}
                style={{
                  color: localMode === 'register' ? 'var(--ink)' : 'var(--muted)'
                }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleLocalSubmit} className="space-y-3">
              {localMode === 'register' ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Full name"
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[color:var(--muted)]"
                  required
                />
              ) : null}

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[color:var(--muted)]"
                  required
                />

                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  className="brand-input w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[color:var(--muted)]"
                  minLength={8}
                  required
                />

              <button
                type="submit"
                disabled={loading}
                className="brand-primary w-full rounded-xl py-3 text-sm font-medium transition disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : localMode === 'register'
                    ? 'Create Account'
                    : 'Sign In'}
              </button>
            </form>

            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}

            <p className="mt-7 text-center text-xs" style={{ color: 'var(--muted)' }}>
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
