use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::{Html, Json},
};
use chrono::Utc;
use epub::doc::EpubDoc;
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::fs;
use uuid::Uuid;

use crate::db::models::Book;
use crate::AppState;

#[derive(Serialize)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub path: String,
}

#[derive(Deserialize)]
pub struct ChapterContentQuery {
    path: String,
}

pub async fn get_chapter_content(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<ChapterContentQuery>,
) -> Result<Html<String>, (StatusCode, Json<Value>)> {
    println!("GET /api/books/{}/chapter?path={}", id, query.path);
    let book = match sqlx::query_as::<_, Book>("SELECT * FROM books WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db_pool)
        .await
    {
        Ok(book) => book,
        Err(e) => {
            eprintln!("Failed to fetch book: {}", e);
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Book not found" })),
            ));
        }
    };

    let mut doc = match EpubDoc::new(&book.path) {
        Ok(doc) => doc,
        Err(e) => {
            eprintln!("Failed to parse epub {}: {}", book.path, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to parse epub" })),
            ));
        }
    };

    if let Some(content) = doc.get_resource_by_path(&query.path) {
        let content_str = String::from_utf8_lossy(&content).to_string();
        Ok(Html(content_str))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Chapter not found" })),
        ))
    }
}

pub async fn get_book_chapters(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<Chapter>>, (StatusCode, Json<Value>)> {
    println!("GET /api/books/{}/chapters", id);
    let book = match sqlx::query_as::<_, Book>("SELECT * FROM books WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db_pool)
        .await
    {
        Ok(book) => book,
        Err(e) => {
            eprintln!("Failed to fetch book: {}", e);
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Book not found" })),
            ));
        }
    };

    let doc = match EpubDoc::new(&book.path) {
        Ok(doc) => doc,
        Err(e) => {
            eprintln!("Failed to parse epub {}: {}", book.path, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to parse epub" })),
            ));
        }
    };

    let mut chapters = Vec::new();
    for item in doc.toc.iter() {
        flatten_nav_points(item, &mut chapters);
    }

    Ok(Json(chapters))
}

fn flatten_nav_points(nav_point: &epub::doc::NavPoint, chapters: &mut Vec<Chapter>) {
    chapters.push(Chapter {
        id: nav_point.content.to_string_lossy().to_string(),
        title: nav_point.label.clone(),
        path: nav_point.content.to_string_lossy().to_string(),
    });

    for child in nav_point.children.iter() {
        flatten_nav_points(child, chapters);
    }
}

pub async fn list_books(
    State(state): State<AppState>,
) -> Result<Json<Vec<Book>>, (StatusCode, Json<Value>)> {
    println!("GET /api/books");
    match sqlx::query_as::<_, Book>("SELECT * FROM books")
        .fetch_all(&state.db_pool)
        .await
    {
        Ok(books) => Ok(Json(books)),
        Err(e) => {
            eprintln!("Failed to fetch books: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to fetch books" })),
            ))
        }
    }
}

pub async fn import_books(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<Vec<Book>>, (StatusCode, Json<Value>)> {
    println!("POST /api/import");

    let cache_dir = state.data_dir.join("cache");
    let books_dir = state.data_dir.join("books");
    let covers_dir = state.data_dir.join("covers");

    if let Err(e) = fs::create_dir_all(&cache_dir).await {
        eprintln!("Failed to create cache dir: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to create cache directory" })),
        ));
    }
    if let Err(e) = fs::create_dir_all(&books_dir).await {
        eprintln!("Failed to create books dir: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to create books directory" })),
        ));
    }
    if let Err(e) = fs::create_dir_all(&covers_dir).await {
        eprintln!("Failed to create covers dir: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed to create covers directory" })),
        ));
    }

    let mut imported_books = Vec::new();

    loop {
        match multipart.next_field().await {
            Ok(Some(mut field)) => {
                let file_name = match field.file_name() {
                    Some(file_name) => file_name.to_string(),
                    None => {
                        eprintln!("Uploaded part is not a file");
                        continue;
                    }
                };
                let temp_epub_path = cache_dir.join(&file_name);

                // Read the whole file into memory
                let mut file_data = Vec::new();
                let mut error_reading_chunks = false;
                while let Some(chunk_result) = field.next().await {
                    match chunk_result {
                        Ok(chunk) => {
                            file_data.extend_from_slice(&chunk);
                        }
                        Err(e) => {
                            eprintln!(
                                "Failed to read chunk from multipart for file '{}': {}",
                                file_name, e
                            );
                            error_reading_chunks = true;
                            break;
                        }
                    };
                }

                if error_reading_chunks {
                    continue;
                }

                // Write the file to disk in one go
                if let Err(e) = fs::write(&temp_epub_path, &file_data).await {
                    eprintln!("Failed to write to temporary file: {}", e);
                    continue;
                }

                // Parse EPUB
                let mut doc = match EpubDoc::new(&temp_epub_path) {
                    Ok(doc) => doc,
                    Err(e) => {
                        eprintln!("Failed to parse epub {}: {}", file_name, e);
                        let _ = fs::remove_file(&temp_epub_path).await;
                        continue;
                    }
                };

                let title = doc
                    .mdata("title")
                    .map(|m| m.value.clone())
                    .unwrap_or_else(|| "Unknown".to_string());
                let author = doc.mdata("creator").map(|m| m.value.clone());
                let new_id = Uuid::new_v4();
                let new_path = books_dir.join(format!("{}.epub", new_id));

                // Save cover
                let cover_path = if let Some(cover_data) = doc.get_cover() {
                    let mime_type_str = cover_data.1;
                    let mime_type: mime::Mime = mime_type_str.parse().unwrap();
                    let extension = mime_type.subtype().as_str();
                    let cover_filename = format!("{}.{}", new_id, extension);
                    let cover_filepath = covers_dir.join(cover_filename);
                    if fs::write(&cover_filepath, &cover_data.0).await.is_ok() {
                        Some(cover_filepath.to_string_lossy().to_string())
                    } else {
                        None
                    }
                } else {
                    None
                };

                // Move epub file
                if fs::rename(&temp_epub_path, &new_path).await.is_err() {
                    let _ = fs::remove_file(&temp_epub_path).await;
                    eprintln!("Failed to save EPUB file for {}", file_name);
                    continue;
                }

                let new_book = Book {
                    id: new_id,
                    title,
                    author,
                    path: new_path.to_string_lossy().to_string(),
                    cover_path,
                    imported_at: Utc::now(),
                };

                // Insert into database
                let query_result = sqlx::query(
                        "INSERT INTO books (id, title, author, path, cover_path, imported_at) VALUES (?, ?, ?, ?, ?, ?)",
                    )
                    .bind(&new_book.id)
                    .bind(&new_book.title)
                    .bind(&new_book.author)
                    .bind(&new_book.path)
                    .bind(&new_book.cover_path)
                    .bind(&new_book.imported_at)
                    .execute(&state.db_pool)
                    .await;

                match query_result {
                    Ok(_) => imported_books.push(new_book),
                    Err(e) => {
                        eprintln!("Failed to insert book {}: {}", file_name, e);
                        // Try to clean up the moved epub file
                        let _ = fs::remove_file(&new_path).await;
                    }
                }
            }
            Ok(None) => {
                // All fields processed
                break;
            }
            Err(err) => {
                eprintln!("Multipart error: {}", err);
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": err.to_string() })),
                ));
            }
        }
    }

    Ok(Json(imported_books))
}

