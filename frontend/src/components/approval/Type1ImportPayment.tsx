// 유형 1: 수입 모듈대금 — LC 선택 → 자동 조회 → 텍스트 생성
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useType1 } from '@/hooks/useApproval';
import { useLCList, usePOList } from '@/hooks/useProcurement';
import { generateType1 } from '@/lib/approvalTemplates';
import { manufacturerRankByName } from '@/lib/manufacturerPriority';
import { formatUSD, moduleLabel } from '@/lib/utils';

interface Props { onGenerate: (text: string) => void }

const lcOptionCollator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });

export default function Type1ImportPayment({ onGenerate }: Props) {
  const [lcId, setLcId] = useState('');
  const { data: lcs, loading: lcsLoading } = useLCList();
  const { data: pos } = usePOList();
  const { data, loading, generate } = useType1();

  useEffect(() => {
    if (data) onGenerate(generateType1(data));
  }, [data, onGenerate]);

  const sortedLcs = useMemo(() => {
    const poById = new Map(pos.map((po) => [po.po_id, po]));

    return [...lcs].sort((a, b) => {
      const poA = poById.get(a.po_id);
      const poB = poById.get(b.po_id);
      const rankDiff =
        manufacturerRankByName(poA?.manufacturer_name ?? '', []) -
        manufacturerRankByName(poB?.manufacturer_name ?? '', []);
      if (rankDiff !== 0) return rankDiff;

      const specDiff = (poA?.first_spec_wp ?? 0) - (poB?.first_spec_wp ?? 0);
      if (specDiff !== 0) return specDiff;

      return lcOptionCollator.compare(a.lc_number ?? a.lc_id, b.lc_number ?? b.lc_id);
    });
  }, [lcs, pos]);

  return (
    <div className="space-y-4">
      <div>
        <Label>LC 선택</Label>
        <select
          className="w-full mt-1 border rounded px-3 py-2 text-sm"
          value={lcId}
          onChange={(e) => setLcId(e.target.value)}
          disabled={lcsLoading}
        >
          <option value="">LC 선택...</option>
          {sortedLcs.map((lc) => {
            const po = pos.find((item) => item.po_id === lc.po_id);
            const modulePart = moduleLabel(po?.manufacturer_name, po?.first_spec_wp);
            return (
              <option key={lc.lc_id} value={lc.lc_id}>
                {modulePart} · {lc.lc_number ?? lc.lc_id.slice(0, 8)} — {lc.bank_name} — {formatUSD(lc.amount_usd)}
              </option>
            );
          })}
        </select>
      </div>
      <Button onClick={() => generate(lcId)} disabled={!lcId || loading} size="sm">
        {loading ? '생성 중...' : '결재안 생성'}
      </Button>
    </div>
  );
}
