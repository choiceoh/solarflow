import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useAppStore } from '@/stores/appStore';
import { fetchWithAuth } from '@/lib/api';
import type { PurchaseOrder } from '@/types/procurement';
import type { Manufacturer } from '@/types/masters';

function Txt({ text, placeholder = '선택' }: { text: string; placeholder?: string }) {
  return <span className={`flex flex-1 text-left truncate ${text ? '' : 'text-muted-foreground'}`} data-slot="select-value">{text || placeholder}</span>;
}

const CONTRACT_TYPES: Record<string, string> = { general: '일반', exclusive: '독점', annual: '연간', spot: '스팟' };
const PO_STATUSES: Record<string, string> = { draft: '초안', contracted: '계약완료', shipping: '선적중', completed: '완료' };

const schema = z.object({
  po_number: z.string().optional(),
  manufacturer_id: z.string().min(1, '제조사는 필수입니다'),
  contract_type: z.string().min(1, '계약유형은 필수입니다'),
  contract_date: z.string().optional(),
  incoterms: z.string().optional(),
  payment_terms: z.string().optional(),
  status: z.string().min(1, '상태는 필수입니다'),
  memo: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  editData?: PurchaseOrder | null;
}

export default function POForm({ open, onOpenChange, onSubmit, editData }: Props) {
  const selectedCompanyId = useAppStore((s) => s.selectedCompanyId);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [submitError, setSubmitError] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const mfgId = watch('manufacturer_id') ?? '';
  const contractType = watch('contract_type') ?? '';
  const status = watch('status') ?? '';

  useEffect(() => {
    fetchWithAuth<Manufacturer[]>('/api/v1/manufacturers')
      .then((list) => setManufacturers(list.filter((m) => m.is_active))).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setSubmitError('');
      if (editData) {
        reset({
          po_number: editData.po_number ?? '', manufacturer_id: editData.manufacturer_id,
          contract_type: editData.contract_type, contract_date: editData.contract_date?.slice(0, 10) ?? '',
          incoterms: editData.incoterms ?? '', payment_terms: editData.payment_terms ?? '',
          status: editData.status, memo: editData.memo ?? '',
        });
      } else {
        reset({ po_number: '', manufacturer_id: '', contract_type: '', contract_date: '', incoterms: '', payment_terms: '', status: 'draft', memo: '' });
      }
    }
  }, [open, editData, reset]);

  const handle = async (data: FormData) => {
    setSubmitError('');
    const payload: Record<string, unknown> = { ...data, company_id: selectedCompanyId };
    if (!data.contract_date) delete payload.contract_date;
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '저장에 실패했습니다');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader><DialogTitle>{editData ? 'PO 수정' : 'PO 등록'}</DialogTitle></DialogHeader>
        {submitError && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{submitError}</div>}
        <form onSubmit={handleSubmit(handle)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>PO번호</Label><Input {...register('po_number')} /></div>
            <div className="space-y-1.5">
              <Label>제조사 *</Label>
              <Select value={mfgId} onValueChange={(v) => setValue('manufacturer_id', v ?? '')}>
                <SelectTrigger className="w-full"><Txt text={manufacturers.find(m => m.manufacturer_id === mfgId)?.name_kr ?? ''} /></SelectTrigger>
                <SelectContent>{manufacturers.map((m) => <SelectItem key={m.manufacturer_id} value={m.manufacturer_id}>{m.name_kr}</SelectItem>)}</SelectContent>
              </Select>
              {errors.manufacturer_id && <p className="text-xs text-destructive">{errors.manufacturer_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>계약유형 *</Label>
              <Select value={contractType} onValueChange={(v) => setValue('contract_type', v ?? '')}>
                <SelectTrigger className="w-full"><Txt text={CONTRACT_TYPES[contractType] ?? ''} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>계약일</Label><Input type="date" {...register('contract_date')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Incoterms</Label><Input {...register('incoterms')} placeholder="CIF" /></div>
            <div className="space-y-1.5"><Label>결제조건</Label><Input {...register('payment_terms')} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>상태 *</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v ?? '')}>
              <SelectTrigger className="w-full"><Txt text={PO_STATUSES[status] ?? ''} /></SelectTrigger>
              <SelectContent>
                {Object.entries(PO_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>메모</Label><Textarea {...register('memo')} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
