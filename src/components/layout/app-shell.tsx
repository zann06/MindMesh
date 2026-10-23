import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Menu, Search, X } from 'lucide-react';
import { useWorkspaceStore } from '@/app/workspace-store';
import { useCopy } from '@/app/language-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo, LogoMark } from './logo';
import { LanguageSwitcher } from './language-switcher';
import { Sidebar, SidebarContent } from './sidebar';
import { Toaster } from '@/components/ui/toaster';
import { LoadingPanel } from '@/components/ui/states';

const copy = {
  en: {
    noProject: 'No project open',
    noWorkspace: 'No workspace yet',
    activeProject: 'Active project',
    switchProject: 'Switch active project',
    searchPlaceholder: 'Search concepts and sources…',
    searchLabel: 'Search concepts and sources',
    menu: 'Navigation menu',
    home: 'MindMesh home',
    closeMenu: 'Close navigation',
    dismissError: 'Dismiss error',
    openMenu: 'Open navigation menu',
    loadingView: 'Loading view…',
  },
  id: {
    noProject: 'Tidak ada proyek terbuka',
    noWorkspace: 'Belum ada ruang kerja',
    activeProject: 'Proyek aktif',
    switchProject: 'Ganti proyek aktif',
    searchPlaceholder: 'Cari konsep dan sumber…',
    searchLabel: 'Cari konsep dan sumber',
    menu: 'Menu navigasi',
    home: 'Beranda MindMesh',
    closeMenu: 'Tutup navigasi',
    dismissError: 'Tutup galat',
    openMenu: 'Buka menu navigasi',
    loadingView: 'Memuat tampilan…',
  },
};

function ProjectSwitcher() {
  const projects = useWorkspaceStore((state) => state.projects);
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const switchProject = useWorkspaceStore((state) => state.switchProject);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const c = useCopy(copy);

  if (!activeProject) {
    return (
      <span className="text-xs text-slate-500">
        {projects.length > 0 ? c.noProject : c.noWorkspace}
      </span>
    );
  }

  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="sr-only">{c.activeProject}</span>
      <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300 sm:block" aria-hidden="true" />
      <select
        value={activeProject.projectId}
        disabled={busy}
        onChange={async (event) => {
          setBusy(true);
          try {
            await switchProject(event.target.value);
            navigate('/');
          } finally {
            setBusy(false);
          }
        }}
        className="max-w-[220px] cursor-pointer truncate rounded-md border border-transparent bg-transparent py-1 pr-6 text-xs font-medium text-slate-300 outline-none transition-colors hover:border-line hover:bg-white/[0.03] focus:border-cyan-400/50"
        aria-label={c.switchProject}
      >
        {projects.map((project) => (
          <option key={project.projectId} value={project.projectId} className="bg-[#101319]">
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const c = useCopy(copy);
  const params = new URLSearchParams(location.search);
  const [value, setValue] = useState(location.pathname === '/search' ? params.get('q') ?? '' : '');

  useEffect(() => {
    setValue(
      location.pathname === '/search'
        ? new URLSearchParams(location.search).get('q') ?? ''
        : '',
    );
  }, [location.pathname, location.search]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={c.searchPlaceholder}
        aria-label={c.searchLabel}
        className="h-9 w-full rounded-lg border border-line bg-[#0d0f14]/70 pl-9 pr-14 text-xs text-bright placeholder:text-slate-500 transition-[border-color,background-color,box-shadow] focus:border-cyan-400/50 focus:bg-[#13161c] focus:shadow-[0_0_0_3px_rgba(126,186,163,0.1)] focus:outline-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-500 sm:block">
        Enter
      </kbd>
    </form>
  );
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const c = useCopy(copy);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const close = () => onClose();
    dialog.addEventListener('close', close);
    return () => dialog.removeEventListener('close', close);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={c.menu}
      className="m-0 h-full max-h-none w-[280px] max-w-[85vw] border-r border-line bg-[#0a0b0f] p-0 text-bright"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <Link to="/" onClick={onClose} aria-label={c.home}>
            <Logo />
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={c.closeMenu}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </dialog>
  );
}

function ErrorBanner() {
  const error = useWorkspaceStore((state) => state.error);
  const clearError = useWorkspaceStore((state) => state.clearError);
  const c = useCopy(copy);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-500/[0.05] px-4 py-3 text-sm text-rose-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-xs leading-relaxed">{error}</p>
      <button
        type="button"
        onClick={clearError}
        className="rounded p-1 text-rose-200/70 hover:text-rose-100"
        aria-label={c.dismissError}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const c = useCopy(copy);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line-soft bg-[#0a0b0f]/82 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:px-7">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={c.openMenu}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <NavLink to="/" className="shrink-0 lg:hidden" aria-label={c.home}>
              <LogoMark className="h-7 w-7 sm:hidden" />
              <span className="hidden sm:block">
                <Logo />
              </span>
            </NavLink>
            <div className="hidden min-w-0 items-center gap-3 lg:flex">
              <ProjectSwitcher />
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <LanguageSwitcher />
              <GlobalSearch />
            </div>
          </div>
          <div className="border-t border-line-soft/60 px-4 py-1.5 lg:hidden">
            <ProjectSwitcher />
          </div>
        </header>
        <main className={cn('mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-7 lg:py-8')}>
          <ScrollToTop />
          <ErrorBanner />
          <Suspense
            fallback={
              <div role="status" aria-live="polite">
                <LoadingPanel label={c.loadingView} />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
