use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

use crate::api;

pub async fn start_server() {
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_origin(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/books", get(api::books::list_books))
        .route("/api/import", post(api::books::import_book))
        .route(
            "/api/book/:id/state",
            get(api::state::get_state).post(api::state::update_state),
        )
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 7878));
    println!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
