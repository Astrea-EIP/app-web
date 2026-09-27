# Stage: shared base with dependencies installed
FROM node:22-slim AS base

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Stage: local development server (hot reload), used by docker-compose
FROM base AS dev

EXPOSE 4200
CMD ["pnpm", "exec", "ng", "serve", "--host", "0.0.0.0"]

# Stage: production build
FROM base AS build

RUN pnpm exec ng build

# Stage: production runtime, published to GHCR
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist/Astrea/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4200
