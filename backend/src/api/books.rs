use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::{Html, Json},
};
use chrono::Utc;
use epub::doc::EpubDoc;
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::fs;
use uuid::Uuid;

use crate::AppState;
use crate::db::models::Book;

#[derive(Serialize)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub path: String,
    pub level: u8,
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
    // Normalize path to use forward slashes
    let normalized_path = query.path.replace('\\', "/");
    println!("GET /api/books/{}/chapter?path={}", id, normalized_path);
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

    // Remove fragment (anchor) from path if present, as it's not part of the actual file path
    let path_without_fragment = normalized_path.split('#').next().unwrap_or(&normalized_path);
    
    if let Some(content) = doc.get_resource_by_path(path_without_fragment) {
        let content_str = String::from_utf8_lossy(&content).to_string();
        
        // Return the original content, let frontend handle URL processing
        Ok(Html(content_str))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Chapter not found" })),
        ))
    }
}

// Add a new endpoint to serve EPUB resources like images, fonts, etc.
pub async fn get_book_resource(
    State(state): State<AppState>,
    Path((id, resource_path)): Path<(Uuid, String)>,
) -> Result<axum::response::Response, (StatusCode, Json<Value>)> {
    // Normalize path to use forward slashes and remove leading slash if present
    let normalized_path = resource_path.replace('\\', "/").trim_start_matches('/').to_string();
    // Remove fragment (anchor) from path if present, as it's not part of the actual file path
    let path_without_fragment = normalized_path.split('#').next().unwrap_or(&normalized_path);
    println!("GET /api/books/{}/resource/{}", id, normalized_path);
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

    // Try different path combinations to find the resource
    // 1. First try the exact path provided
    if let Some(content) = doc.get_resource_by_path(path_without_fragment) {
        let mime_type = mime_guess::from_path(path_without_fragment).first_or_octet_stream();
        let response = axum::response::Response::builder()
            .status(StatusCode::OK)
            .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
            .body(axum::body::Body::from(content))
            .unwrap();
        return Ok(response);
    }
    
    // 2. Try with OEBPS/ prefix (common EPUB structure)
    let oebps_path = format!("OEBPS/{}", path_without_fragment);
    if let Some(content) = doc.get_resource_by_path(&oebps_path) {
        let mime_type = mime_guess::from_path(&oebps_path).first_or_octet_stream();
        let response = axum::response::Response::builder()
            .status(StatusCode::OK)
            .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
            .body(axum::body::Body::from(content))
            .unwrap();
        return Ok(response);
    }
    
    // 3. Try with lowercase oebps/ prefix
    let oebps_lower_path = format!("oebps/{}", path_without_fragment);
    if let Some(content) = doc.get_resource_by_path(&oebps_lower_path) {
        let mime_type = mime_guess::from_path(&oebps_lower_path).first_or_octet_stream();
        let response = axum::response::Response::builder()
            .status(StatusCode::OK)
            .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
            .body(axum::body::Body::from(content))
            .unwrap();
        return Ok(response);
    }
    
    // 4. Try with leading /
    let leading_slash_path = format!("/{}", path_without_fragment);
    if let Some(content) = doc.get_resource_by_path(&leading_slash_path) {
        let mime_type = mime_guess::from_path(&leading_slash_path).first_or_octet_stream();
        let response = axum::response::Response::builder()
            .status(StatusCode::OK)
            .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
            .body(axum::body::Body::from(content))
            .unwrap();
        return Ok(response);
    }
    
    // 5. Try with uppercase first letter (e.g., Images/ vs images/)
    let parts: Vec<&str> = path_without_fragment.split('/').collect();
    if !parts.is_empty() {
        // Create a new Vec<String> to hold modified parts
        let mut capitalized_parts: Vec<String> = Vec::new();
        for (i, part) in parts.iter().enumerate() {
            if i == 0 {
                // Capitalize first letter of first part
                if let Some(first_char) = part.chars().next() {
                    let rest = &part[1..];
                    let capitalized = format!("{}{}", first_char.to_uppercase(), rest);
                    capitalized_parts.push(capitalized);
                } else {
                    capitalized_parts.push(part.to_string());
                }
            } else {
                capitalized_parts.push(part.to_string());
            }
        }
        let capitalized_path = capitalized_parts.join("/");
        if let Some(content) = doc.get_resource_by_path(&capitalized_path) {
            let mime_type = mime_guess::from_path(&capitalized_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
        
        // Also try with OEBPS/ prefix for capitalized path
        let oebps_capitalized_path = format!("OEBPS/{}", capitalized_path);
        if let Some(content) = doc.get_resource_by_path(&oebps_capitalized_path) {
            let mime_type = mime_guess::from_path(&oebps_capitalized_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
        
        // Also try with lowercase oebps/ prefix for capitalized path
        let oebps_lower_capitalized_path = format!("oebps/{}", capitalized_path);
        if let Some(content) = doc.get_resource_by_path(&oebps_lower_capitalized_path) {
            let mime_type = mime_guess::from_path(&oebps_lower_capitalized_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
    }
    
    // 6. Try with lowercase first letter (e.g., images/ vs Images/)
    if !parts.is_empty() {
        // Create a new Vec<String> to hold modified parts
        let mut lowercase_parts: Vec<String> = Vec::new();
        for (i, part) in parts.iter().enumerate() {
            if i == 0 {
                // Lowercase first letter of first part
                if let Some(first_char) = part.chars().next() {
                    let rest = &part[1..];
                    let lowercase = format!("{}{}", first_char.to_lowercase(), rest);
                    lowercase_parts.push(lowercase);
                } else {
                    lowercase_parts.push(part.to_string());
                }
            } else {
                lowercase_parts.push(part.to_string());
            }
        }
        let lowercase_path = lowercase_parts.join("/");
        if let Some(content) = doc.get_resource_by_path(&lowercase_path) {
            let mime_type = mime_guess::from_path(&lowercase_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
        
        // Also try with OEBPS/ prefix for lowercase path
        let oebps_lowercase_path = format!("OEBPS/{}", lowercase_path);
        if let Some(content) = doc.get_resource_by_path(&oebps_lowercase_path) {
            let mime_type = mime_guess::from_path(&oebps_lowercase_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
        
        // Also try with lowercase oebps/ prefix for lowercase path
        let oebps_lower_lowercase_path = format!("oebps/{}", lowercase_path);
        if let Some(content) = doc.get_resource_by_path(&oebps_lower_lowercase_path) {
            let mime_type = mime_guess::from_path(&oebps_lower_lowercase_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
    }
    
    // 7. Search through all resources by filename (last resort)
    let filename = path_without_fragment.split('/').last().unwrap_or(path_without_fragment);
    
    // Collect all resource paths first to avoid borrowing conflicts
    let mut resource_paths: Vec<String> = Vec::new();
    for (_, resource_item) in doc.resources.iter() {
        let resource_path = resource_item.path.to_string_lossy().replace('\\', "/");
        let resource_filename = resource_path.split('/').last().unwrap_or(&resource_path);
        // Compare filenames case-insensitively
        if resource_filename.to_lowercase() == filename.to_lowercase() {
            resource_paths.push(resource_path);
        }
    }
    
    // Now try to get the resource content for each matching path
    for resource_path in resource_paths {
        // Create a new EpubDoc instance to avoid borrowing conflicts
        let mut doc_copy = match EpubDoc::new(&book.path) {
            Ok(doc) => doc,
            Err(e) => {
                eprintln!("Failed to parse epub {} again: {}", book.path, e);
                continue;
            }
        };
        
        if let Some(content) = doc_copy.get_resource_by_path(&resource_path) {
            let mime_type = mime_guess::from_path(&resource_path).first_or_octet_stream();
            let response = axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
                .body(axum::body::Body::from(content))
                .unwrap();
            return Ok(response);
        }
    }
    
    // If none of the above worked, return 404
    Err((
        StatusCode::NOT_FOUND,
        Json(json!({ "error": "Resource not found" })),
    ))
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
    
    // Try to use spine for complete reading order (content.opf)
    // First, collect all TOC entries for title lookup
    let mut toc_entries: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for item in doc.toc.iter() {
        collect_toc_entries(item, &mut toc_entries);
    }
    
    // Create a complete reading order by combining spine and TOC
    let mut reading_order: Vec<String> = Vec::new();
    let mut processed_paths: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    // First, add all resources with application/xhtml+xml mime type (from content.opf)
    let mut xhtml_resources: Vec<(String, epub::doc::ResourceItem)> = doc
        .resources
        .clone()
        .into_iter()
        .filter(|(_, item)| item.mime == "application/xhtml+xml")
        .collect();
    
    // Sort resources by their id to get consistent order (approximate spine order)
    xhtml_resources.sort_by(|a, b| a.0.cmp(&b.0));
    
    for (_, resource_item) in xhtml_resources {
        let path = resource_item.path.to_string_lossy().replace('\\', "/");
        if !processed_paths.contains(&path) {
            reading_order.push(path.clone());
            processed_paths.insert(path);
        }
    }
    
    // Now add any remaining TOC entries that might be missing
    for item in doc.toc.iter() {
        add_toc_to_reading_order(item, &mut reading_order, &mut processed_paths);
    }
    
    // Generate chapters from the complete reading order
    let mut chapter_count = 1;
    for path in reading_order {
        // Lookup title from TOC, otherwise use generic title
        let title = toc_entries
            .get(&path)
            .cloned()
            .unwrap_or_else(|| format!("Chapter {}", chapter_count));
        
        chapters.push(Chapter {
            id: path.clone(),
            title,
            path,
            level: 0,
        });
        chapter_count += 1;
    }

    Ok(Json(chapters))
}

// Get only TOC entries from toc.ncx for frontend table of contents display
pub async fn get_book_toc(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<Chapter>>, (StatusCode, Json<Value>)> {
    println!("GET /api/books/{}/toc", id);
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

    let mut toc_chapters = Vec::new();
    
    // Only use TOC entries from toc.ncx, preserving original structure with level information
    for item in doc.toc.iter() {
        collect_toc_chapters(item, &mut toc_chapters, 0);
    }

    Ok(Json(toc_chapters))
}

// Collect only TOC entries into chapters list with level information
fn collect_toc_chapters(nav_point: &epub::doc::NavPoint, chapters: &mut Vec<Chapter>, level: u8) {
    let path = nav_point.content.to_string_lossy().replace('\\', "/");
    chapters.push(Chapter {
        id: path.clone(),
        title: nav_point.label.clone(),
        path,
        level,
    });
    
    for child in nav_point.children.iter() {
        collect_toc_chapters(child, chapters, level + 1);
    }
}

// Collect TOC entries into a hash map for quick lookup
fn collect_toc_entries(nav_point: &epub::doc::NavPoint, toc_entries: &mut std::collections::HashMap<String, String>) {
    let path = nav_point.content.to_string_lossy().replace('\\', "/");
    toc_entries.insert(path, nav_point.label.clone());
    
    for child in nav_point.children.iter() {
        collect_toc_entries(child, toc_entries);
    }
}

// Add TOC entries to reading order if they're not already present
fn add_toc_to_reading_order(
    nav_point: &epub::doc::NavPoint,
    reading_order: &mut Vec<String>,
    processed_paths: &mut std::collections::HashSet<String>
) {
    let path = nav_point.content.to_string_lossy().replace('\\', "/");
    if !processed_paths.contains(&path) {
        reading_order.push(path.clone());
        processed_paths.insert(path);
    }
    
    for child in nav_point.children.iter() {
        add_toc_to_reading_order(child, reading_order, processed_paths);
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

// Add a new endpoint to serve book cover images
pub async fn get_book_cover(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<axum::response::Response, (StatusCode, Json<Value>)> {
    println!("GET /api/books/{}/cover", id);
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

    // Check if cover_path exists
    let cover_path = match book.cover_path {
        Some(path) => path,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Cover not found" })),
            ));
        }
    };

    // Read cover file
    let cover_data = match fs::read(&cover_path).await {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Failed to read cover file {}: {}", cover_path, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to read cover file" })),
            ));
        }
    };

    // Determine MIME type from file extension
    let mime_type = mime_guess::from_path(&cover_path).first_or_octet_stream();
    let response = axum::response::Response::builder()
        .status(StatusCode::OK)
        .header(axum::http::header::CONTENT_TYPE, mime_type.to_string())
        .body(axum::body::Body::from(cover_data))
        .unwrap();
    
    Ok(response)
}
