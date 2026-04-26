import { useState, Fragment } from 'react';
import { ChevronRight, ChevronDown, Plus, CheckCircle2, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import { moduleLabel } from '@/lib/utils';
import type { InventoryAllocation } from './AllocationForm';
import type { InventoryItem } from '@/types/inventory';

/* ─── 헬퍼 ─────────────────────────────────────── */

function fmtKw(kw: number): string {
  if (kw <= 0) return '0 kW';
  if (kw >= 1000) return (kw / 1000).toFixed(2) + ' MW';
  return Math.round(kw).toLocaleString('ko-KR') + ' kW';
}

const kwToEa = (kw: number, specWp: number): number =>
  specWp > 0 ? Math.round((kw * 1000) / specWp) : 0;

const isFreeSpare = (a: InventoryAllocation) => a.notes?.startsWith('[무상스페어]') ?? false;
const isSale = (a: InventoryAllocation) => a.purpose === 'sale' || a.purpose === 'other';
const isConstruction = (a: InventoryAllocation) =>
  a.purpose === 'construction' ||
  a.purpose === 'construction_own' ||
  a.purpose === 'construction_epc';

function allocCountLabel(mainCount: number, spareCount: number): string {
  if (mainCount === 0 && spareCount > 0) return `무상 ${spareCount}건`;
  return spareCount > 0 ? `${mainCount}건 · 무상 ${spareCount}건` : `${mainCount}건`;
}

/* ─── Props ────────────────────────────────────── */

interface Props {
  items: InventoryItem[];
  allocations: InventoryAllocation[];
  onNewAlloc: (productId: string) => void;
  onEdit: (alloc: InventoryAllocation) => void;
  onConfirm: (alloc: InventoryAllocation) => void;
  onHold: (allocId: string) => void;
  onResume: (allocId: string) => void;
  onDelete: (allocId: string) => void;
}

/* ─── 상태 뱃지 ─────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  hold:      'bg-sky-100 text-sky-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<string, string> = {
  pending:   '예약중',
  confirmed: '확정됨',
  hold:      '보류',
  cancelled: '취소됨',
};

/* ─── 서브테이블 (펼침 행) ──────────────────────── */

function AllocSubTable({
  allocs,
  colorClass,
  onEdit,
  onConfirm,
  onHold,
  onResume,
  onDelete,
}: {
  allocs: InventoryAllocation[];
  colorClass: string;
  onEdit: (a: InventoryAllocation) => void;
  onConfirm: (a: InventoryAllocation) => void;
  onHold: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (allocs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-1">등록된 내역 없음</p>
    );
  }

  const mainAllocs  = allocs.filter((a) => !isFreeSpare(a));
  const spareAllocs = allocs.filter(isFreeSpare);
  const claimedIds  = new Set<string>();

  const groups = mainAllocs.map((main) => {
    const spares = spareAllocs.filter(
      (s) => !claimedIds.has(s.alloc_id) &&
        (s.group_id && main.group_id ? s.group_id === main.group_id : s.customer_name === main.customer_name),
    );
    spares.forEach((s) => claimedIds.add(s.alloc_id));
    return { main, spares };
  });
  const standalone = spareAllocs.filter((s) => !claimedIds.has(s.alloc_id));

  const ActionButtons = ({ a, isFreeSpare }: { a: InventoryAllocation; isFreeSpare: boolean }) => (
    <div className="flex items-center justify-center gap-1.5">
      {a.status === 'pending' && (
        <>
          {!isFreeSpare && (
            <button onClick={() => onConfirm(a)} className="inline-flex h-6 items-center gap-1 rounded border border-green-200 px-2 text-[11px] text-green-700 hover:bg-green-50">
              <CheckCircle2 className="h-3 w-3" />
              수주
            </button>
          )}
          {!isFreeSpare && (
            <button onClick={() => onHold(a.alloc_id)} className="inline-flex h-6 items-center gap-1 rounded border border-sky-200 px-2 text-[11px] text-sky-700 hover:bg-sky-50">
              <PauseCircle className="h-3 w-3" />
              보류
            </button>
          )}
        </>
      )}
      {a.status === 'hold' && (
        <button onClick={() => onResume(a.alloc_id)} className="inline-flex h-6 items-center gap-1 rounded border border-amber-200 px-2 text-[11px] text-amber-700 hover:bg-amber-50">
          <PlayCircle className="h-3 w-3" />
          재개
        </button>
      )}
      <button onClick={() => onDelete(a.alloc_id)} className="inline-flex h-6 items-center gap-1 rounded border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50">
        <Trash2 className="h-3 w-3" />
        삭제
      </button>
    </div>
  );

  const SourceBadge = ({ a }: { a: InventoryAllocation }) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.source_type === 'incoming' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
      {a.source_type === 'incoming' ? '미착품' : '현재고'}
    </span>
  );

  return (
    <table className={`w-full text-xs ${colorClass}`}>
      <thead>
        <tr className="border-b bg-muted/20">
          <th className="text-left p-2 font-medium text-muted-foreground">거래처 / 현장</th>
          <th className="text-right p-2 font-medium text-muted-foreground">수량</th>
          <th className="text-center p-2 font-medium text-muted-foreground">재고구분</th>
          <th className="text-center p-2 font-medium text-muted-foreground">상태</th>
          <th className="text-center p-2 font-medium text-muted-foreground">작업</th>
        </tr>
      </thead>
      <tbody>
        {groups.map(({ main, spares }) => {
          const spareQty = spares.reduce((sum, spare) => sum + spare.quantity, 0);
          const spareKw = spares.reduce((sum, spare) => sum + (spare.capacity_kw ?? 0), 0);

          return (
            <tr key={main.alloc_id} className="border-t hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onEdit(main)}>
              <td className="p-2">
                <div className="font-medium leading-tight">{main.customer_name ?? main.site_name ?? '—'}</div>
                {main.customer_name && main.site_name && (
                  <div className="text-[10px] text-muted-foreground">{main.site_name}</div>
                )}
                {spareQty > 0 && (
                  <span className="mt-0.5 inline-flex rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                    무상 포함
                  </span>
                )}
              </td>
              <td className="p-2 text-right font-mono whitespace-nowrap">
                <div>{main.quantity.toLocaleString('ko-KR')} EA</div>
                {main.capacity_kw != null && main.capacity_kw > 0 && (
                  <div className="text-[10px] text-muted-foreground">{fmtKw(main.capacity_kw)}</div>
                )}
                {spareQty > 0 && (
                  <div className="mt-0.5 text-[10px] text-orange-600">
                    + 무상 {spareQty.toLocaleString('ko-KR')} EA
                    {spareKw > 0 ? ` · ${fmtKw(spareKw)}` : ''}
                  </div>
                )}
              </td>
              <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}><SourceBadge a={main} /></td>
              <td className="p-2 text-center">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLE[main.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[main.status] ?? main.status}
                </span>
              </td>
              <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                <ActionButtons a={main} isFreeSpare={false} />
              </td>
            </tr>
          );
        })}
        {/* 단독 무상스페어 (매칭된 메인 행 없음) */}
        {standalone.map((a) => (
          <tr key={a.alloc_id} className="border-t bg-orange-50/40 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onEdit(a)}>
            <td className="p-2">
              <div className="font-medium leading-tight">{a.customer_name ?? a.site_name ?? '—'}</div>
              <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700">무상스페어</span>
            </td>
            <td className="p-2 text-right font-mono whitespace-nowrap">
              <div>{a.quantity.toLocaleString('ko-KR')} EA</div>
              {a.capacity_kw != null && a.capacity_kw > 0 && (
                <div className="text-[10px] text-muted-foreground">{fmtKw(a.capacity_kw)}</div>
              )}
            </td>
            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}><SourceBadge a={a} /></td>
            <td className="p-2 text-center">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </td>
            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
              <ActionButtons a={a} isFreeSpare={true} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── 메인 컴포넌트 ─────────────────────────────── */

export default function AvailInventoryTable({
  items,
  allocations,
  onNewAlloc,
  onEdit,
  onConfirm,
  onHold,
  onResume,
  onDelete,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return <EmptyState message="품목 재고 데이터가 없습니다" />;
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-8 p-2" />
            <th className="text-left p-2 font-medium text-muted-foreground">품목</th>
            <th className="text-right p-2 font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                실재고
              </span>
            </th>
            <th className="text-right p-2 font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />
                미착품
              </span>
            </th>
            <th className="text-right p-2 font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                가용재고
              </span>
            </th>
            <th className="text-right p-2 font-medium text-muted-foreground">판매배정</th>
            <th className="text-right p-2 font-medium text-muted-foreground">공사배정</th>
            <th className="text-center p-2 font-medium text-muted-foreground">작업</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isOpen = expandedIds.has(item.product_id);
            const itemAllocs = allocations.filter((a) => a.product_id === item.product_id);
            const saleAllocs = itemAllocs.filter(isSale);
            const constAllocs = itemAllocs.filter(isConstruction);
            const mainAllocs = itemAllocs.filter((a) => !isFreeSpare(a));
            const spareAllocs = itemAllocs.filter(isFreeSpare);
            const saleMainCount = saleAllocs.filter((a) => !isFreeSpare(a)).length;
            const saleSpareCount = saleAllocs.filter(isFreeSpare).length;
            const constMainCount = constAllocs.filter((a) => !isFreeSpare(a)).length;
            const constSpareCount = constAllocs.filter(isFreeSpare).length;

            const saleKw = saleAllocs.reduce((s, a) => s + (a.capacity_kw ?? 0), 0);
            const constKw = constAllocs.reduce((s, a) => s + (a.capacity_kw ?? 0), 0);

            return (
              <Fragment key={item.product_id}>
                {/* 품목 행 */}
                <tr
                  key={item.product_id}
                  className="border-t hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => toggle(item.product_id)}
                >
                  {/* 토글 */}
                  <td className="p-2 text-center text-muted-foreground">
                    {isOpen
                      ? <ChevronDown className="h-3.5 w-3.5 mx-auto" />
                      : <ChevronRight className="h-3.5 w-3.5 mx-auto" />
                    }
                  </td>

                  {/* 품목 */}
                  <td className="p-2">
                    <div className="font-medium leading-tight">
                      {moduleLabel(item.manufacturer_name, item.spec_wp)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {item.product_code}
                      </span>
                      {mainAllocs.length + spareAllocs.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          배정 {allocCountLabel(mainAllocs.length, spareAllocs.length)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 실재고 */}
                  <td className="p-2 text-right tabular-nums">
                    <div className="font-semibold text-blue-600">{fmtKw(item.physical_kw)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {kwToEa(item.physical_kw, item.spec_wp).toLocaleString('ko-KR')} EA
                    </div>
                  </td>

                  {/* 미착품 */}
                  <td className="p-2 text-right tabular-nums">
                    <div className="font-semibold text-yellow-600">{fmtKw(item.incoming_kw)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {kwToEa(item.incoming_kw, item.spec_wp).toLocaleString('ko-KR')} EA
                    </div>
                  </td>

                  {/* 가용재고 */}
                  <td className="p-2 text-right tabular-nums">
                    <div className={`font-semibold ${item.total_secured_kw > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {fmtKw(item.total_secured_kw)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {kwToEa(item.total_secured_kw, item.spec_wp).toLocaleString('ko-KR')} EA
                    </div>
                  </td>

                  {/* 판매배정 */}
                  <td className="p-2 text-right tabular-nums">
                    {saleAllocs.length > 0 ? (
                      <>
                        <div className="font-semibold text-orange-600">{fmtKw(saleKw)}</div>
                        <div className="text-[10px] text-muted-foreground">{allocCountLabel(saleMainCount, saleSpareCount)}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* 공사배정 */}
                  <td className="p-2 text-right tabular-nums">
                    {constAllocs.length > 0 ? (
                      <>
                        <div className="font-semibold text-purple-600">{fmtKw(constKw)}</div>
                        <div className="text-[10px] text-muted-foreground">{allocCountLabel(constMainCount, constSpareCount)}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* 작업 */}
                  <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2"
                      onClick={() => onNewAlloc(item.product_id)}
                    >
                      <Plus className="h-3 w-3 mr-0.5" />예약
                    </Button>
                  </td>
                </tr>

                {/* 펼침 행 */}
                {isOpen && (
                  <tr key={`${item.product_id}-expand`} className="border-t bg-muted/5">
                    <td colSpan={8} className="px-8 py-3">
                      <div className="space-y-3">
                        {itemAllocs.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-1">등록된 예약 내역이 없습니다.</p>
                        )}

                        {saleAllocs.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                                판매 예약 {allocCountLabel(saleMainCount, saleSpareCount)}
                              </span>
                            </div>
                            <AllocSubTable
                              allocs={saleAllocs}
                              colorClass=""
                              onEdit={onEdit}
                              onConfirm={onConfirm}
                              onHold={onHold}
                              onResume={onResume}
                              onDelete={onDelete}
                            />
                          </div>
                        )}

                        {constAllocs.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                                공사 예약 {allocCountLabel(constMainCount, constSpareCount)}
                              </span>
                            </div>
                            <AllocSubTable
                              allocs={constAllocs}
                              colorClass=""
                              onEdit={onEdit}
                              onConfirm={onConfirm}
                              onHold={onHold}
                              onResume={onResume}
                              onDelete={onDelete}
                            />
                          </div>
                        )}

                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
