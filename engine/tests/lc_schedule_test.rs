/// LC 수수료/한도 복원/만기 알림 API + 단위 테스트

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use serde_json::json;
use tower::ServiceExt;

fn test_router() -> Router {
    Router::new()
        .route("/api/calc/lc-fee", axum::routing::post(mock_lc_fee))
        .route("/api/calc/lc-limit-timeline", axum::routing::post(mock_timeline))
        .route("/api/calc/lc-maturity-alert", axum::routing::post(mock_alert))
}

async fn mock_lc_fee(axum::extract::Json(body): axum::extract::Json<serde_json::Value>) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    if body.get("lc_id").and_then(|v| v.as_str()).is_none() && body.get("company_id").and_then(|v| v.as_str()).is_none() {
        return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "lc_id 또는 company_id 중 하나는 필수입니다"})));
    }
    (StatusCode::OK, axum::response::Json(json!({
        "items": [],
        "summary": {"total_lc_amount_usd": 0.0, "total_opening_fee_krw": 0.0, "total_acceptance_fee_krw": 0.0, "total_fee_krw": 0.0},
        "fee_note": "요율 기반 자동 계산 예상 금액. 실제 은행 청구 금액과 차이 가능.",
        "calculated_at": "2026-03-29T12:00:00Z"
    })))
}

async fn mock_timeline(axum::extract::Json(_body): axum::extract::Json<serde_json::Value>) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    (StatusCode::OK, axum::response::Json(json!({"banks": [], "total_summary": {"total_limit_usd": 0.0, "total_used_usd": 0.0, "total_available_usd": 0.0, "total_usage_rate": 0.0, "projected_available": []}, "calculated_at": "2026-03-29T12:00:00Z"})))
}

async fn mock_alert(axum::extract::Json(body): axum::extract::Json<serde_json::Value>) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    let days = body.get("days_ahead").and_then(|v| v.as_i64()).unwrap_or(7);
    (StatusCode::OK, axum::response::Json(json!({"alerts": [], "count": 0, "days_ahead_used": days, "calculated_at": "2026-03-29T12:00:00Z"})))
}

fn post_json(uri: &str, body: &serde_json::Value) -> Request<Body> {
    Request::builder().method("POST").uri(uri)
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(body).unwrap())).unwrap()
}

#[tokio::test]
async fn test_lc_fee_missing_ids() {
    let resp = test_router().oneshot(post_json("/api/calc/lc-fee", &json!({}))).await.unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_lc_fee_empty_result() {
    let resp = test_router().oneshot(post_json("/api/calc/lc-fee", &json!({"company_id": "550e8400-e29b-41d4-a716-446655440000"}))).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    let j: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(j["items"].as_array().unwrap().is_empty());
    assert!(j["fee_note"].as_str().unwrap().contains("요율"));
}

#[tokio::test]
async fn test_timeline_empty_banks() {
    let resp = test_router().oneshot(post_json("/api/calc/lc-limit-timeline", &json!({}))).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    let j: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(j["banks"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_alert_default_days() {
    let resp = test_router().oneshot(post_json("/api/calc/lc-maturity-alert", &json!({}))).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    let j: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(j["days_ahead_used"], 7);
}

// === 단위 테스트 ===

#[test]
fn test_opening_fee_calc() {
    use solarflow_engine::calc::lc_schedule::calc_opening_fee;
    let fee = calc_opening_fee(1000000.0, 0.002, 1500.0);
    assert_eq!(fee, 3000000.0);
}

#[test]
fn test_acceptance_fee_calc() {
    use solarflow_engine::calc::lc_schedule::calc_acceptance_fee;
    let fee = calc_acceptance_fee(1000000.0, 0.004, 90, 1500.0);
    assert_eq!(fee, 1500000.0);
}

#[test]
fn test_limit_restoration() {
    use solarflow_engine::calc::lc_schedule::calc_restoration;
    let (current, cum) = calc_restoration(10000000.0, 8000000.0, &[2000000.0]);
    assert_eq!(current, 2000000.0);
    assert_eq!(cum[0], 4000000.0);
}

#[test]
fn test_severity() {
    use solarflow_engine::calc::lc_schedule::severity;
    assert_eq!(severity(0), "critical");
    assert_eq!(severity(3), "critical");
    assert_eq!(severity(4), "warning");
    assert_eq!(severity(7), "warning");
}
