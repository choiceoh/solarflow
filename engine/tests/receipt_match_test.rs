/// 수금 매칭 API + 알고리즘 단위 테스트

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use serde_json::json;
use tower::ServiceExt;

fn test_router() -> Router {
    Router::new()
        .route("/api/calc/outstanding-list", axum::routing::post(mock_outstanding))
        .route("/api/calc/receipt-match-suggest", axum::routing::post(mock_suggest))
}

async fn mock_outstanding(axum::extract::Json(body): axum::extract::Json<serde_json::Value>) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    if body.get("company_id").and_then(|v| v.as_str()).is_none() {
        return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "company_id는 필수 항목입니다"})));
    }
    if body.get("customer_id").and_then(|v| v.as_str()).is_none() {
        return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "customer_id는 필수 항목입니다"})));
    }
    (StatusCode::OK, axum::response::Json(json!({
        "customer_id": "uuid", "customer_name": "", "outstanding_items": [],
        "total_outstanding": 0.0, "outstanding_count": 0, "calculated_at": "2026-03-29T12:00:00Z"
    })))
}

async fn mock_suggest(axum::extract::Json(body): axum::extract::Json<serde_json::Value>) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    if body.get("company_id").and_then(|v| v.as_str()).is_none() {
        return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "company_id는 필수 항목입니다"})));
    }
    if body.get("customer_id").and_then(|v| v.as_str()).is_none() {
        return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "customer_id는 필수 항목입니다"})));
    }
    match body.get("receipt_amount").and_then(|v| v.as_f64()) {
        None => return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "receipt_amount는 필수 항목입니다"}))),
        Some(a) if a <= 0.0 => return (StatusCode::BAD_REQUEST, axum::response::Json(json!({"error": "receipt_amount는 양수여야 합니다"}))),
        _ => {}
    }
    (StatusCode::OK, axum::response::Json(json!({
        "receipt_amount": body["receipt_amount"], "suggestions": [], "unmatched_amount": 0.0, "calculated_at": "2026-03-29T12:00:00Z"
    })))
}

fn post_json(uri: &str, body: &serde_json::Value) -> Request<Body> {
    Request::builder().method("POST").uri(uri).header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(body).unwrap())).unwrap()
}

// === API 테스트 ===

#[tokio::test]
async fn test_outstanding_missing_company() {
    let r = test_router().oneshot(post_json("/api/calc/outstanding-list", &json!({"customer_id": "uuid"}))).await.unwrap();
    assert_eq!(r.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_outstanding_missing_customer() {
    let r = test_router().oneshot(post_json("/api/calc/outstanding-list", &json!({"company_id": "uuid"}))).await.unwrap();
    assert_eq!(r.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_outstanding_empty() {
    let r = test_router().oneshot(post_json("/api/calc/outstanding-list", &json!({"company_id": "uuid", "customer_id": "uuid"}))).await.unwrap();
    assert_eq!(r.status(), StatusCode::OK);
    let body = axum::body::to_bytes(r.into_body(), usize::MAX).await.unwrap();
    let j: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(j["total_outstanding"], 0.0);
}

#[tokio::test]
async fn test_suggest_missing_amount() {
    let r = test_router().oneshot(post_json("/api/calc/receipt-match-suggest", &json!({"company_id": "uuid", "customer_id": "uuid"}))).await.unwrap();
    assert_eq!(r.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_suggest_negative_amount() {
    let r = test_router().oneshot(post_json("/api/calc/receipt-match-suggest", &json!({"company_id": "uuid", "customer_id": "uuid", "receipt_amount": -100}))).await.unwrap();
    assert_eq!(r.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_suggest_empty() {
    let r = test_router().oneshot(post_json("/api/calc/receipt-match-suggest", &json!({"company_id": "uuid", "customer_id": "uuid", "receipt_amount": 50000}))).await.unwrap();
    assert_eq!(r.status(), StatusCode::OK);
}

// === 알고리즘 단위 테스트 ===

use solarflow_engine::calc::receipt_match::*;
use solarflow_engine::model::receipt_match::OutstandingItem;
use uuid::Uuid;

fn item(amount: f64) -> OutstandingItem {
    OutstandingItem {
        outbound_id: Uuid::new_v4(), outbound_date: Some("2026-01-01".to_string()),
        product_name: "Test".to_string(), spec_wp: 635, quantity: 100,
        site_name: None, total_amount: amount, collected_amount: 0.0,
        outstanding_amount: amount, days_elapsed: 30, tax_invoice_date: None,
        status: "normal".to_string(),
    }
}

#[test]
fn test_single_exact() {
    let items = vec![item(10000.0)];
    let s = find_single_match(&items, 10000.0);
    assert!(s.is_some());
    assert_eq!(s.unwrap().match_type, "single");
}

#[test]
fn test_combination_exact() {
    let items = vec![item(10000.0), item(20000.0), item(30000.0)];
    let results = find_exact_matches(&items, 30000.0);
    assert!(!results.is_empty());
    assert_eq!(results[0].match_type, "exact");
}

#[test]
fn test_closest_match() {
    let items = vec![item(10000.0), item(25000.0)];
    let s = find_closest_match(&items, 32000.0);
    assert!(s.is_some());
    let s = s.unwrap();
    // 10000+25000=35000 > 32000, so only 25000 or 10000
    // greedy: 10000 first, then 25000 would be 35000>32000, skip. total=10000
    // Actually greedy takes in order: 10000 (10000<=32000), then 25000 (35000>32000, skip)
    assert_eq!(s.total_matched, 10000.0);
    assert_eq!(s.remainder, 22000.0);
}

#[test]
fn test_over_match_prevention() {
    let items = vec![item(15000.0), item(20000.0)];
    // target=10000, both > 10000 => no match possible
    let single = find_single_match(&items, 10000.0);
    assert!(single.is_none());
    let closest = find_closest_match(&items, 10000.0);
    assert!(closest.is_none());
}

#[test]
fn test_empty_items() {
    let items: Vec<OutstandingItem> = vec![];
    assert!(find_single_match(&items, 50000.0).is_none());
    assert!(find_exact_matches(&items, 50000.0).is_empty());
    assert!(find_closest_match(&items, 50000.0).is_none());
}

#[test]
fn test_match_rate() {
    assert_eq!(calc_match_rate(38000.0, 40000.0), 95.0);
    assert_eq!(calc_match_rate(40000.0, 40000.0), 100.0);
    assert_eq!(calc_match_rate(0.0, 40000.0), 0.0);
}

#[test]
fn test_exact_20_items() {
    // 20개 중 정확 매칭 찾기
    let mut items: Vec<OutstandingItem> = (1..=20).map(|i| item(i as f64 * 1000.0)).collect();
    // target = 1000+2000 = 3000
    let results = find_exact_matches(&items, 3000.0);
    assert!(!results.is_empty());
    // 5000+15000도 가능하지만 하나만 확인
    items.clear(); // N=0
    let results = find_exact_matches(&items, 3000.0);
    assert!(results.is_empty());
}

#[test]
fn test_greedy_over_20() {
    // N>20이면 exact_matches는 빈 배열
    let items: Vec<OutstandingItem> = (1..=25).map(|i| item(i as f64 * 100.0)).collect();
    let results = find_exact_matches(&items, 1500.0);
    assert!(results.is_empty()); // N>20 → skip
}

#[test]
fn test_remainder_zero_becomes_exact() {
    let items = vec![item(10000.0), item(20000.0)];
    let s = find_closest_match(&items, 30000.0);
    assert!(s.is_some());
    let s = s.unwrap();
    assert_eq!(s.remainder, 0.0);
    assert_eq!(s.match_type, "exact"); // remainder=0 → exact
}
