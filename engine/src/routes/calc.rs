/// 계산 API 엔드포인트

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Json;
use serde_json::{json, Value};
use sqlx::PgPool;

use crate::calc::inventory::calculate_inventory;
use crate::calc::landed_cost::{calculate_landed_cost, compare_exchange_rates};
use crate::calc::lc_schedule::{calculate_lc_fees, calculate_limit_timeline, get_maturity_alerts};
use crate::model::inventory::InventoryRequest;
use crate::model::landed_cost::{ExchangeCompareRequest, LandedCostRequest};
use crate::model::lc_schedule::{LcFeeRequest, LcLimitTimelineRequest, LcMaturityAlertRequest};

/// POST /api/calc/inventory — 재고 집계 핸들러
pub async fn inventory_handler(
    State(pool): State<PgPool>,
    Json(req): Json<InventoryRequest>,
) -> (StatusCode, Json<Value>) {
    if req.company_id.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "company_id는 필수 항목입니다"})),
        );
    }

    match calculate_inventory(&pool, &req).await {
        Ok(response) => (
            StatusCode::OK,
            Json(serde_json::to_value(response).unwrap_or(json!({"error": "직렬화 실패"}))),
        ),
        Err(e) => {
            tracing::error!("재고 집계 실패: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("재고 집계 실패: {}", e)})),
            )
        }
    }
}

/// POST /api/calc/landed-cost — Landed Cost 계산 핸들러
/// 비유: "원가 계산 요청 접수 창구"
pub async fn landed_cost_handler(
    State(pool): State<PgPool>,
    Json(req): Json<LandedCostRequest>,
) -> (StatusCode, Json<Value>) {
    // 우선순위: declaration_id > company_id
    if req.declaration_id.is_none() && req.company_id.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "declaration_id 또는 company_id 중 하나는 필수입니다"})),
        );
    }

    match calculate_landed_cost(&pool, &req).await {
        Ok(response) => (
            StatusCode::OK,
            Json(serde_json::to_value(response).unwrap_or(json!({"error": "직렬화 실패"}))),
        ),
        Err(e) => {
            tracing::error!("Landed Cost 계산 실패: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Landed Cost 계산 실패: {}", e)})),
            )
        }
    }
}

/// POST /api/calc/exchange-compare — 환율 환산 비교 핸들러
/// 비유: "환율 비교 요청 접수 창구"
pub async fn exchange_compare_handler(
    State(pool): State<PgPool>,
    Json(req): Json<ExchangeCompareRequest>,
) -> (StatusCode, Json<Value>) {
    if req.company_id.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "company_id는 필수 항목입니다"})),
        );
    }

    match compare_exchange_rates(&pool, &req).await {
        Ok(response) => (
            StatusCode::OK,
            Json(serde_json::to_value(response).unwrap_or(json!({"error": "직렬화 실패"}))),
        ),
        Err(e) => {
            tracing::error!("환율 비교 실패: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("환율 비교 실패: {}", e)})),
            )
        }
    }
}

/// POST /api/calc/lc-fee — LC 수수료 계산 핸들러
pub async fn lc_fee_handler(
    State(pool): State<PgPool>,
    Json(req): Json<LcFeeRequest>,
) -> (StatusCode, Json<Value>) {
    if req.lc_id.is_none() && req.company_id.is_none() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "lc_id 또는 company_id 중 하나는 필수입니다"})));
    }
    match calculate_lc_fees(&pool, &req).await {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(r).unwrap_or(json!({"error": "직렬화 실패"})))),
        Err(e) => { tracing::error!("LC 수수료 계산 실패: {}", e); (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("LC 수수료 계산 실패: {}", e)}))) }
    }
}

/// POST /api/calc/lc-limit-timeline — 한도 복원 타임라인 핸들러
pub async fn lc_limit_timeline_handler(
    State(pool): State<PgPool>,
    Json(req): Json<LcLimitTimelineRequest>,
) -> (StatusCode, Json<Value>) {
    match calculate_limit_timeline(&pool, &req).await {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(r).unwrap_or(json!({"error": "직렬화 실패"})))),
        Err(e) => { tracing::error!("한도 복원 타임라인 실패: {}", e); (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("한도 복원 타임라인 실패: {}", e)}))) }
    }
}

/// POST /api/calc/lc-maturity-alert — LC 만기 알림 핸들러
pub async fn lc_maturity_alert_handler(
    State(pool): State<PgPool>,
    Json(req): Json<LcMaturityAlertRequest>,
) -> (StatusCode, Json<Value>) {
    match get_maturity_alerts(&pool, &req).await {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(r).unwrap_or(json!({"error": "직렬화 실패"})))),
        Err(e) => { tracing::error!("만기 알림 실패: {}", e); (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("만기 알림 실패: {}", e)}))) }
    }
}
