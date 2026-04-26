// Rust 재고 집계 API 응답 (POST /api/v1/calc/inventory)
export interface InventoryResponse {
  items: InventoryItem[];
  summary: InventorySummary;
  calculated_at: string;
}

export interface InventoryItem {
  company_id?: string;
  company_name?: string;
  product_id: string;
  product_code: string;
  product_name: string;
  manufacturer_name: string;
  spec_wp: number;
  module_width_mm: number;
  module_height_mm: number;
  physical_kw: number;
  reserved_kw: number;
  allocated_kw: number;
  available_kw: number;
  incoming_kw: number;
  incoming_reserved_kw: number;
  available_incoming_kw: number;
  total_secured_kw: number;
  long_term_status: 'normal' | 'warning' | 'critical';
  /** 현재고: 최근 입항일 (completed/erp_done BL 기준) YYYY-MM-DD */
  latest_arrival?: string;
  /** 미착품: 최근 L/C 개설일 (shipping/arrived/customs BL 기준) YYYY-MM-DD */
  latest_lc_open?: string;
}

export interface InventorySummary {
  total_physical_kw: number;
  total_available_kw: number;
  total_incoming_kw: number;
  total_secured_kw: number;
}

// Rust 수급 전망 API 응답 (POST /api/v1/calc/supply-forecast)
export interface ForecastResponse {
  products: ProductForecast[];
  summary: ForecastSummary;
  calculated_at: string;
}

export interface ProductForecast {
  product_id: string;
  product_code: string;
  product_name: string;
  manufacturer_name: string;
  spec_wp: number;
  module_width_mm: number;
  module_height_mm: number;
  months: MonthForecast[];
  unscheduled: {
    sale_kw: number;
    construction_kw: number;
    incoming_kw: number;
  };
}

export interface MonthForecast {
  month: string;
  opening_kw: number;
  incoming_kw: number;
  outgoing_sale_kw: number;
  outgoing_construction_kw: number;
  closing_kw: number;
  reserved_kw: number;
  allocated_kw: number;
  available_kw: number;
  insufficient: boolean;
}

export interface ForecastSummary {
  months: SummaryMonth[];
}

export interface SummaryMonth {
  month: string;
  total_opening_kw: number;
  total_incoming_kw: number;
  total_outgoing_kw: number;
  total_closing_kw: number;
  total_available_kw: number;
}

// 운영 forecast: 수주/출고 전 단계의 자체 공사 예정 모듈 수요
export interface ModuleDemandForecast {
  forecast_id: string;
  company_id: string;
  site_id?: string;
  site_name: string;
  demand_month: string;
  demand_type: 'construction' | 'distribution_adjustment' | 'other';
  manufacturer_id?: string;
  spec_wp: number;
  module_width_mm: number;
  module_height_mm: number;
  required_kw: number;
  status: 'planned' | 'confirmed' | 'done' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleDemandForecastPayload {
  company_id: string;
  site_id?: string;
  site_name: string;
  demand_month: string;
  demand_type: 'construction' | 'distribution_adjustment' | 'other';
  manufacturer_id?: string;
  spec_wp: number;
  module_width_mm: number;
  module_height_mm: number;
  required_kw: number;
  status: 'planned' | 'confirmed' | 'done' | 'cancelled';
  notes?: string;
}
