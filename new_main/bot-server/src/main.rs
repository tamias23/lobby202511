mod handlers;

use axum::{Router, routing::{get, post}};
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Suppress ONNX Runtime C++ warnings (VerifyOutputSizes) written directly to stderr.
    // The ort crate already defaults to ERROR log level, but the pre-built ORT binary
    // writes some warnings directly to fd 2, bypassing the logging API.
    // Redirect stderr to /dev/null before any ORT code runs.
    {
        use std::os::unix::io::AsRawFd;
        if let Ok(devnull) = std::fs::File::open("/dev/null") {
            let devnull_fd = devnull.as_raw_fd();
            unsafe {
                unsafe extern "C" { fn dup2(oldfd: i32, newfd: i32) -> i32; }
                dup2(devnull_fd, 2);
            }
            // Keep devnull alive so the fd doesn't get closed
            std::mem::forget(devnull);
        }
    }

    // Tracing — uses stdout, not stderr, so it's unaffected by the redirect above
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout))
        .init();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(5001);

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(handlers::health))
        .route("/models", get(handlers::list_models))
        .route("/move", post(handlers::get_move))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Bot server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
