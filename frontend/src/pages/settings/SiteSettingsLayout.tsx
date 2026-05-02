import { NavLink, Outlet } from 'react-router-dom';
import { GitFork, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUB_NAV = [
  { to: '/settings/site/tenant-override', label: 'Tenant Override', icon: GitFork, hint: '계열사별 화면 조정' },
  { to: '/settings/site/ui-config',       label: 'UI 메타 편집',     icon: Wand2,   hint: '디자인 토큰·폼 메타' },
];

export default function SiteSettingsLayout() {
  return (
    <div className="flex">
      <aside className="w-56 shrink-0 border-r bg-muted/20">
        <div className="px-4 pt-4 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          사이트 도구
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {SUB_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-start gap-2 rounded px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-muted/40',
                )
              }
            >
              <item.icon className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="flex flex-col min-w-0">
                <span className="font-medium">{item.label}</span>
                <span className="text-[11px] text-muted-foreground">{item.hint}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
