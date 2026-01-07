use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: Option<String>,
    pub path: String,
    pub cover_path: Option<String>,
    pub imported_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct ReadingState {
    pub book_id: Uuid,
    pub position: Option<String>,
    pub last_updated: DateTime<Utc>,
}
