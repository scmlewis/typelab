import { NavLink, Outlet } from 'react-router';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-3 py-1.5 text-sm transition-colors',
    isActive ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-surface-strong hover:text-ink',
  ].join(' ');

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main"
      >
        Skip to content
      </a>

      <header className="border-b border-line/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <NavLink className="group flex items-center gap-3" to="/" end>
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-ink font-mono text-sm font-semibold text-paper transition-transform group-hover:-rotate-3"
            >
              T
            </span>
            <span className="font-display text-xl tracking-tight">
              TypeLab<span className="text-accent">.</span>
            </span>
          </NavLink>

          <nav aria-label="Primary" className="flex items-center gap-1">
            <NavLink className={navLinkClassName} to="/" end>
              Test
            </NavLink>
            <NavLink className={navLinkClassName} to="/settings">
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-6 sm:px-8 sm:pt-16" id="main">
        <Outlet />
      </main>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Local-only by design. No account. No tracking.</p>
          <p className="font-mono uppercase tracking-[0.16em]">Phase 1 / local build</p>
        </div>
      </footer>
    </div>
  );
}
