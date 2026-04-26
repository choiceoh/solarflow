import { shortMfgName } from '@/lib/utils';
import type { Manufacturer } from '@/types/masters';

const FALLBACK_ORDER = ['진코', '트리나', '론지', '라이젠'];

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function fallbackRank(name: string): number {
  const short = normalize(shortMfgName(name));
  const raw = normalize(name);
  const idx = FALLBACK_ORDER.findIndex((candidate) => {
    const q = normalize(candidate);
    return short.includes(q) || raw.includes(q);
  });
  return idx >= 0 ? (idx + 1) * 10 : 999;
}

export function manufacturerRank(m: Pick<Manufacturer, 'name_kr' | 'name_en' | 'short_name' | 'priority_rank'>): number {
  return m.priority_rank || fallbackRank(m.short_name || m.name_kr || m.name_en || '');
}

export function sortManufacturers<T extends Pick<Manufacturer, 'name_kr' | 'name_en' | 'short_name' | 'priority_rank'>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rankDiff = manufacturerRank(a) - manufacturerRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (a.short_name || a.name_kr || a.name_en || '').localeCompare(
      b.short_name || b.name_kr || b.name_en || '',
      'ko',
    );
  });
}

export function manufacturerRankByName(name: string, manufacturers: Manufacturer[]): number {
  const normalized = normalize(name);
  const short = normalize(shortMfgName(name));
  const found = manufacturers.find((m) => {
    const names = [m.name_kr, m.name_en, m.short_name].map(normalize);
    return names.some((candidate) => candidate && (candidate === normalized || candidate === short));
  });
  return found ? manufacturerRank(found) : fallbackRank(name);
}
