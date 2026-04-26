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
ARG NEXT_PUBLIC_UPLOADS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_UPLOADS_URL=${NEXT_PUBLIC_UPLOADS_URL}

RUN npm run build

# ------------------------------------------------------------
# Runtime stage
# ------------------------------------------------------------
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiamos solo lo necesario para runtime.
COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

RUN groupadd -r app && useradd -r -g app app \
  && chown -R app:app /app
USER app

EXPOSE 3000
CMD ["npm", "start"]
