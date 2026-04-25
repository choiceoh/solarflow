import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatNumber, formatKw } from '@/lib/utils';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FulfillmentSourceBadge from './FulfillmentSourceBadge';
import OrderForm from './OrderForm';
import SaleForm from '@/components/outbound/SaleForm';
import LinkedMemoWidget from '@/components/memo/LinkedMemoWidget';
import { useOrderDetail, useOrderOutbounds } from '@/hooks/useOrders';
import { fetchWithAuth } from '@/lib/api';
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, RECEIPT_METHOD_LABEL,
  MANAGEMENT_CATEGORY_LABEL,
} from '@/types/orders';
import { USAGE_CATEGORY_LABEL } from '@/types/outbound';
import type { Sale } from '@/types/outbound';

interface Props {
  orderId: string;
  onBack: () => void;
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  );
}

export default function OrderDetailView({ orderId, onBack }: Props) {
  const { data: order, loading, reload } = useOrderDetail(orderId);
  const { data: outbounds, loading: obLoading } = useOrderOutbounds(orderId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);

  const loadSales = async () => {
    const list = await fetchWithAuth<Array<{ sale?: Sale } & Sale>>(`/api/v1/sales?order_id=${orderId}`);
    setSales(list.map((item) => item.sale ?? item));
  };

  useEffect(() => {
    loadSales().catch(() => setSales([]));
  }, [orderId]);

  if (loading || !order) return <LoadingSpinner />;

  const remaining = order.remaining_qty ?? (order.quantity - (order.shipped_qty ?? 0));
  const totalShipped = outbounds.reduce((sum, ob) => sum + ob.quantity, 0);

  const handleUpdate = async (data: Record<string, unknown>) => {
    await fetchWithAuth(`/api/v1/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(data) });
    reload();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await fetchWithAuth(`/api/v1/orders/${orderId}`, { method: 'DELETE' });
      setDeleteOpen(false);
      onBack();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
    setDeleting(false);
  };

  const handleSaleSubmit = async (data: Record<string, unknown>) => {
    const existing = sales[0];
    if (existing) {
      await fetchWithAuth(`/api/v1/sales/${existing.sale_id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await fetchWithAuth('/api/v1/sales', { method: 'POST', body: JSON.stringify(data) });
    }
    await loadSales();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold flex-1">수주 {order.order_number || order.order_id.slice(0, 8)}</h2>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1 h-3.5 w-3.5" />수정
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <Trash2 className="mr-1 h-3.5 w-3.5" />삭제
        </Button>
      </div>
      {deleteError && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{deleteError}</div>}

      <Card>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">수주 정보</CardTitle>
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', ORDER_STATUS_COLOR[order.status])}>
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="발주번호" value={order.order_number} />
            <Field label="거래처" value={order.customer_name} />
            <Field label="수주일" value={formatDate(order.order_date)} />
            <Field label="접수방법" value={RECEIPT_METHOD_LABEL[order.receipt_method]} />
            <Field label="관리구분" value={MANAGEMENT_CATEGORY_LABEL[order.management_category]} />
            <Field label="충당소스" value={undefined} />
            {/* 충당소스는 Badge로 따로 표시 */}
            <div>
              <p className="text-[10px] text-muted-foreground">충당소스</p>
              <FulfillmentSourceBadge source={order.fulfillment_source} />
            </div>
            <Field label="품번" value={order.product_code} />
            <Field label="품명" value={order.product_name} />
            <Field label="규격" value={order.spec_wp ? `${order.spec_wp}Wp` : undefined} />
            <Field label="수량" value={formatNumber(order.quantity)} />
            <Field label="잔량" value={formatNumber(remaining)} />
            <Field label="용량" value={order.capacity_kw ? formatKw(order.capacity_kw) : undefined} />
            <Field label="Wp단가" value={`${formatNumber(order.unit_price_wp)}원/Wp`} />
            <Field label="현장명" value={order.site_name} />
            <Field label="현장 주소" value={order.site_address} />
            <Field label="현장 담당" value={order.site_contact} />
            <Field label="현장 전화" value={order.site_phone} />
            <Field label="결제조건" value={order.payment_terms} />
            <Field label="선수금율" value={order.deposit_rate ? `${order.deposit_rate}%` : undefined} />
            <Field label="납기일" value={order.delivery_due ? formatDate(order.delivery_due) : undefined} />
            <Field label="스페어" value={order.spare_qty?.toString()} />
            {order.memo && <Field label="메모" value={order.memo} />}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">계산서</h3>
        <Button size="sm" onClick={() => setSaleFormOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />{sales[0] ? '계산서 수정' : '출고 전 계산서'}
        </Button>
      </div>

      {sales.length > 0 ? (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="거래처" value={sales[0].customer_name ?? order.customer_name} />
              <Field label="수량" value={sales[0].quantity ? formatNumber(sales[0].quantity) : formatNumber(order.quantity)} />
              <Field label="Wp단가" value={`${formatNumber(sales[0].unit_price_wp)}원/Wp`} />
              <Field label="공급가" value={sales[0].supply_amount ? `${formatNumber(sales[0].supply_amount)}원` : undefined} />
              <Field label="부가세" value={sales[0].vat_amount ? `${formatNumber(sales[0].vat_amount)}원` : undefined} />
              <Field label="합계" value={sales[0].total_amount ? `${formatNumber(sales[0].total_amount)}원` : undefined} />
              <Field label="계산서 발행일" value={sales[0].tax_invoice_date ? formatDate(sales[0].tax_invoice_date) : undefined} />
              <Field label="출고 연결" value={sales[0].outbound_id ? '연결됨' : '출고 전'} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">등록된 계산서가 없습니다</div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">연결된 출고</h3>
        <p className="text-xs text-muted-foreground">
          출고: {formatNumber(totalShipped)} / 잔량: {formatNumber(remaining)}
        </p>
      </div>

      {obLoading ? <LoadingSpinner /> : outbounds.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">연결된 출고가 없습니다</div>
      ) : (
        <div className="rounded-md border">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>출고일</TableHead>
                <TableHead>품명</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead>용도</TableHead>
                <TableHead>현장명</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbounds.map((ob) => (
                <TableRow key={ob.outbound_id}>
                  <TableCell>{formatDate(ob.outbound_date)}</TableCell>
                  <TableCell>{ob.product_name ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatNumber(ob.quantity)}</TableCell>
                  <TableCell>{USAGE_CATEGORY_LABEL[ob.usage_category] ?? ob.usage_category}</TableCell>
                  <TableCell>{ob.site_name ?? '—'}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                      ob.status === 'active' ? 'bg-green-100 text-green-700' :
                      ob.status === 'cancel_pending' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {ob.status === 'active' ? '정상' : ob.status === 'cancel_pending' ? '취소예정' : '취소완료'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LinkedMemoWidget linkedTable="orders" linkedId={orderId} />

      <OrderForm open={editOpen} onOpenChange={setEditOpen} onSubmit={handleUpdate} editData={order} />
      <SaleForm
        open={saleFormOpen}
        onOpenChange={setSaleFormOpen}
        onSubmit={handleSaleSubmit}
        order={order}
        editData={sales[0] ?? null}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="수주 삭제"
        description={`수주 "${order.order_number || order.order_id.slice(0, 8)}"을(를) 삭제합니다. 연결된 출고가 있으면 먼저 삭제해야 합니다.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
