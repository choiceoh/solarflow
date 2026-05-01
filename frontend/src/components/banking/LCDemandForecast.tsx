import { DollarSign, Wallet, TrendingDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatUSD } from '@/lib/utils';
import SkeletonRows from '@/components/common/SkeletonRows';
import LCDemandByPOTable from './LCDemandByPOTable';
import LCDemandMonthlyTable from './LCDemandMonthlyTable';
import { useLCDemand } from '@/hooks/useLCDemand';

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  toneIcon: { bg: string; color: string };
  toneValue?: string;
  sub?: string;
  subTone?: string;
}

function SummaryCard({ icon, label, value, toneIcon, toneValue, sub, subTone }: SummaryCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-md p-3"
      style={{
        background: 'var(--sf-surface)',
        border: '1px solid var(--sf-line)',
        boxShadow: 'var(--sf-shadow-1)',
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{ background: toneIcon.bg, color: toneIcon.color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="sf-eyebrow">{label}</div>
        <div
          className="sf-mono mt-0.5 text-base font-semibold tabular-nums"
          style={{ color: toneValue || 'var(--sf-ink)' }}
        >
          {value}
        </div>
        {sub && <div className="sf-mono mt-0.5 text-[10px]" style={{ color: subTone || 'var(--sf-ink-3)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function LCDemandForecast() {
  const { demandByPO, monthlyForecast, totalLCNeeded, totalAvailable, shortage, loading, error } = useLCDemand();

  if (loading) return <SkeletonRows rows={4} />;
  if (error) return <p className="py-6 text-center text-sm" style={{ color: 'var(--sf-neg)' }}>{error}</p>;

  const isShortage = shortage < 0;
  const shortageTone = isShortage
    ? { bg: 'var(--sf-neg-bg)', color: 'var(--sf-neg)' }
    : { bg: 'var(--sf-pos-bg)', color: 'var(--sf-pos)' };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<DollarSign className="h-5 w-5" />}
          label="LC 미개설 총액"
          value={formatUSD(totalLCNeeded)}
          toneIcon={{ bg: 'var(--sf-warn-bg)', color: 'var(--sf-warn)' }}
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="가용한도"
          value={formatUSD(totalAvailable)}
          toneIcon={{ bg: 'var(--sf-pos-bg)', color: 'var(--sf-pos)' }}
        />
        <SummaryCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="과부족"
          value={`${shortage >= 0 ? '+' : ''}${formatUSD(shortage)}`}
          toneIcon={shortageTone}
          toneValue={shortageTone.color}
          sub={isShortage ? '부족' : '충분'}
          subTone={shortageTone.color}
        />
      </div>

      <div>
        <div className="sf-eyebrow mb-2">PO별 LC 수요</div>
        <LCDemandByPOTable items={demandByPO} />
      </div>

      <Separator />

      <div>
        <div className="sf-eyebrow mb-2">3개월 예측</div>
        <LCDemandMonthlyTable items={monthlyForecast} />
      </div>
    </div>
  );
}
