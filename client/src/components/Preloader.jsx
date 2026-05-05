const LOGO_SRC = '/nutriscan-logo.jpg';

export default function Preloader() {
  return (
    <div className="preloader-screen flex min-h-screen items-center justify-center px-4">
      <div className="preloader-card relative w-full max-w-md rounded-3xl border p-6 text-center sm:p-8">
        <div className="mx-auto flex h-28 w-full max-w-[280px] items-center justify-center rounded-2xl border bg-white/90 p-2 shadow-sm sm:h-32">
          <img
            src={LOGO_SRC}
            alt="NutriScan logo"
            className="preloader-logo h-full w-full object-contain"
          />
        </div>

        <div className="preloader-rings mt-5">
          <span />
          <span />
        </div>

        <div className="preloader-scan mt-5 overflow-hidden rounded-full border" style={{ borderColor: 'var(--border)' }}>
          <span />
        </div>

        <p className="mt-5 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Preparing NutriScan
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Loading your nutrition workspace
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5" aria-label="Loading">
          <span className="preloader-dot" />
          <span className="preloader-dot" />
          <span className="preloader-dot" />
        </div>
      </div>
    </div>
  );
}
