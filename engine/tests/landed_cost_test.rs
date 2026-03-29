/// Landed Cost + 환율 비교 API 테스트

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use serde_json::json;
use tower::ServiceExt;

/// mock 라우터 (DB 없이 요청 형식 검증만)
fn test_router() -> Router {
    Router::new()
        .route(
            "/api/calc/landed-cost",
            axum::routing::post(mock_landed_cost),
        )
        .route(
            "/api/calc/exchange-compare",
            axum::routing::post(mock_exchange_compare),
        )
}

async fn mock_landed_cost(
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    let has_decl = body.get("declaration_id").and_then(|v| v.as_str()).is_some();
    let has_comp = body.get("company_id").and_then(|v| v.as_str()).is_some();

    if !has_decl && !has_comp {
        return (
            StatusCode::BAD_REQUEST,
            axum::response::Json(json!({"error": "declaration_id 또는 company_id 중 하나는 필수입니다"})),
        );
    }

    (
        StatusCode::OK,
        axum::response::Json(json!({
            "items": [],
            "saved": false,
            "calculated_at": "2026-03-29T12:00:00Z"
        })),
    )
}

async fn mock_exchange_compare(
    axum::extract::Json(body): axum::extract::Json<serde_json::Value>,
) -> (StatusCode, axum::response::Json<serde_json::Value>) {
    if body.get("company_id").and_then(|v| v.as_str()).is_none() {
        return (
            StatusCode::BAD_REQUEST,
            axum::response::Json(json!({"error": "company_id는 필수 항목입니다"})),
        );
    }

    (
        StatusCode::OK,
        axum::response::Json(json!({
            "items": [],
            "latest_rate": 0.0,
            "latest_rate_source": "가장 최근 면장 환율",
            "calculated_at": "2026-03-29T12:00:00Z"
        })),
    )
}

/// landed-cost: declaration_id도 company_id도 없으면 400
#[tokio::test]
async fn test_landed_cost_missing_ids() {
    let app = test_router();
    let body = json!({"save": false});
    let resp = app
        .oneshot(post_json("/api/calc/landed-cost", &body))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// landed-cost: company_id만 있으면 200 + 빈 items
#[tokio::test]
async fn test_landed_cost_empty_result() {
    let app = test_router();
    let body = json!({"company_id": "550e8400-e29b-41d4-a716-446655440000"});
    let resp = app
        .oneshot(post_json("/api/calc/landed-cost", &body))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let resp_body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&resp_body).unwrap();
    assert!(json["items"].as_array().unwrap().is_empty());
    assert_eq!(json["saved"], false);
}

/// exchange-compare: company_id 누락 시 400
#[tokio::test]
async fn test_exchange_compare_missing_company() {
    let app = test_router();
    let body = json!({"product_id": "550e8400-e29b-41d4-a716-446655440001"});
    let resp = app
        .oneshot(post_json("/api/calc/exchange-compare", &body))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 부대비용 배분 단위 테스트
#[test]
fn test_expense_allocation() {
    use solarflow_engine::calc::landed_cost::allocate_expense;

    // total=100kw, item=30kw, expense=100000 -> 30000
    let result = allocate_expense(100.0, 30.0, 100000.0);
    assert_eq!(result, 30000.0);

    // total=0이면 0
    let result = allocate_expense(0.0, 30.0, 100000.0);
    assert_eq!(result, 0.0);

    // 소수점 반올림
    let result = allocate_expense(100.0, 33.33, 100000.0);
    assert_eq!(result, 33330.0);
}

/// save=false 확인 (mock이므로 DB 없이 saved 필드만 확인)
#[tokio::test]
async fn test_landed_cost_save_false() {
    let app = test_router();
    let body = json!({"company_id": "550e8400-e29b-41d4-a716-446655440000", "save": false});
    let resp = app
        .oneshot(post_json("/api/calc/landed-cost", &body))
        .await
        .unwrap();

    let resp_body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&resp_body).unwrap();
    assert_eq!(json["saved"], false);
}

/// POST JSON 헬퍼
fn post_json(uri: &str, body: &serde_json::Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri(uri)
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(body).unwrap()))
        .unwrap()
}
