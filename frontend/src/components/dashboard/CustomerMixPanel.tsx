import { CircleDollarSign, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKRW, moduleLabel } from '@/lib/utils';
import type { SaleListItem } from '@/types/outbound';
import type { Manufacturer, Product } from '@/types/masters';

interface CustomerRow {
  customer_id?: string;
  customer_name: string;
  revenue_krw?: number;
  margin_krw?: number;
  margin_rate?: number;
}

interface Props {
  customers: CustomerRow[];
  sales: SaleListItem[];
  products: Product[];
  manufacturers: Manufacturer[];
  showMargin: boolean;
  showDetail: boolean;
}

interface ProductShare {
  label: string;
  kw: number;
}

interface SalesRevenue {
  customerId: string;
  customerName: string;
  revenue: number;
}

interface CustomerShareRow {
  key: string;
  customerName: string;
  revenue: number;
  margin: number;
  marginRate?: number;
  revenuePct: number;
  marginPct: number;
  topProducts: ProductShare[];
}

interface ManufacturerShareRow {
  key: string;
  name: string;
  revenue: number;
  margin: number;
  marginRate: number;
  revenuePct: number;
}

function productLabel(
  productId: string | undefined,
  products: Product[],
  manufacturers: Manufacturer[],
  fallbackName?: string,
  fallbackWp?: number,
): string {
  const product = productId ? products.find((p) => p.product_id === productId) : undefined;
  const specWp = product?.spec_wp ?? fallbackWp ?? 0;
  const manufacturer = product
    ? manufacturers.find((m) => m.manufacturer_id === product.manufacturer_id)
    : undefined;
  const manufacturerName = manufacturer?.short_name || manufacturer?.name_kr || product?.manufacturer_name || '';
  if (manufacturerName && specWp > 0) return moduleLabel(manufacturerName, specWp);
  if (fallbackName && specWp > 0) return `${fallbackName} ${specWp}W`;
  return fallbackName || '품목 미지정';
}

function buildSalesRevenueMap(sales: SaleListItem[]): Map<string, SalesRevenue> {
  const map = new Map<string, SalesRevenue>();
  for (const sale of sales) {
    if (!sale.customer_id) continue;
    const amount = sale.sale?.supply_amount ?? sale.supply_amount ?? 0;
    const prev = map.get(sale.customer_id);
    map.set(sale.customer_id, {
      customerId: sale.customer_id,
      customerName: sale.customer_name || sale.sale?.customer_name || prev?.customerName || '거래처 미지정',
      revenue: (prev?.revenue || 0) + amount,
    });
  }
  return map;
}

function buildTopProducts(
  customerId: string | undefined,
  sales: SaleListItem[],
  products: Product[],
  manufacturers: Manufacturer[],
): ProductShare[] {
  if (!customerId) return [];
  const map = new Map<string, ProductShare>();
  for (const sale of sales) {
    if (sale.customer_id !== customerId) continue;
    const label = productLabel(sale.product_id, products, manufacturers, sale.product_name, sale.spec_wp);
    const kw = sale.capacity_kw ?? (sale.quantity && sale.spec_wp ? sale.quantity * sale.spec_wp / 1000 : 0);
    const prev = map.get(label);
    map.set(label, { label, kw: (prev?.kw || 0) + kw });
  }
  return Array.from(map.values())
    .filter((item) => item.kw > 0)
    .sort((a, b) => b.kw - a.kw)
    .slice(0, 2);
}

function buildManufacturerRows(
  sales: SaleListItem[],
  products: Product[],
  manufacturers: Manufacturer[],
  totalRevenue: number,
  totalMargin: number,
): ManufacturerShareRow[] {
  const overallMarginRate = totalRevenue > 0 ? totalMargin / totalRevenue : 0;
  const map = new Map<string, { name: string; revenue: number }>();
  for (const sale of sales) {
    const revenue = sale.sale?.supply_amount ?? sale.supply_amount ?? 0;
    if (revenue <= 0) continue;
    const product = sale.product_id ? products.find((p) => p.product_id === sale.product_id) : undefined;
    const manufacturer = product
      ? manufacturers.find((m) => m.manufacturer_id === product.manufacturer_id)
      : undefined;
    const name = manufacturer?.short_name || manufacturer?.name_kr || product?.manufacturer_name || '제조사 미지정';
    const prev = map.get(name) || { name, revenue: 0 };
    prev.revenue += revenue;
    map.set(name, prev);
  }
  return Array.from(map.entries())
    .map(([key, row]) => {
      const margin = row.revenue * overallMarginRate;
      return {
        key,
        name: row.name,
        revenue: row.revenue,
        margin,
        marginRate: overallMarginRate * 100,
        revenuePct: totalRevenue > 0 ? row.revenue / totalRevenue * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function mw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0MW';
  return `${(value / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}MW`;
}

export default function CustomerMixPanel({
  customers, sales, products, manufacturers, showMargin, showDetail,
}: Props) {
  const salesRevenueMap = buildSalesRevenueMap(sales);
  const customerMap = new Map<string, CustomerRow>();
  for (const customer of customers) {
    customerMap.set(customer.customer_id ?? customer.customer_name, customer);
  }
  for (const saleCustomer of salesRevenueMap.values()) {
    if (!customerMap.has(saleCustomer.customerId)) {
      customerMap.set(saleCustomer.customerId, {
        customer_id: saleCustomer.customerId,
        customer_name: saleCustomer.customerName,
      });
    }
  }

  const mergedCustomers = Array.from(customerMap.values());
  const totalRevenue = mergedCustomers.reduce((sum, customer) => {
    const salesRevenue = customer.customer_id ? salesRevenueMap.get(customer.customer_id)?.revenue : undefined;
    return sum + (salesRevenue ?? customer.revenue_krw ?? 0);
  }, 0);
  const totalMargin = customers.reduce((sum, customer) => sum + Math.max(customer.margin_krw || 0, 0), 0);
  const rows: CustomerShareRow[] = mergedCustomers
    .map((customer, index) => {
      const salesRevenue = customer.customer_id ? salesRevenueMap.get(customer.customer_id)?.revenue : undefined;
      const revenue = salesRevenue ?? customer.revenue_krw ?? 0;
      const margin = customer.margin_krw || 0;
      const marginRate = revenue > 0 && customer.margin_krw != null
        ? (customer.margin_krw / revenue) * 100
        : customer.margin_rate;
      return {
        key: customer.customer_id ?? `${customer.customer_name}-${index}`,
        customerName: customer.customer_name,
        revenue,
        margin,
        marginRate,
        revenuePct: totalRevenue > 0 ? revenue / totalRevenue * 100 : 0,
        marginPct: totalMargin > 0 ? Math.max(margin, 0) / totalMargin * 100 : 0,
        topProducts: buildTopProducts(customer.customer_id, sales, products, manufacturers),
      };
    })
    .filter((row) => row.revenue > 0 || row.margin > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const visibleRows = showDetail ? rows.slice(0, 6) : rows.slice(0, 3);
  const manufacturerRows = buildManufacturerRows(sales, products, manufacturers, totalRevenue, totalMargin);
  const overallMarginRate = totalRevenue > 0 ? totalMargin / totalRevenue * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">거래처 비중 {showMargin ? '·이익' : ''}</CardTitle>
        <p className="text-xs text-muted-foreground">
          매출 기여도와 주 판매 모듈을 함께 봅니다.
        </p>
      </CardHeader>
      <CardContent>
        {visibleRows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">데이터 없음</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {visibleRows.map((row, index) => (
              <div key={row.key} className="rounded-md border p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {index === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      <p className="truncate text-sm font-semibold">{row.customerName}</p>
                    </div>
                    {row.topProducts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.topProducts.map((product) => (
                          <span key={product.label} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {product.label} · {mw(product.kw)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="font-semibold">{formatKRW(row.revenue)}</p>
                    <p className="text-muted-foreground">{row.revenuePct.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="w-12 text-muted-foreground">매출</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(row.revenuePct, 100)}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums">{row.revenuePct.toFixed(1)}%</span>
                  </div>
                  {showMargin && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-[14px]" />
                      <span className="w-12 text-muted-foreground">이익</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-600/75" style={{ width: `${Math.min(row.marginPct, 100)}%` }} />
                      </div>
                      <span className="w-12 text-right tabular-nums">{row.marginPct.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {showMargin && (
                  <div className="mt-2 flex justify-between border-t pt-2 text-[11px] text-muted-foreground">
                    <span>이익 {formatKRW(Math.round(row.margin))}</span>
                    <span>이익률 {row.marginRate != null ? `${row.marginRate.toFixed(1)}%` : '-'}</span>
                  </div>
                )}
              </div>
            ))}
            {manufacturerRows.slice(0, 2).map((row) => (
              <div key={`mfg-${row.key}`} className="rounded-md border p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">제조사 · {row.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">매출 {row.revenuePct.toFixed(1)}%</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="font-semibold">{formatKRW(row.revenue)}</p>
                    {showMargin && <p className="text-muted-foreground">이익률 {row.marginRate.toFixed(1)}%</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="w-12 text-muted-foreground">매출</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(row.revenuePct, 100)}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums">{row.revenuePct.toFixed(1)}%</span>
                  </div>
                  {showMargin && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-[14px]" />
                      <span className="w-12 text-muted-foreground">이익</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-600/75" style={{ width: `${Math.min(row.marginRate, 100)}%` }} />
                      </div>
                      <span className="w-12 text-right tabular-nums">{row.marginRate.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                {showMargin && (
                  <div className="mt-2 flex justify-between border-t pt-2 text-[11px] text-muted-foreground">
                    <span>추정 이익 {formatKRW(Math.round(row.margin))}</span>
                    <span>전체 이익률 적용</span>
                  </div>
                )}
              </div>
            ))}
            {showMargin && (
              <div className="rounded-md border p-3">
                <p className="text-sm font-semibold">전체 이익률</p>
                <p className="mt-1 text-xs text-muted-foreground">매출 대비 이익 기준입니다.</p>
                <div className="mt-4 text-2xl font-semibold tabular-nums">{overallMarginRate.toFixed(1)}%</div>
                <div className="mt-2 flex justify-between border-t pt-2 text-[11px] text-muted-foreground">
                  <span>총 이익</span>
                  <span>{formatKRW(Math.round(totalMargin))}</span>
                </div>
              </div>
            )}
          </div>
        )}
        {!showDetail && rows.length > visibleRows.length && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            ※ 상위 {visibleRows.length}개 거래처만 표시됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
