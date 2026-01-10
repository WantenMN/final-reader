use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

use crate::{AppState, api};

pub async fn start_server(app_state: AppState) {
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_origin(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/books", get(api::books::list_books))
        .route("/api/books/:id/chapters", get(api::books::get_book_chapters))
        .route("/api/books/:id/toc", get(api::books::get_book_toc))
        .route("/api/books/:id/chapter", get(api::books::get_chapter_content))
        .route("/api/import", post(api::books::import_books))
        .route(
            "/api/book/:id/state",
            get(api::state::get_state).post(api::state::update_state),
        )
        .layer(cors)
        .layer(DefaultBodyLimit::disable())
        .with_state(app_state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 7878));
    println!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
