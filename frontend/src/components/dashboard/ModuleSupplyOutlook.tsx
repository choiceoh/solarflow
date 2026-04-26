import { AlertTriangle, Building2, ShoppingCart, Ship, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn, moduleLabel } from '@/lib/utils';
import { manufacturerRankByName } from '@/lib/manufacturerPriority';
import type { ForecastResponse, ProductForecast } from '@/types/inventory';
import type { TurnoverResponse } from '@/types/turnover';
import type { Manufacturer } from '@/types/masters';

interface Props {
  forecast: ForecastResponse;
  turnover?: TurnoverResponse | null;
  manufacturers?: Manufacturer[];
}

function mw(value: number | null | undefined, digits = 1): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n / 1000).toFixed(digits)}MW` : '—';
}

function sumProductMonths(product: ProductForecast, key: 'incoming_kw' | 'outgoing_sale_kw' | 'outgoing_construction_kw'): number {
  return product.months.reduce((sum, month) => sum + (month[key] || 0), 0);
}

function lastAvailable(product: ProductForecast): number {
  const last = product.months[product.months.length - 1];
  return last?.available_kw ?? 0;
}

function firstOpening(product: ProductForecast): number {
  const first = product.months[0];
  return first?.opening_kw ?? 0;
}

function minAvailable(product: ProductForecast): number {
  if (product.months.length === 0) return 0;
  return Math.min(...product.months.map((m) => m.available_kw));
}

export default function ModuleSupplyOutlook({ forecast, turnover, manufacturers = [] }: Props) {
  const months = forecast.summary.months.slice(0, 6);
  const products = forecast.products || [];
  const totalIncoming = months.reduce((sum, month) => sum + month.total_incoming_kw, 0);
  const endingAvailable = months[months.length - 1]?.total_available_kw ?? 0;
  const shortageCount = products.filter((product) => product.months.some((m) => m.insufficient)).length;

  const pressureRows = products
    .map((product) => ({
      product,
      openingKw: firstOpening(product),
      saleKw: sumProductMonths(product, 'outgoing_sale_kw'),
      constructionKw: sumProductMonths(product, 'outgoing_construction_kw'),
      incomingKw: sumProductMonths(product, 'incoming_kw'),
      endingAvailableKw: lastAvailable(product),
      minAvailableKw: minAvailable(product),
      insufficient: product.months.some((m) => m.insufficient),
    }))
    .filter((row) => row.openingKw > 0 || row.saleKw > 0 || row.constructionKw > 0 || row.incomingKw > 0 || row.endingAvailableKw > 0)
    .sort((a, b) => {
      if (a.insufficient !== b.insufficient) return a.insufficient ? -1 : 1;
      const aDemand = a.saleKw + a.constructionKw;
      const bDemand = b.saleKw + b.constructionKw;
      if (aDemand !== bDemand) return bDemand - aDemand;
      const rankDiff = manufacturerRankByName(a.product.manufacturer_name, manufacturers) - manufacturerRankByName(b.product.manufacturer_name, manufacturers);
      if (rankDiff !== 0) return rankDiff;
      if (a.endingAvailableKw !== b.endingAvailableKw) return b.endingAvailableKw - a.endingAvailableKw;
      return a.minAvailableKw - b.minAvailableKw;
    })
    .slice(0, 5);

  const summaryItems = [
    { label: '90일 출고', value: mw(turnover?.total.outbound_kw ?? 0), icon: ShoppingCart, tone: 'text-indigo-600 bg-indigo-50' },
    { label: '현재 재고', value: mw(turnover?.total.inventory_kw ?? 0), icon: Warehouse, tone: 'text-slate-600 bg-slate-50' },
    { label: '6개월 입고예정', value: mw(totalIncoming), icon: Ship, tone: 'text-blue-600 bg-blue-50' },
    { label: '기말 가용', value: mw(endingAvailable), icon: Warehouse, tone: 'text-emerald-600 bg-emerald-50' },
    { label: '부족 품목', value: `${shortageCount}건`, icon: AlertTriangle, tone: shortageCount > 0 ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">모듈 수급 전망</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            입고예정, 판매출고, 공사출고를 함께 봅니다.
          </p>
        </div>
        <Link to="/inventory?tab=forecast" className="text-xs font-medium text-primary hover:underline">
          상세 보기
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {summaryItems.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-2 rounded-md border bg-muted/10 px-3 py-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', tone)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>월</TableHead>
                  <TableHead className="text-right">입고</TableHead>
                  <TableHead className="text-right">출고</TableHead>
                  <TableHead className="text-right">가용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="text-xs font-medium">{month.month}</TableCell>
                    <TableCell className="text-right text-xs">{mw(month.total_incoming_kw)}</TableCell>
                    <TableCell className="text-right text-xs">{mw(month.total_outgoing_kw)}</TableCell>
                    <TableCell className={cn(
                      'text-right text-xs font-medium',
                      month.total_available_kw < 0 ? 'text-red-600' : 'text-emerald-700',
                    )}>
                      {mw(month.total_available_kw)}
                    </TableCell>
                  </TableRow>
                ))}
                {months.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                      수급 전망 데이터가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>모듈</TableHead>
                  <TableHead className="text-right">현재</TableHead>
                  <TableHead className="text-right">판매</TableHead>
                  <TableHead className="text-right">공사</TableHead>
                  <TableHead className="text-right">기말가용</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pressureRows.map(({ product, openingKw, saleKw, constructionKw, endingAvailableKw, insufficient }) => (
                  <TableRow key={product.product_id} className={insufficient ? 'bg-red-50/40' : undefined}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{moduleLabel(product.manufacturer_name, product.spec_wp)}</div>
                      <div className="text-[11px] text-muted-foreground">{product.product_name}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{mw(openingKw)}</TableCell>
                    <TableCell className="text-right text-xs">{mw(saleKw)}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {mw(constructionKw)}
                      </span>
                    </TableCell>
                    <TableCell className={cn('text-right text-xs font-medium', endingAvailableKw < 0 ? 'text-red-600' : 'text-foreground')}>
                      {mw(endingAvailableKw)}
                    </TableCell>
                    <TableCell>
                      {insufficient ? (
                        <Badge variant="destructive">부족</Badge>
                      ) : (
                        <Badge variant="secondary">정상</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {pressureRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                      품목별 전망 데이터가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
