// BARO Phase 3: 거래처별 미수금/한도 보드 타입

export interface CreditBoardRow {
  partner_id: string;
  partner_name: string;
  partner_type: string;
  credit_limit_krw: number | null;
  credit_payment_days: number | null;
  outstanding_krw: number;
  remaining_krw: number | null;
  utilization_pct: number | null;
  last_sale_date: string | null;
  last_receipt_date: string | null;
  oldest_unpaid_days: number | null;
}
