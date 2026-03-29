/// 수금 매칭 자동 추천 요청/응답 모델

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// === 미수금 목록 ===

#[derive(Debug, Deserialize)]
pub struct OutstandingListRequest {
    pub company_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct OutstandingListResponse {
    pub customer_id: Uuid,
    pub customer_name: String,
    pub outstanding_items: Vec<OutstandingItem>,
    pub total_outstanding: f64,
    pub outstanding_count: usize,
    pub calculated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OutstandingItem {
    pub outbound_id: Uuid,
    pub outbound_date: Option<String>,
    pub product_name: String,
    pub spec_wp: i32,
    pub quantity: i32,
    pub site_name: Option<String>,
    pub total_amount: f64,
    pub collected_amount: f64,
    pub outstanding_amount: f64,
    pub days_elapsed: i64,
    pub tax_invoice_date: Option<String>,
    pub status: String,
}

// === 매칭 추천 ===

#[derive(Debug, Deserialize)]
pub struct ReceiptMatchSuggestRequest {
    pub company_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub receipt_amount: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct ReceiptMatchSuggestResponse {
    pub receipt_amount: f64,
    pub suggestions: Vec<Suggestion>,
    pub unmatched_amount: f64,
    pub calculated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Suggestion {
    pub match_type: String,
    pub description: String,
    pub items: Vec<SuggestionItem>,
    pub total_matched: f64,
    pub remainder: f64,
    pub match_rate: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct SuggestionItem {
    pub outbound_id: Uuid,
    pub outbound_date: Option<String>,
    pub site_name: Option<String>,
    pub product_name: String,
    pub outstanding_amount: f64,
    pub match_amount: f64,
}
