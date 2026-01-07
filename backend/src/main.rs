mod api;
mod db;
mod server;

#[tokio::main]
async fn main() {
    println!("Starting server...");
    server::start_server().await;
}
