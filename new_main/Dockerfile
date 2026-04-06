# --- STAGE 1: Build Rust NAPI Native Module ---
FROM node:20-slim AS rust-builder
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

# Build the native module
WORKDIR /app/backend/rust-napi
RUN npm install
RUN npm run build

# --- STAGE 2: Build React Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app
# We need the package files for install
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install
# Copy the rest of the frontend source
COPY frontend/ ./
# Run the Vite build to produce the 'dist' folder
RUN npm run build

# --- STAGE 3: Production Runtime ---
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install system dependencies for native modules (DuckDB, bcrypt)
RUN apt-get update && apt-get install -y \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

# 1. Setup Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/src ./src

# 2. Setup Rust NAPI Module
# We mirror the local structure so relative requires like '../rust-napi' work
WORKDIR /app/backend/rust-napi
COPY --from=rust-builder /app/backend/rust-napi/*.node ./
COPY --from=rust-builder /app/backend/rust-napi/index.js ./
COPY --from=rust-builder /app/backend/rust-napi/package.json ./

# 3. Setup Frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/dist ./dist

# 4. Final Prep
WORKDIR /app/backend
RUN mkdir -p db

# Final configuration
EXPOSE 8080
# Explicitly set max-old-space-size to 450MB to fit within typical 512MB Cloud Run containers
CMD ["node", "--max-old-space-size=450", "src/index.js"]
