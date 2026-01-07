use axum::Json;
use serde_json::{json, Value};
use crate::db::models::Book;
use uuid::Uuid;
use chrono::Utc;

pub async fn list_books() -> Json<Vec<Book>> {
    println!("GET /api/books");
    // Return a dummy list of books for now
    let books = vec![
        Book {
            id: Uuid::new_v4(),
            title: "The Hitchhiker's Guide to the Galaxy".to_string(),
            author: Some("Douglas Adams".to_string()),
            path: "/path/to/book1.epub".to_string(),
            cover_path: None,
            imported_at: Utc::now(),
        },
        Book {
            id: Uuid::new_v4(),
            title: "The Restaurant at the End of the Universe".to_string(),
            author: Some("Douglas Adams".to_string()),
            path: "/path/to/book2.epub".to_string(),
            cover_path: None,
            imported_at: Utc::now(),
        },
    ];
    Json(books)
}

pub async fn import_book() -> Json<Value> {
    println!("POST /api/import");
    Json(json!({ "status": "ok", "message": "Book imported successfully" }))
}
