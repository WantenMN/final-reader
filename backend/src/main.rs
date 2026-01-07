use std::path::PathBuf;
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool};
use directories::ProjectDirs;

mod api;
mod db;
mod server;
mod epub;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: SqlitePool,
    pub data_dir: PathBuf,
}

async fn init_app() -> AppState {
    // Get application data directory
    let dirs = ProjectDirs::from("org", "wanten", "FinalReader").unwrap();
    let data_dir = dirs.data_local_dir();
    std::fs::create_dir_all(data_dir).unwrap();

    // Create database
    let db_path = data_dir.join("final_reader.sqlite");
    let db_url = &format!("sqlite://{}", db_path.display());

    if !Sqlite::database_exists(db_url).await.unwrap_or(false) {
        Sqlite::create_database(db_url).await.unwrap();
    }

    // Create a connection pool
    let db_pool = SqlitePool::connect(db_url).await.unwrap();

    // Run migrations
    sqlx::migrate!("./src/db/migrations").run(&db_pool).await.unwrap();

    AppState { db_pool, data_dir: data_dir.to_path_buf() }
}

#[tokio::main]
async fn main() {
    println!("Starting server...");
    let app_state = init_app().await;
    server::start_server(app_state).await;
}
