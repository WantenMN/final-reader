use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{db::models::ReadingState, AppState};

#[derive(Deserialize)]
pub struct UpdateStatePayload {
    position: String,
}

pub async fn get_state(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ReadingState>, (StatusCode, Json<Value>)> {
    println!("GET /api/book/{}/state", id);
    match sqlx::query_as::<_, ReadingState>("SELECT * FROM reading_state WHERE book_id = ?")
        .bind(id)
        .fetch_one(&state.db_pool)
        .await
    {
        Ok(reading_state) => Ok(Json(reading_state)),
        Err(sqlx::Error::RowNotFound) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Reading state not found" })),
        )),
        Err(e) => {
            eprintln!("Failed to fetch reading state: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to fetch reading state" })),
            ))
        }
    }
}

pub async fn update_state(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateStatePayload>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    println!("POST /api/book/{}/state", id);

    let query_result = sqlx::query(
        "INSERT INTO reading_state (book_id, position, last_updated) VALUES (?, ?, ?)
        ON CONFLICT(book_id) DO UPDATE SET position = excluded.position, last_updated = excluded.last_updated",
    )
    .bind(id)
    .bind(&payload.position)
    .bind(Utc::now())
    .execute(&state.db_pool)
    .await;

    match query_result {
        Ok(_) => Ok(Json(json!({ "status": "ok", "message": "State updated" }))),
        Err(e) => {
            eprintln!("Failed to update reading state: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to update reading state" })),
            ))
        }
    }
}

