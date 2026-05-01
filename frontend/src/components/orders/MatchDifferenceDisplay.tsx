import { formatNumber } from '@/lib/utils';

interface Props {
  receiptAmount: number;
  selectedTotal: number;
}

// 비유: 차액 = 입금액 - 선택 합계. 양수=선수금(돈이 남음), 음수=부족(매칭 불가), 0=정확 일치
export default function MatchDifferenceDisplay({ receiptAmount, selectedTotal }: Props) {
  const diff = receiptAmount - selectedTotal;

  const tone = diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'info';
  const label = diff > 0 ? '선수금' : diff < 0 ? '부족' : '정확 일치';

  return (
    <div className={`sf-banner ${tone} flex-col items-stretch`}>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="sf-eyebrow" style={{ color: 'inherit', opacity: 0.85 }}>입금액</span>
        <span className="sf-mono font-semibold tabular-nums">{formatNumber(receiptAmount)}원</span>
      </div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="sf-eyebrow" style={{ color: 'inherit', opacity: 0.85 }}>선택 합계</span>
        <span className="sf-mono font-semibold tabular-nums">{formatNumber(selectedTotal)}원</span>
      </div>
      <div
        className="mt-1 flex items-baseline justify-between border-t pt-1.5 text-[12px] font-bold"
        style={{ borderColor: 'currentColor', borderTopWidth: 1, opacity: 1 }}
      >
        <span>차액 · {label}</span>
        <span className="sf-mono tabular-nums">{diff >= 0 ? '+' : ''}{formatNumber(diff)}원</span>
      </div>
    </div>
  );
}
