import { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn, formatDate, formatNumber, formatMW, formatUSD } from '@/lib/utils';
import EmptyState from '@/components/common/EmptyState';
import { fetchWithAuth } from '@/lib/api';
import { PO_STATUS_LABEL, PO_STATUS_COLOR, CONTRACT_TYPE_LABEL, type PurchaseOrder, type POLineItem, type LCRecord, type TTRemittance } from '@/types/procurement';

interface Props {
  items: PurchaseOrder[];
  onSelect: (po: PurchaseOrder) => void;
  onNew: () => void;
}

interface Agg { totalUsd: number; ttUsd: number; lcUsd: number; lcRemainUsd: number; }

export default function POListTable({ items, onSelect, onNew }: Props) {
  // 결제 컬럼 집계 — 프론트 계산 (TODO: Rust 계산엔진 연동)
  const [agg, setAgg] = useState<Record<string, Agg>>({});
  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) { setAgg({}); return; }
    (async () => {
      try {
        const result: Record<string, Agg> = {};
        await Promise.all(items.map(async (po) => {
          try {
            const [lines, lcs, tts] = await Promise.all([
              fetchWithAuth<POLineItem[]>(`/api/v1/pos/${po.po_id}/lines`).catch(() => [] as POLineItem[]),
              fetchWithAuth<LCRecord[]>(`/api/v1/lcs?po_id=${po.po_id}`).catch(() => [] as LCRecord[]),
              fetchWithAuth<TTRemittance[]>(`/api/v1/tts?po_id=${po.po_id}`).catch(() => [] as TTRemittance[]),
            ]);
            const totalUsd = (lines ?? []).reduce((s, l) => s + (l.total_amount_usd ?? 0), 0);
            const ttUsd = (tts ?? []).reduce((s, t) => s + (t.amount_usd ?? 0), 0);
            const lcUsd = (lcs ?? []).reduce((s, l) => s + (l.amount_usd ?? 0), 0);
            result[po.po_id] = { totalUsd, ttUsd, lcUsd, lcRemainUsd: Math.max(0, totalUsd - lcUsd) };
          } catch { /* skip */ }
        }));
        if (!cancelled) setAgg(result);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((p) => p.po_id).join(',')]);

  if (items.length === 0) return <EmptyState message="등록된 PO가 없습니다" actionLabel="새로 등록" onAction={onNew} />;

  return (
    <div className="rounded-md border">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>PO번호</TableHead>
            <TableHead>제조사</TableHead>
            <TableHead>계약유형</TableHead>
            <TableHead>계약일</TableHead>
            <TableHead>Incoterms</TableHead>
            <TableHead className="text-right">총수량</TableHead>
            <TableHead className="text-right">총MW</TableHead>
            <TableHead className="text-right">총금액(USD)</TableHead>
            <TableHead className="text-right">T/T납부(USD)</TableHead>
            <TableHead className="text-right">LC개설(USD)</TableHead>
            <TableHead className="text-right">미개설잔액(USD)</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((po) => {
            const a = agg[po.po_id];
            return (
            <TableRow key={po.po_id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelect(po)}>
              <TableCell className="font-mono">{po.po_number || '—'}</TableCell>
              <TableCell>{po.manufacturer_name ?? '—'}</TableCell>
              <TableCell>{CONTRACT_TYPE_LABEL[po.contract_type]}</TableCell>
              <TableCell>{formatDate(po.contract_date ?? '')}</TableCell>
              <TableCell>{po.incoterms ?? '—'}</TableCell>
              <TableCell className="text-right">{po.total_qty != null ? formatNumber(po.total_qty) : '—'}</TableCell>
              <TableCell className="text-right">{po.total_mw != null ? formatMW(po.total_mw * 1000) : '—'}</TableCell>
              <TableCell className="text-right font-mono">{a ? formatUSD(a.totalUsd) : '—'}</TableCell>
              <TableCell className="text-right font-mono">{a ? formatUSD(a.ttUsd) : '—'}</TableCell>
              <TableCell className="text-right font-mono">{a ? formatUSD(a.lcUsd) : '—'}</TableCell>
              <TableCell className="text-right font-mono">{a ? formatUSD(a.lcRemainUsd) : '—'}</TableCell>
              <TableCell>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', PO_STATUS_COLOR[po.status])}>
                  {PO_STATUS_LABEL[po.status]}
                </span>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
