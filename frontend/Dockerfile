# ---- 1-bosqich: build ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Sayt joylashadigan subpath (oxirida "/" bilan). Masalan: /iqtidorli-talaba/
ARG VITE_BASE_PATH=/iqtidorli-talaba/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

RUN npm run build

# ---- 2-bosqich: statik fayllarni nginx bilan berish ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
