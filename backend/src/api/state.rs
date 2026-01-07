use axum::{extract::Path, Json};
use serde_json::{json, Value};
use uuid::Uuid;

pub async fn get_state(Path(id): Path<Uuid>) -> Json<Value> {
    println!("GET /api/book/{}/state", id);
    Json(json!({ "book_id": id, "position": "epubcfi(/6/4[chap01ref]!/4/2/1:0)" }))
}

pub async fn update_state(Path(id): Path<Uuid>) -> Json<Value> {
    println!("POST /api/book/{}/state", id);
    Json(json!({ "status": "ok", "message": "State updated" }))
}
