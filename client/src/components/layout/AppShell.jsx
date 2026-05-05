import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const LOGO_SRC = '/nutriscan-logo.png';

const navItems = [
  { label: 'Home', to: '/dashboard' },
  { label: 'Scanner', to: '/dashboard/scanner' },
  { label: 'History', to: '/dashboard/history' },
  { label: 'Alerts', to: '/dashboard/alerts' },
  { label: 'Settings', to: '/dashboard/settings' }
];

const navClass = ({ isActive }) =>
  `section-nav-link whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${isActive ? 'border' : ''}`;

const navStyle = ({ isActive }) => ({
  color: isActive ? 'var(--teal)' : 'var(--muted)',
  background: isActive ? 'color-mix(in srgb, var(--teal-soft) 86%, white)' : 'transparent',
  borderColor: isActive ? 'var(--border)' : 'transparent'
});

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-3 md:p-5 lg:p-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="section-top-nav sticky top-3 z-40 mb-4 rounded-[28px] border p-3 sm:p-4 md:mb-5 md:rounded-[32px]">
          <div className="grid gap-3 lg:grid-cols-[260px,1fr,auto] lg:items-center">
            <div>
              <img
                src={LOGO_SRC}
                alt="NutriScan logo"
                className="brand-logo-clean h-24 w-full object-contain"
              />
              <p className="mt-2 px-1 text-sm" style={{ color: 'var(--muted)' }}>
                Smart nutrition companion
              </p>
            </div>

            <nav className="flex gap-2 overflow-x-auto border-t pt-3 lg:border-none lg:pt-0" style={{ borderColor: 'var(--border)' }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navClass}
                  style={navStyle}
                  end={item.to === '/dashboard'}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center justify-between gap-2 lg:justify-end">
              <img
                src={user.photoURL || 'https://api.dicebear.com/9.x/initials/svg?seed=NutriScan'}
                alt="Profile"
                className="h-10 w-10 rounded-full border object-cover"
                style={{ borderColor: 'var(--border)' }}
              />
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-white/40"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-4 md:space-y-5">
          <section className="soft-card ui-fade-in rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold sm:text-2xl" style={{ color: 'var(--ink)' }}>
                  Hello, {user.displayName?.split(' ')[0] || 'User'}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Smooth, responsive NutriScan workspace across phone, tablet, and desktop.
                </p>
              </div>
              <img
                src={user.photoURL || 'https://api.dicebear.com/9.x/initials/svg?seed=NutriScan'}
                alt="Profile"
                className="hidden h-10 w-10 rounded-full border object-cover sm:block"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </section>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
