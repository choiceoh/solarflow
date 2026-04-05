import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DataTable, { type Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ProductForm from '@/components/masters/ProductForm';
import { fetchWithAuth } from '@/lib/api';
import { formatWp, formatSize } from '@/lib/utils';
import type { Product, Manufacturer } from '@/types/masters';

// 기본 정렬: 제조사→규격(Wp)→크기(mm) ascending
function sortProducts(items: Product[]): Product[] {
  return [...items].sort((a, b) => {
    const mfgCmp = (a.manufacturer_name ?? '').localeCompare(b.manufacturer_name ?? '', 'ko');
    if (mfgCmp !== 0) return mfgCmp;
    if (a.spec_wp !== b.spec_wp) return a.spec_wp - b.spec_wp;
    if (a.module_width_mm !== b.module_width_mm) return a.module_width_mm - b.module_width_mm;
    return a.module_height_mm - b.module_height_mm;
  });
}

export default function ProductPage() {
  const [data, setData] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [filterMfg, setFilterMfg] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [products, mfgs] = await Promise.all([
        fetchWithAuth<Product[]>('/api/v1/products'),
        fetchWithAuth<Manufacturer[]>('/api/v1/manufacturers'),
      ]);
      setData(products.map((p) => ({
        ...p,
        manufacturer_name: mfgs.find((m) => m.manufacturer_id === p.manufacturer_id)?.name_kr ?? '',
      })));
      setManufacturers(mfgs.filter((m) => m.is_active));
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let items = data;
    if (filterMfg) {
      items = items.filter((p) => p.manufacturer_id === filterMfg);
    }
    if (search) {
      const lower = search.toLowerCase();
      items = items.filter((p) =>
        p.product_code.toLowerCase().includes(lower) ||
        p.product_name.toLowerCase().includes(lower) ||
        (p.manufacturer_name ?? '').toLowerCase().includes(lower)
      );
    }
    return sortProducts(items);
  }, [data, search, filterMfg]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (editTarget) {
      await fetchWithAuth(`/api/v1/products/${editTarget.product_id}`, { method: 'PUT', body: JSON.stringify(formData) });
    } else {
      await fetchWithAuth('/api/v1/products', { method: 'POST', body: JSON.stringify(formData) });
    }
    setEditTarget(null);
    load();
  };

  const columns: Column<Product>[] = [
    { key: 'product_code', label: '품번코드', sortable: true },
    { key: 'manufacturer_name', label: '제조사', sortable: true },
    { key: 'product_name', label: '품명', sortable: true },
    { key: 'spec_wp', label: '규격(Wp)', sortable: true, render: (r) => formatWp(r.spec_wp) },
    { key: 'module_width_mm', label: '크기(mm)', sortable: true, render: (r) => formatSize(r.module_width_mm, r.module_height_mm) },
    { key: 'is_active', label: '활성', render: (r) => <StatusBadge isActive={r.is_active} /> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">품번 관리</h1>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={filterMfg}
            onChange={(e) => setFilterMfg(e.target.value)}
          >
            <option value="">전체 제조사</option>
            {manufacturers.map((m) => (
              <option key={m.manufacturer_id} value={m.manufacturer_id}>{m.name_kr}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />새로 등록
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns} data={filtered} loading={loading}
        searchable searchPlaceholder="품번코드, 품명, 제조사 검색" onSearch={setSearch}
        actions={(row) => (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTarget(row); setFormOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      />
      <ProductForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} editData={editTarget} />
    </div>
  );
}
