import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Partner } from '@/types/masters';

interface Props {
  partners: Partner[];
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
}

export function PartnerCombobox({ partners, value, onChange, error, placeholder = '선택' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = partners.find((p) => p.partner_id === value);
  const filtered = search
    ? partners.filter((p) => p.partner_name.toLowerCase().includes(search.toLowerCase()))
    : partners;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  function handleSelect(partnerId: string) {
    onChange(partnerId);
    setOpen(false);
    setSearch('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-invalid={error}
        className={cn(
          'flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent h-8 py-2 pr-2 pl-2.5 text-sm transition-colors outline-none select-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'dark:bg-input/30 dark:hover:bg-input/50',
          error && 'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
          !selected && 'text-muted-foreground',
        )}
      >
        <span className="flex-1 text-left truncate">{selected?.partner_name ?? placeholder}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground shrink-0 pointer-events-none" />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 w-full min-w-[12rem] rounded-lg border border-border bg-popover text-popover-foreground shadow-md overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border">
            <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">결과 없음</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.partner_id}
                  type="button"
                  onClick={() => handleSelect(p.partner_id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors',
                    value === p.partner_id && 'bg-accent/40',
                  )}
                >
                  <span className="size-3.5 shrink-0 flex items-center justify-center">
                    {value === p.partner_id && <CheckIcon className="size-3.5" />}
                  </span>
                  <span className="flex-1 truncate">{p.partner_name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
