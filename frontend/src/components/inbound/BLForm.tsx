import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/appStore';
import { fetchWithAuth } from '@/lib/api';
import type { BLShipment, InboundType } from '@/types/inbound';
import type { Manufacturer, Product, Warehouse } from '@/types/masters';

const schema = z.object({
  bl_number: z.string().min(1, 'B/L 번호는 필수입니다'),
  inbound_type: z.string().min(1, '입고유형은 필수입니다'),
  manufacturer_id: z.string().min(1, '제조사는 필수입니다'),
  exchange_rate: z.coerce.number().positive('양수').optional().or(z.literal('')),
  etd: z.string().optional(),
  eta: z.string().optional(),
  actual_arrival: z.string().optional(),
  port: z.string().optional(),
  forwarder: z.string().optional(),
  warehouse_id: z.string().optional(),
  invoice_number: z.string().optional(),
  memo: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface LineItem {
  product_id: string;
  quantity: number | '';
  item_type: 'main' | 'spare';
  payment_type: 'paid' | 'free';
  invoice_amount_usd: number | '';
  unit_price_usd_wp: number | '';
}

const emptyLine = (): LineItem => ({
  product_id: '',
  quantity: '',
  item_type: 'main',
  payment_type: 'paid',
  invoice_amount_usd: '',
  unit_price_usd_wp: '',
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  editData?: BLShipment | null;
}

export default function BLForm({ open, onOpenChange, onSubmit, editData }: Props) {
  const selectedCompanyId = useAppStore((s) => s.selectedCompanyId);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const inboundType = watch('inbound_type') as InboundType;
  const manufacturerId = watch('manufacturer_id');
  const isImport = inboundType === 'import';

  useEffect(() => {
    fetchWithAuth<Manufacturer[]>('/api/v1/manufacturers')
      .then((list) => setManufacturers(list.filter((m) => m.is_active))).catch(() => {});
    fetchWithAuth<Warehouse[]>('/api/v1/warehouses')
      .then((list) => setWarehouses(list.filter((w) => w.is_active))).catch(() => {});
  }, []);

  // 제조사 변경 시 해당 제조사 품번만 로드
  useEffect(() => {
    if (!manufacturerId) { setProducts([]); return; }
    fetchWithAuth<Product[]>(`/api/v1/products?manufacturer_id=${manufacturerId}`)
      .then((list) => setProducts(list.filter((p) => p.is_active)))
      .catch(() => setProducts([]));
  }, [manufacturerId]);

  // 제조사 변경 시 라인아이템의 품번 초기화
  const handleManufacturerChange = useCallback((v: string | null) => {
    setValue('manufacturer_id', v ?? '');
    setLines((prev) => prev.map((l) => ({ ...l, product_id: '' })));
  }, [setValue]);

  useEffect(() => {
    if (open) {
      if (editData) {
        reset({
          bl_number: editData.bl_number,
          inbound_type: editData.inbound_type,
          manufacturer_id: editData.manufacturer_id,
          exchange_rate: editData.exchange_rate ?? '',
          etd: editData.etd?.slice(0, 10) ?? '',
          eta: editData.eta?.slice(0, 10) ?? '',
          actual_arrival: editData.actual_arrival?.slice(0, 10) ?? '',
          port: editData.port ?? '',
          forwarder: editData.forwarder ?? '',
          warehouse_id: editData.warehouse_id ?? '',
          invoice_number: editData.invoice_number ?? '',
          memo: editData.memo ?? '',
        });
      } else {
        reset({
          bl_number: '', inbound_type: '', manufacturer_id: '',
          exchange_rate: '', etd: '', eta: '', actual_arrival: '',
          port: '', forwarder: '', warehouse_id: '', invoice_number: '', memo: '',
        });
        setLines([emptyLine()]);
      }
    }
  }, [open, editData, reset]);

  const updateLine = (idx: number, field: keyof LineItem, value: string | number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));

  const calcCapacityKw = (line: LineItem): string => {
    if (!line.product_id || !line.quantity) return '-';
    const product = products.find((p) => p.product_id === line.product_id);
    if (!product) return '-';
    return ((Number(line.quantity) * product.spec_wp) / 1000).toFixed(2);
  };

  const handle = async (data: FormData) => {
    const payload: Record<string, unknown> = {
      ...data,
      company_id: selectedCompanyId,
      currency: data.inbound_type === 'import' ? 'USD' : 'KRW',
      status: editData?.status ?? 'scheduled',
      lines: lines
        .filter((l) => l.product_id && l.quantity)
        .map((l) => {
          const product = products.find((p) => p.product_id === l.product_id);
          const qty = Number(l.quantity);
          return {
            product_id: l.product_id,
            quantity: qty,
            capacity_kw: product ? (qty * product.spec_wp) / 1000 : 0,
            item_type: l.item_type,
            payment_type: l.payment_type,
            invoice_amount_usd: l.invoice_amount_usd === '' ? undefined : Number(l.invoice_amount_usd),
            unit_price_usd_wp: l.unit_price_usd_wp === '' ? undefined : Number(l.unit_price_usd_wp),
          };
        }),
    };
    if (data.exchange_rate === '' || data.exchange_rate === undefined) delete payload.exchange_rate;
    if (!data.etd) delete payload.etd;
    if (!data.eta) delete payload.eta;
    if (!data.actual_arrival) delete payload.actual_arrival;
    if (!data.warehouse_id) delete payload.warehouse_id;
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'B/L 수정' : 'B/L 등록'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handle)} className="space-y-4">
          {/* 기본 정보 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>B/L 번호 *</Label>
              <Input {...register('bl_number')} />
              {errors.bl_number && <p className="text-xs text-destructive">{errors.bl_number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>입고유형 *</Label>
              <Select value={watch('inbound_type') ?? ''} onValueChange={(v) => setValue('inbound_type', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="import">해외직수입</SelectItem>
                  <SelectItem value="domestic">국내구매</SelectItem>
                  <SelectItem value="group">그룹내구매</SelectItem>
                </SelectContent>
              </Select>
              {errors.inbound_type && <p className="text-xs text-destructive">{errors.inbound_type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>제조사 *</Label>
              <Select value={manufacturerId ?? ''} onValueChange={handleManufacturerChange}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.manufacturer_id} value={m.manufacturer_id}>{m.name_kr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.manufacturer_id && <p className="text-xs text-destructive">{errors.manufacturer_id.message}</p>}
            </div>
          </div>

          {isImport && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>환율 (USD→KRW)</Label>
                  <Input type="number" step="0.01" {...register('exchange_rate')} />
                </div>
                <div className="space-y-1.5"><Label>ETD</Label><Input type="date" {...register('etd')} /></div>
                <div className="space-y-1.5"><Label>ETA</Label><Input type="date" {...register('eta')} /></div>
                <div className="space-y-1.5"><Label>실제입항</Label><Input type="date" {...register('actual_arrival')} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>항구</Label><Input {...register('port')} placeholder="광양항" /></div>
                <div className="space-y-1.5"><Label>포워더</Label><Input {...register('forwarder')} /></div>
                <div className="space-y-1.5"><Label>Invoice No.</Label><Input {...register('invoice_number')} /></div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>입고 창고</Label>
              <Select value={watch('warehouse_id') ?? ''} onValueChange={(v) => setValue('warehouse_id', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name} ({w.location_name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>메모</Label><Textarea {...register('memo')} rows={1} /></div>
          </div>

          {/* 라인아이템 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">라인아이템</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={!manufacturerId}>
                <Plus className="mr-1 h-3.5 w-3.5" />추가
              </Button>
            </div>

            {!manufacturerId && (
              <p className="text-xs text-muted-foreground">제조사를 먼저 선택하세요</p>
            )}

            {manufacturerId && lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_90px_90px_100px_100px_80px_32px] gap-1.5 items-end">
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">품번 *</Label>}
                  <Select value={line.product_id} onValueChange={(v) => updateLine(idx, 'product_id', v ?? '')}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="품번 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.product_id} value={p.product_id}>
                          {p.product_code} ({p.spec_wp}W)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">수량EA *</Label>}
                  <Input
                    type="number" min={1} className="h-8 text-xs"
                    value={line.quantity} placeholder="0"
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">구분 *</Label>}
                  <Select value={line.item_type} onValueChange={(v) => updateLine(idx, 'item_type', v ?? 'main')}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">본품</SelectItem>
                      <SelectItem value="spare">스페어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">유무상 *</Label>}
                  <Select value={line.payment_type} onValueChange={(v) => updateLine(idx, 'payment_type', v ?? 'paid')}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">유상</SelectItem>
                      <SelectItem value="free">무상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">인보이스USD</Label>}
                  <Input
                    type="number" step="0.01" className="h-8 text-xs"
                    value={line.invoice_amount_usd} placeholder="0.00"
                    onChange={(e) => updateLine(idx, 'invoice_amount_usd', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">USD/Wp</Label>}
                  <Input
                    type="number" step="0.0001" className="h-8 text-xs"
                    value={line.unit_price_usd_wp} placeholder="0.0000"
                    onChange={(e) => updateLine(idx, 'unit_price_usd_wp', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">용량kW</Label>}
                  <div className="h-8 flex items-center text-xs text-muted-foreground bg-muted rounded px-2">
                    {calcCapacityKw(line)}
                  </div>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <Label className="text-xs">&nbsp;</Label>}
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-8 w-8" onClick={() => removeLine(idx)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
