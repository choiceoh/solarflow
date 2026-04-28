import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatNumber, formatKRW } from '@/lib/utils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useExchangeCompare } from '@/hooks/useExchange';

// 비유: 최근 면장 환율로 과거 면장 단가를 다시 비춰보는 환율 영향판
export default function ExchangeComparePanel() {
  const { result, loading, error, compare } = useExchangeCompare();
  const items = result?.items ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm">환율 영향 비교</CardTitle>
          <Button onClick={compare} disabled={loading} size="sm">
            <ArrowRightLeft className="mr-1.5 h-4 w-4" />조회
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground">
          {result ? (
            <span>
              기준 환율: {result.latest_rate > 0 ? formatNumber(result.latest_rate) : '법인별 적용'} · {result.latest_rate_source}
            </span>
          ) : (
            <span>최근 면장 환율로 기존 원가 영향을 계산합니다.</span>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && <LoadingSpinner />}

      {result && items.length > 0 && (
        <Card>
          <CardContent className="px-4 py-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>면장</TableHead>
                  <TableHead>품목</TableHead>
                  <TableHead className="text-right">계약환율</TableHead>
                  <TableHead className="text-right">계약 CIF</TableHead>
                  <TableHead className="text-right">최근환율 CIF</TableHead>
                  <TableHead className="text-right">영향</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  // 양수=빨간(원화부담 증가), 음수=초록(감소)
                  const diffColor = item.rate_impact_krw > 0
                    ? 'text-red-600 font-medium'
                    : item.rate_impact_krw < 0
                    ? 'text-green-600 font-medium'
                    : '';

                  return (
                    <TableRow key={`${item.declaration_number}-${item.product_name}-${index}`}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{item.declaration_number}</div>
                        <div className="text-[10px] text-muted-foreground">{item.declaration_date}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{item.product_name}</div>
                        <div className="text-[10px] text-muted-foreground">{item.manufacturer_name}</div>
                      </TableCell>
                      <TableCell className="text-xs text-right">{formatNumber(item.contract_rate)}</TableCell>
                      <TableCell className="text-xs text-right">{formatKRW(item.cif_wp_at_contract)}</TableCell>
                      <TableCell className="text-xs text-right">{formatKRW(item.cif_wp_at_latest)}</TableCell>
                      <TableCell className={`text-xs text-right ${diffColor}`}>
                        {item.rate_impact_krw > 0 ? '+' : ''}{formatKRW(item.rate_impact_krw)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {result && items.length === 0 && (
        <Card>
          <CardContent className="px-4 py-6 text-center text-sm text-muted-foreground">
            환율 비교 대상 면장 원가가 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
