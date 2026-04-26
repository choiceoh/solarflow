/**
 * StrategicDashboard — 전략/요약 뷰 (executive · manager · viewer 공용)
 *
 * 비유: "경영 관점 대시보드 — 역할에 따라 가리개(mask)가 다름"
 *
 * 권한 매트릭스 (permissions.ts 단일 정본):
 *   - executive:
 *       showPrice=true · showMargin=true · showSales=true · showDetail=true · showReceivable=true · showLcLimit=true
 *       → 전체 노출 (요약카드 전체, 이익 포함 매출, 단가 추이, Movers 상세 제품명)
 *   - manager:
 *       showPrice=false · showMargin=false · showSales=true · showDetail=false · showReceivable=false · showLcLimit=false
 *       → 매출 총액 가능, 이익/단가/미수/LC 한도 마스킹, 드릴다운 억제
 *   - viewer:
 *       showPrice=false · showMargin=false · showSales=false · showDetail=false
 *       → 재고·가용재고만. 매출/가격 전부 마스킹
 *
 * 쇼룸 원칙: 벤치마크·변화 화살표·부정적 알림 없음. 잘 돌아가고 있음을 담담히.
 */
import LoadingSpinner from '@/components/common/LoadingSpinner';
import StrategicSummaryCards from './StrategicSummaryCards';
import MonthlyRevenueChart from './MonthlyRevenueChart';
import PriceTrendChart from './PriceTrendChart';
import ManufacturerMatrix from './ManufacturerMatrix';
import CustomerRevenueTable from './CustomerRevenueTable';
import ModuleSupplyOutlook from './ModuleSupplyOutlook';
import ModuleMixPanel from './ModuleMixPanel';
import type {
  DashboardSectionState, DashboardSummary, MonthlyRevenue, PriceTrend,
} from '@/types/dashboard';
import type { ForecastResponse, InventoryResponse } from '@/types/inventory';
import type { TurnoverResponse } from '@/types/turnover';
import type { CustomerAnalysis } from '@/hooks/useDashboard';
import type { Manufacturer } from '@/types/masters';

interface StrategicFlags {
  showPrice: boolean;      // 단가/재고금액
  showMargin: boolean;     // 이익/이익률
  showSales: boolean;      // 매출 총액
  showDetail: boolean;     // 제품명/거래처 드릴다운
  showReceivable: boolean; // 미수금
  showLcLimit: boolean;    // LC 가용한도
}

interface Props {
  summary: DashboardSectionState<DashboardSummary>;
  revenue: DashboardSectionState<MonthlyRevenue>;
  priceTrend: DashboardSectionState<PriceTrend>;
  inventory: { data: InventoryResponse | null; loading: boolean; error: string | null };
  turnover: { data: TurnoverResponse | null; loading: boolean; error: string | null };
  forecast: { data: ForecastResponse | null; loading: boolean; error: string | null };
  outstanding: DashboardSectionState<CustomerAnalysis>;
  manufacturers: Manufacturer[];
  longTermWarning: number;
  longTermCritical: number;
  flags: StrategicFlags;
}

function SectionError({ msg }: { msg: string }) {
  return <p className="text-sm text-red-500 text-center py-4">{msg}</p>;
}

export default function StrategicDashboard({
  summary, revenue, priceTrend, inventory, turnover, forecast, outstanding,
  manufacturers, longTermWarning, longTermCritical, flags,
}: Props) {
  void longTermWarning;
  void longTermCritical;

  const customerRows = (outstanding.data?.items || [])
    .map((c) => ({
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      revenue_krw: c.total_sales_krw,
      margin_krw: c.total_margin_krw ?? undefined,
      margin_rate: c.avg_margin_rate ?? undefined,
    }))
    .filter((c) => (c.revenue_krw ?? 0) > 0);

  return (
    <div className="space-y-4">
      {/* 1. 요약 카드 — flag=false면 해당 카드 제거 (마스킹 없이 아예 비표시) */}
      {summary.loading ? <LoadingSpinner /> : summary.error ? (
        <SectionError msg={summary.error} />
      ) : summary.data ? (
        <StrategicSummaryCards
          summary={summary.data}
          revenue={revenue.data}
          flags={{ showSales: flags.showSales, showReceivable: flags.showReceivable, showLcLimit: flags.showLcLimit }}
        />
      ) : null}

      {/* 2. 모듈 수급 전망 — 대시보드의 핵심 판단 영역 */}
      {forecast.loading ? <LoadingSpinner /> : forecast.error ? (
        <SectionError msg={forecast.error} />
      ) : forecast.data ? (
        <ModuleSupplyOutlook forecast={forecast.data} turnover={turnover.data} manufacturers={manufacturers} />
      ) : null}

      {/* 3. 재고 매트릭스 + 거래처별 매출/이익 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {inventory.loading || turnover.loading ? <LoadingSpinner /> :
        inventory.error ? <SectionError msg={inventory.error} /> :
        turnover.error ? <SectionError msg={turnover.error} /> :
        inventory.data && turnover.data ? (
          <ManufacturerMatrix inventory={inventory.data.items} matrix={turnover.data.matrix} manufacturers={manufacturers} />
        ) : null}

        {flags.showSales && outstanding.data && (
          <CustomerRevenueTable
            customers={customerRows}
            showMargin={flags.showMargin}
            showDetail={flags.showDetail}
          />
        )}
      </div>

      {turnover.data && forecast.data && (
        <ModuleMixPanel turnover={turnover.data} forecast={forecast.data} manufacturers={manufacturers} />
      )}

      {/* 4. 매출·단가 차트 — 단가 추이는 보조지표로 축소 */}
      {(flags.showSales || flags.showPrice) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          {flags.showSales && flags.showMargin && (
            revenue.loading ? <LoadingSpinner /> : revenue.error ? (
              <SectionError msg={revenue.error} />
            ) : revenue.data ? (
              <MonthlyRevenueChart data={revenue.data} />
            ) : null
          )}

          {flags.showPrice && (
            priceTrend.loading ? <LoadingSpinner /> : priceTrend.error ? (
              <SectionError msg={priceTrend.error} />
            ) : priceTrend.data ? (
              <PriceTrendChart data={priceTrend.data} compact />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
