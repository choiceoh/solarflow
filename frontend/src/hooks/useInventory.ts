import { useAppStore } from '@/stores/appStore';
import { fetchCalc } from '@/lib/companyUtils';
import { useDetailQuery } from '@/lib/queryHelpers';
import type { InventoryResponse } from '@/types/inventory';

interface UseInventoryOptions {
  manufacturerId?: string;
  productId?: string;
}

export function useInventory(opts: UseInventoryOptions = {}) {
  const selectedCompanyId = useAppStore((s) => s.selectedCompanyId);

  const q = useDetailQuery<InventoryResponse>(
    ['inventory', selectedCompanyId, opts.manufacturerId, opts.productId],
    () => {
      const extra: Record<string, unknown> = {};
      if (opts.manufacturerId) extra.manufacturer_id = opts.manufacturerId;
      if (opts.productId) extra.product_id = opts.productId;
      return fetchCalc<InventoryResponse>(
        selectedCompanyId!,
        '/api/v1/calc/inventory',
        extra,
      );
    },
    { enabled: !!selectedCompanyId },
  );

  let error = q.error;
  if (!selectedCompanyId) {
    error = '법인을 선택해주세요';
  } else if (error && (error.includes('503') || error.includes('unavailable'))) {
    error = '계산 엔진이 일시적으로 사용할 수 없습니다';
  }

  return { data: q.data, loading: q.loading, error, reload: q.reload };
}
