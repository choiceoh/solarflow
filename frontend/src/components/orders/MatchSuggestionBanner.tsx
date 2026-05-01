import { CheckCircle2, Sparkles } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { MatchSuggestion } from '@/types/orders';

interface Props {
  suggestion: MatchSuggestion;
}

const MESSAGE: Record<MatchSuggestion['match_type'], string> = {
  exact: '정확히 일치하는 미수금을 찾았습니다',
  closest: '가장 가까운 조합입니다',
  single: '단건 매칭합니다',
};

export default function MatchSuggestionBanner({ suggestion }: Props) {
  const isExact = suggestion.match_type === 'exact';
  return (
    <div className={`sf-banner ${isExact ? 'pos' : 'info'}`}>
      {isExact
        ? <CheckCircle2 className="sf-banner-icon h-3.5 w-3.5" />
        : <Sparkles className="sf-banner-icon h-3.5 w-3.5" />}
      <div className="sf-banner-body">
        <div className="font-semibold">{MESSAGE[suggestion.match_type]}</div>
        {suggestion.difference !== 0 && (
          <div className="sf-mono mt-0.5 text-[11px] tabular-nums">차액 {formatNumber(Math.abs(suggestion.difference))}원</div>
        )}
      </div>
    </div>
  );
}
