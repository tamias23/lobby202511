# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM docker.io/library/rust:latest AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy all source code (handled by .dockerignore)
COPY new_main/rust-core ./new_main/rust-core
COPY rust ./rust
COPY new_main/bot-server ./new_main/bot-server

# Build the specific binary
WORKDIR /app/new_main/bot-server
RUN cargo build --release

# Collect all shared libraries into a single directory for easy copying.
# We include a dummy file to ensure the directory is never empty, 
# preventing the final COPY command from failing if no .so files are found.
# We look in the release folder and its 'deps' subfolder.
RUN mkdir -p /app/runtime-libs && \
    touch /app/runtime-libs/.keep && \
    find target/release -name "*.so*" -exec cp {} /app/runtime-libs/ \; || true

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM debian:trixie-slim
WORKDIR /app

# Install runtime dependencies
# libssl3, libgcc-s1, and zlib1g are standard dependencies for Rust binaries
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libgcc-s1 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Copy the final binary
COPY --from=builder /app/new_main/bot-server/target/release/bot-server ./bot-server

# Copy all collected shared libraries (principally libonnxruntime.so)
COPY --from=builder /app/runtime-libs/ /app/

# Copy the models
COPY new_main/bot-server/models ./models

ENV PORT=8080
ENV MODELS_DIR=/app/models
ENV RUST_LOG=info
ENV ORT_LOGGING_LEVEL=3
# Ensure the binary can find the shared libraries in the current directory
ENV LD_LIBRARY_PATH=/app

EXPOSE 8080
CMD ["./bot-server"]
