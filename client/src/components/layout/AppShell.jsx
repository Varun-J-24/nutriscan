import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const LOGO_SRC = '/nutriscan-logo.jpg';

const navItems = [
  { label: 'Home', to: '/dashboard' },
  { label: 'Scanner', to: '/dashboard/scanner' },
  { label: 'History', to: '/dashboard/history' },
  { label: 'Alerts', to: '/dashboard/alerts' },
  { label: 'Settings', to: '/dashboard/settings' }
];

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[230px,1fr]">
        <aside className="soft-card rounded-2xl p-4 md:p-5">
          <div className="border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <img
              src={LOGO_SRC}
              alt="NutriScan logo"
              className="h-20 w-full rounded-xl border bg-white p-1 object-contain"
              style={{ borderColor: 'var(--border)' }}
            />
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Smart nutrition companion</p>
          </div>

          <nav className="mt-4 grid gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-left text-sm transition ${isActive ? 'border' : 'hover:bg-[color:var(--surface-2)]'}`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--teal)' : 'var(--muted)',
                  background: isActive ? 'var(--teal-soft)' : 'transparent',
                  borderColor: isActive ? 'var(--border)' : 'transparent'
                })}
                end={item.to === '/dashboard'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-5 w-full rounded-lg border px-3 py-2 text-sm font-medium hover:bg-[color:var(--surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Logout
          </button>
        </aside>

        <main className="space-y-4">
          <header className="soft-card rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                  Hello, {user.displayName?.split(' ')[0] || 'User'}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  NutriScan is now organized as a multi-page workspace.
                </p>
              </div>
              <img
                src={user.photoURL || 'https://api.dicebear.com/9.x/initials/svg?seed=NutriScan'}
                alt="Profile"
                className="h-10 w-10 rounded-full border object-cover"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
