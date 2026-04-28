import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  otherPartner,
  testAllocation,
  testBl,
  testBlLine,
  testCompany,
  testInventoryResponse,
  testManufacturer,
  testPartner,
  testProduct,
} from '@/test/fixtures';
import { callsFor, mockFetchWithAuth, parseJsonBody, resetAppStore, seedCompanyStore } from '@/test/mockApi';
import OrderForm, { type OrderPrefillData } from './OrderForm';

vi.mock('@/lib/api', () => ({
  fetchWithAuth: vi.fn(),
}));

function mockOrderFormApi() {
  mockFetchWithAuth((path) => {
    if (path === '/api/v1/inventory/allocations/alloc-1') return { company_id: testCompany.company_id };
    if (path === '/api/v1/products') return [testProduct];
    if (path === '/api/v1/manufacturers') return [testManufacturer];
    if (path === '/api/v1/partners') return [testPartner, otherPartner];
    if (path === `/api/v1/construction-sites?company_id=${testCompany.company_id}`) return [];
    if (path === '/api/v1/calc/inventory') return testInventoryResponse;
    if (path === `/api/v1/bls?manufacturer_id=${testManufacturer.manufacturer_id}`) return [testBl];
    if (path === `/api/v1/bls/${testBl.bl_id}/lines`) return [testBlLine];
    throw new Error(`Unexpected API call: ${path}`);
  });
}

async function chooseReceiptMethod() {
  const label = await screen.findByText(/접수방법/);
  const container = label.closest('div');
  const trigger = container?.querySelector('[data-slot="select-trigger"]');
  expect(trigger).not.toBeNull();
  fireEvent.click(trigger!);
  fireEvent.click(await screen.findByText('발주서'));
}

function renderPrefillForm(overrides: Partial<OrderPrefillData> = {}, onSubmit = vi.fn()) {
  return render(
    <OrderForm
      open
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
      prefillData={{
        alloc_id: testAllocation.alloc_id,
        company_id: testCompany.company_id,
        product_id: testProduct.product_id,
        quantity: testAllocation.quantity,
        management_category: testAllocation.purpose,
        fulfillment_source: testAllocation.source_type,
        customer_hint: `${testPartner.partner_name}(주)`,
        site_name: testAllocation.site_name,
        order_number: testAllocation.customer_order_no,
        bl_id: testBl.bl_id,
        expected_price_per_wp: testAllocation.expected_price_per_wp,
        spare_qty: testAllocation.free_spare_qty,
        ...overrides,
      }}
    />,
  );
}

describe('OrderForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetAppStore();
  });

  it('prefills allocation data and matches customer_hint to a partner', async () => {
    seedCompanyStore();
    mockOrderFormApi();

    renderPrefillForm();

    const banner = await screen.findByText('가용재고 예약에서 수주 전환');
    expect(banner.textContent).toContain('가용재고 예약에서 수주 전환');
    expect(await screen.findByText(testPartner.partner_name)).not.toBeNull();
    expect(await screen.findByText('진코 635W')).not.toBeNull();
    expect(await screen.findByText(testAllocation.site_name)).not.toBeNull();
    expect(await screen.findByDisplayValue(testAllocation.customer_order_no)).not.toBeNull();
    expect(await screen.findByDisplayValue('1,000')).not.toBeNull();
    expect(await screen.findByDisplayValue('260')).not.toBeNull();
  });

  it('submits corrected prefill payload and switches incoming to stock when stock is enough', async () => {
    seedCompanyStore();
    mockOrderFormApi();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderPrefillForm({ fulfillment_source: 'incoming' }, onSubmit);

    await screen.findByText(testPartner.partner_name);
    await chooseReceiptMethod();
    await waitFor(() => expect(screen.getAllByText('실재고').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      company_id: testCompany.company_id,
      order_number: testAllocation.customer_order_no,
      customer_id: testPartner.partner_id,
      receipt_method: 'purchase_order',
      management_category: 'sale',
      fulfillment_source: 'stock',
      product_id: testProduct.product_id,
      quantity: testAllocation.quantity,
      unit_price_wp: testAllocation.expected_price_per_wp,
      spare_qty: testAllocation.free_spare_qty,
      site_name: testAllocation.site_name,
      capacity_kw: 635,
      bl_id: testBl.bl_id,
      status: 'received',
    });
  });

  it('resolves missing prefill company_id from the allocation API before inventory checks', async () => {
    seedCompanyStore('all');
    mockOrderFormApi();

    renderPrefillForm({ company_id: undefined });

    await waitFor(() => expect(callsFor('/api/v1/inventory/allocations/alloc-1').length).toBeGreaterThan(0));
    await waitFor(() => {
      const inventoryCall = callsFor('/api/v1/calc/inventory').find(([, options]) => (
        parseJsonBody(options).company_id === testCompany.company_id
      ));
      expect(inventoryCall).toBeTruthy();
    });
    expect(await screen.findByText('진코 635W')).not.toBeNull();
  });
});
