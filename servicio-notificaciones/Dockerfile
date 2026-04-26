# syntax=docker/dockerfile:1.7
# whatsapp-web.js usa Puppeteer (Chromium headless), así que necesita imagen con libs de Chrome.
FROM node:20-bookworm-slim

# Dependencias del sistema que exige Chromium para que arranque headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc-s1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# whatsapp-web.js descarga su propio Chromium con puppeteer; lo apuntamos al del sistema
# para evitar el download y para que funcione bajo usuarios restringidos.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Instala deps con cacheo por capa.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# Usuario no-root.
RUN groupadd -r app && useradd -r -g app -G audio,video app \
  && mkdir -p /home/app/.wwebjs_auth /home/app/.wwebjs_cache \
  && chown -R app:app /app /home/app

USER app

# Persistencia de la sesión de WhatsApp — en producción montar volumen aquí.
VOLUME ["/home/app/.wwebjs_auth"]

EXPOSE 8081
ENV PORT=8081
CMD ["node", "index.js"]
