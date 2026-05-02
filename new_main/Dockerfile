# --- STAGE 1: Build Rust NAPI Native Module ---
FROM --platform=linux/amd64 node:20-slim AS rust-builder
WORKDIR /app
# Install system dependencies for Rust and NAPI build
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Copy the core library and the NAPI module wrapper
COPY rust-core ./rust-core
COPY backend/rust-napi ./backend/rust-napi

# Build the native module (cache cargo registry + target dir across builds)
WORKDIR /app/backend/rust-napi
RUN npm install
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/root/.cargo/git \
    --mount=type=cache,target=/app/backend/rust-napi/target \
    npm run build

# --- STAGE 2: Build Flutter Web Frontend ---
FROM --platform=linux/amd64 ghcr.io/cirruslabs/flutter:stable AS frontend-builder
WORKDIR /app/frontend

# Copy pubspec files first (layer cache)
COPY frontend/pubspec.yaml frontend/pubspec.lock ./
RUN --mount=type=cache,target=/root/.pub-cache \
    flutter pub get

# Copy the full Flutter source
# BUILD_TIMESTAMP is declared here (before COPY) so that each deploy busts the
# Podman layer cache and forces a fresh Flutter build.
ARG BUILD_TIMESTAMP=dev
COPY frontend/ ./

# Build Flutter web (API_URL + BUILD_TIMESTAMP baked in at build time)
# Default: production domain. Override with --build-arg API_URL= for local/Podman deploys.
ARG API_URL=https://dedalthegame.com
RUN --mount=type=cache,target=/root/.pub-cache \
    flutter build web --wasm --dart-define=API_URL=${API_URL} --dart-define=BUILD_TIMESTAMP=${BUILD_TIMESTAMP}
# Output: build/web/

# --- STAGE 3: Production Runtime ---
FROM --platform=linux/amd64 node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install system dependencies for native modules (bcrypt)
RUN apt-get update && apt-get install -y \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

# 1. Setup Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production

# Copy boards first (large, ~381MB, rarely changes → its own cached layer)
COPY backend/src/utils/boards ./src/utils/boards

# Copy remaining backend source (changes frequently)
COPY backend/src ./src

# 2. Setup Rust NAPI Module
# We mirror the local structure so relative requires like '../rust-napi' work
WORKDIR /app/backend/rust-napi
COPY --from=rust-builder /app/backend/rust-napi/*.node ./
COPY --from=rust-builder /app/backend/rust-napi/index.js ./
COPY --from=rust-builder /app/backend/rust-napi/package.json ./

# 3. Setup Frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/build/web ./build/web

# 4. Final Prep
WORKDIR /app/backend

# Final configuration
EXPOSE 8080
# Explicitly set max-old-space-size to 450MB to fit within typical 512MB Cloud Run containers
CMD ["node", "--max-old-space-size=1800", "src/index.js"]
