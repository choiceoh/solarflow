import { AlertTriangle } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatUSD } from '@/lib/utils';
import type { LCDemandMonthly } from '@/types/banking';

interface Props {
  items: LCDemandMonthly[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'shortage') return <span className="sf-pill neg">부족</span>;
  if (status === 'caution')  return <span className="sf-pill warn">주의</span>;
  return <span className="sf-pill pos">충분</span>;
}

export default function LCDemandMonthlyTable({ items }: Props) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--sf-ink-3)]">월별 예측 데이터가 없습니다</p>;
  }

  const shortageMonths = items.filter((m) => m.status === 'shortage');

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>월</TableHead>
            <TableHead className="text-right">LC 수요</TableHead>
            <TableHead className="text-right">한도 복원</TableHead>
            <TableHead className="text-right">가용한도 (예상)</TableHead>
            <TableHead className="text-right">과부족</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => {
            const shortageStyle = m.shortage_usd < 0
              ? { color: 'var(--sf-neg)', fontWeight: 600 }
              : m.status === 'caution'
              ? { color: 'var(--sf-warn)' }
              : { color: 'var(--sf-pos)' };
            return (
              <TableRow key={m.month}>
                <TableCell className="sf-mono text-sm font-semibold">{m.month}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatUSD(m.lc_demand_usd)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatUSD(m.limit_recovery_usd)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatUSD(m.projected_available_usd)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums" style={shortageStyle}>
                  {m.shortage_usd >= 0 ? '+' : ''}{formatUSD(m.shortage_usd)}
                </TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* 부족 시 대응방안 안내 — sf-banner neg */}
      {shortageMonths.map((m) => (
        <div key={m.month} className="sf-banner neg">
          <AlertTriangle className="sf-banner-icon h-4 w-4" />
          <div className="sf-banner-body text-xs">
            <strong>{m.month}</strong> LC 수요 {formatUSD(m.lc_demand_usd)}, 가용한도 {formatUSD(m.projected_available_usd)} — {formatUSD(Math.abs(m.shortage_usd))} 부족
            <div className="mt-1">대응: (1) 은행 한도 증액 (2) 선적 일정 조정 (3) T/T 비율 상향</div>
          </div>
        </div>
      ))}
    </div>
  );
}
