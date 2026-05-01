import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatUSD, formatDate, shortMfgName } from '@/lib/utils';
import type { LCDemandByPO } from '@/types/banking';

interface Props {
  items: LCDemandByPO[];
}

function UrgencyBadge({ urgency, date }: { urgency: string; date?: string }) {
  if (urgency === 'immediate') return <span className="sf-pill neg">즉시</span>;
  if (urgency === 'soon') return <span className="sf-pill warn">{date ? formatDate(date) : '30일 이내'}</span>;
  return <span className="sf-pill ghost">{date ? formatDate(date) : '—'}</span>;
}

export default function LCDemandByPOTable({ items }: Props) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--sf-ink-3)]">LC 개설 수요가 없습니다</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PO번호</TableHead>
          <TableHead>제조사</TableHead>
          <TableHead className="text-right">PO총액 (USD)</TableHead>
          <TableHead className="text-right">TT입금</TableHead>
          <TableHead className="text-right">LC개설</TableHead>
          <TableHead className="text-right">LC미개설</TableHead>
          <TableHead>개설필요시점</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((d) => (
          <TableRow key={d.po_id}>
            <TableCell className="sf-mono text-sm font-semibold">{d.po_number || d.po_id.slice(0, 8)}</TableCell>
            <TableCell className="text-sm">{shortMfgName(d.manufacturer_name)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{formatUSD(d.po_total_usd)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{formatUSD(d.tt_paid_usd)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{formatUSD(d.lc_opened_usd)}</TableCell>
            <TableCell className="text-right text-sm font-semibold tabular-nums" style={{ color: d.lc_needed_usd > 0 ? 'var(--sf-warn)' : 'var(--sf-ink-3)' }}>
              {d.lc_needed_usd > 0 ? formatUSD(d.lc_needed_usd) : '—'}
            </TableCell>
            <TableCell>
              <UrgencyBadge urgency={d.urgency} date={d.lc_due_date} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
