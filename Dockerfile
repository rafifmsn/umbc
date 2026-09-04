# Stage 1: Build React Client
FROM oven/bun:1-alpine AS client-builder
WORKDIR /app/client

COPY src/client/package.json src/client/bun.lock* ./
RUN bun install --frozen-lockfile

COPY src/client ./
RUN bun run build

# Stage 2: Production Server Runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install server dependencies (including drizzle-kit for migrations)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy server code, migrations, and configs
COPY src/server ./src/server
COPY drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle

# Copy prebuilt client from Stage 1
COPY --from=client-builder /app/client/dist ./src/client/dist

# Expose internal port
EXPOSE 3000

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
