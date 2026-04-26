import { Package, ShoppingCart, Ship } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { manufacturerRankByName } from '@/lib/manufacturerPriority';
import { moduleLabel, shortMfgName } from '@/lib/utils';
import type { ForecastResponse } from '@/types/inventory';
import type { TurnoverResponse } from '@/types/turnover';
import type { Manufacturer } from '@/types/masters';

interface Props {
  turnover: TurnoverResponse;
  forecast: ForecastResponse;
  manufacturers: Manufacturer[];
}

interface ShareRow {
  key: string;
  label: string;
  kw: number;
  pct: number;
  rank: number;
}

function mw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0MW';
  return `${(value / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}MW`;
}

function rowsFromMap(map: Map<string, { label: string; kw: number; rank: number }>, total: number, limit: number): ShareRow[] {
  return Array.from(map.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      kw: value.kw,
      pct: total > 0 ? value.kw / total * 100 : 0,
      rank: value.rank,
    }))
    .filter((row) => row.kw > 0)
    .sort((a, b) => {
      const rankDiff = a.rank - b.rank;
      if (rankDiff !== 0) return rankDiff;
      return b.kw - a.kw;
    })
    .slice(0, limit);
}

function MiniShareList({ title, icon: Icon, rows }: { title: string; icon: typeof Ship; rows: ShareRow[] }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">데이터 없음</p>
        ) : rows.map((row) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {mw(row.kw)} · {row.pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(row.pct, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModuleMixPanel({ turnover, forecast, manufacturers }: Props) {
  const incomingByMfg = new Map<string, { label: string; kw: number; rank: number }>();
  const salesByMfg = new Map<string, { label: string; kw: number; rank: number }>();
  const salesBySpec = new Map<string, { label: string; kw: number; rank: number }>();

  for (const product of forecast.products) {
    const incomingKw = product.months.reduce((sum, month) => sum + (month.incoming_kw || 0), 0) + (product.unscheduled.incoming_kw || 0);
    if (incomingKw <= 0) continue;
    const label = shortMfgName(product.manufacturer_name);
    const rank = manufacturerRankByName(product.manufacturer_name, manufacturers);
    const prev = incomingByMfg.get(label);
    incomingByMfg.set(label, {
      label,
      kw: (prev?.kw || 0) + incomingKw,
      rank: Math.min(prev?.rank ?? rank, rank),
    });
  }

  for (const row of turnover.by_manufacturer) {
    const label = shortMfgName(row.manufacturer_name);
    salesByMfg.set(row.manufacturer_id, {
      label,
      kw: row.outbound_kw,
      rank: manufacturerRankByName(row.manufacturer_name, manufacturers),
    });
  }

  for (const cell of turnover.matrix) {
    const key = `${cell.manufacturer_id}-${cell.spec_wp}`;
    salesBySpec.set(key, {
      label: moduleLabel(cell.manufacturer_name, cell.spec_wp),
      kw: cell.outbound_kw,
      rank: manufacturerRankByName(cell.manufacturer_name, manufacturers),
    });
  }

  const incomingTotal = Array.from(incomingByMfg.values()).reduce((sum, row) => sum + row.kw, 0);
  const salesTotal = turnover.total.outbound_kw;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">모듈 비중</CardTitle>
        <p className="text-xs text-muted-foreground">
          6개월 입고예정과 최근 {turnover.window_days}일 출고 기준입니다.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <MiniShareList
          title="구매/입고예정 비중"
          icon={Ship}
          rows={rowsFromMap(incomingByMfg, incomingTotal, 6)}
        />
        <MiniShareList
          title="판매 비중 · 제조사"
          icon={ShoppingCart}
          rows={rowsFromMap(salesByMfg, salesTotal, 6)}
        />
        <MiniShareList
          title="판매 비중 · 규격"
          icon={Package}
          rows={rowsFromMap(salesBySpec, salesTotal, 8)}
        />
      </CardContent>
    </Card>
  );
}
