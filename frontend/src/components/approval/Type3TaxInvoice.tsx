// 유형 3: 판매 세금계산서 — 거래처+기간 → 매출 조회 → 텍스트 생성
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { PartnerCombobox } from '@/components/common/PartnerCombobox';
import { useType3 } from '@/hooks/useApproval';
import { generateType3 } from '@/lib/approvalTemplates';
import { fetchWithAuth } from '@/lib/api';
import type { Partner } from '@/types/masters';

interface Props { onGenerate: (text: string) => void }

function defaultFrom(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Type3TaxInvoice({ onGenerate }: Props) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data, loading, generate } = useType3();

  useEffect(() => {
    fetchWithAuth<Partner[]>('/api/v1/partners')
      .then((list) => setPartners(list.filter((p) =>
        p.is_active && (p.partner_type === 'customer' || p.partner_type === 'both'),
      )))
      .catch(() => setPartners([]));
  }, []);

  useEffect(() => {
    if (data) onGenerate(generateType3(data));
  }, [data, onGenerate]);

  const customerName = useMemo(
    () => partners.find((p) => p.partner_id === customerId)?.partner_name ?? '',
    [customerId, partners],
  );

  return (
    <div className="space-y-4">
      <div>
        <Label>거래처</Label>
        <div className="mt-1">
          <PartnerCombobox
            partners={partners}
            placeholder="거래처 검색..."
            value={customerId}
            onChange={setCustomerId}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>시작일</Label>
          <DateInput value={from} onChange={setFrom} />
        </div>
        <div>
          <Label>종료일</Label>
          <DateInput value={to} onChange={setTo} />
        </div>
      </div>
      <Button onClick={() => generate(customerId, customerName, from, to)} disabled={!customerId || loading} size="sm">
        {loading ? '생성 중...' : '결재안 생성'}
      </Button>
    </div>
  );
}
