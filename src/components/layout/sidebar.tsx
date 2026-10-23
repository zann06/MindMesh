import { NavLink } from 'react-router-dom';
import {
  Boxes,
  Database,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Search,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopy } from '@/app/language-store';
import { useAISettingsStore } from '@/services/ai/settings';
import { Logo } from './logo';

const copy = {
  en: {
    explore: 'Explore',
    learn: 'Learn',
    configure: 'Configure',
    dashboard: 'Dashboard',
    universe: 'Universe',
    documents: 'Documents',
    search: 'Search',
    learning: 'Learning',
    settings: 'AI settings',
    data: 'Data & backups',
    about: 'About',
    mainNavigation: 'Main navigation',
    home: 'MindMesh home',
    aiDisabled: 'AI disabled',
    aiConnected: 'AI connected',
    aiTesting: 'Testing AI…',
    aiNotTested: 'AI not tested',
  },
  id: {
    explore: 'Jelajah',
    learn: 'Belajar',
    configure: 'Konfigurasi',
    dashboard: 'Dasbor',
    universe: 'Semesta',
    documents: 'Dokumen',
    search: 'Pencarian',
    learning: 'Pembelajaran',
    settings: 'Pengaturan AI',
    data: 'Data & cadangan',
    about: 'Tentang',
    mainNavigation: 'Navigasi utama',
    home: 'Beranda MindMesh',
    aiDisabled: 'AI nonaktif',
    aiConnected: 'AI terhubung',
    aiTesting: 'Menguji AI…',
    aiNotTested: 'AI belum diuji',
  },
};

function navGroups(c: (typeof copy)['en']) {
  return [
    {
      label: c.explore,
      items: [
        { to: '/', label: c.dashboard, icon: LayoutDashboard, end: true },
        { to: '/universe', label: c.universe, icon: Boxes },
        { to: '/documents', label: c.documents, icon: FileText },
        { to: '/search', label: c.search, icon: Search },
      ],
    },
    {
      label: c.learn,
      items: [{ to: '/learning', label: c.learning, icon: GraduationCap }],
    },
    {
      label: c.configure,
      items: [
        { to: '/settings', label: c.settings, icon: Sparkles },
        { to: '/data', label: c.data, icon: Database },
        { to: '/about', label: c.about, icon: HelpCircle },
      ],
    },
  ];
}

function AIStatusMini() {
  const settings = useAISettingsStore((state) => state.settings);
  const status = useAISettingsStore((state) => state.status);
  const c = useCopy(copy);
  const label =
    settings.mode === 'disabled'
      ? c.aiDisabled
      : status.state === 'connected'
        ? c.aiConnected
        : status.state === 'testing'
          ? c.aiTesting
          : c.aiNotTested;
  const color =
    settings.mode === 'disabled'
      ? 'bg-slate-500'
      : status.state === 'connected'
        ? 'bg-emerald-400'
        : status.state === 'testing'
          ? 'bg-cyan-400 animate-pulse'
          : 'bg-amber-400';
  return (
    <NavLink
      to="/settings"
      className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/[0.025] px-3 py-2 text-[11px] text-slate-400 transition-colors hover:text-slate-200"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} aria-hidden="true" />
      {label}
    </NavLink>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const c = useCopy(copy);
  const groups = navGroups(c);
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-5">
        <NavLink to="/" onClick={onNavigate} aria-label={c.home}>
          <Logo />
        </NavLink>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3" aria-label={c.mainNavigation}>
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-cyan-400/[0.08] text-cyan-100 shadow-[inset_2px_0_0_rgba(126,186,163,0.75)]'
                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300',
                            )}
                            aria-hidden="true"
                          />
                          {item.label}
                          {isActive ? (
                            <span className="ml-auto h-1 w-1 rounded-full bg-cyan-300" aria-hidden="true" />
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t border-line-soft p-3">
        <AIStatusMini />
        <p className="px-2 text-[10px] leading-relaxed text-slate-600">
          Local-first · v0.1.0 · Apache-2.0
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-line-soft bg-[#0a0b0f]/75 lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}
