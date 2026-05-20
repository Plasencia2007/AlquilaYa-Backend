# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------
# Build stage
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Next.js lee NEXT_PUBLIC_* en build-time; se inyectan vía --build-arg.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_UPLOADS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_UPLOADS_URL=${NEXT_PUBLIC_UPLOADS_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ------------------------------------------------------------
# Runtime stage — usa output standalone para imagen mínima
# ------------------------------------------------------------
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd -r app && useradd -r -g app app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

USER app
EXPOSE 3000
CMD ["node", "server.js"]
