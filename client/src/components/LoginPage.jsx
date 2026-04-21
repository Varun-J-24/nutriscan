import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const LOGO_SRC = '/nutriscan-logo.jpg';

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
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-[30px] soft-card md:grid-cols-2">
        <section className="relative p-7 md:p-12">
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-r from-emerald-50 via-lime-50 to-emerald-100/70" />
          <div className="relative">
            <div className="flex items-center">
              <img
                src={LOGO_SRC}
                alt="NutriScan logo"
                className="h-20 w-auto rounded-2xl border border-emerald-100 bg-white p-1 shadow-sm"
              />
            </div>

            <div className="mt-10 space-y-6">
              {features.map((feature) => (
                <article key={feature.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{feature.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-gradient-to-b from-white to-slate-50 p-7 md:p-12">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
            <h1 className="text-center text-2xl font-semibold text-slate-900">Welcome to NutriScan</h1>
            <p className="mt-2 text-center text-sm text-slate-500">Login to continue</p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || Boolean(authError)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <span>🔐</span>
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            {authError ? (
              <p className="mt-2 text-xs text-amber-700">{authError}</p>
            ) : null}

            <p className="my-4 text-center text-xs uppercase tracking-[0.18em] text-slate-400">or</p>

            <div className="mb-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setLocalMode('login')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  localMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Local Login
              </button>
              <button
                type="button"
                onClick={() => setLocalMode('register')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  localMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none"
                  required
                />
              ) : null}

              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none"
                required
              />

              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none"
                minLength={8}
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : localMode === 'register'
                    ? 'Create Account'
                    : 'Sign In'}
              </button>
            </form>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

            <p className="mt-7 text-center text-xs text-slate-400">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
