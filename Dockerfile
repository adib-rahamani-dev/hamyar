# Build once while registries are reachable; deploy the resulting images offline.
ARG NODE_IMAGE=node:24.19.0-bookworm-slim
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ENV HAMYAR_STANDALONE=1
RUN npm run build
RUN npm run build:gateway

FROM dependencies AS gateway
RUN npm prune --omit=dev
COPY --from=build --chown=node:node /app/.gateway ./.gateway
COPY --chown=node:node scripts/media-gateway.mjs ./scripts/media-gateway.mjs
USER node
EXPOSE 8090
CMD ["node", "scripts/media-gateway.mjs"]

FROM dependencies AS migration
RUN npm prune --omit=dev
COPY scripts/migrate.mjs scripts/self-host-schema.mjs scripts/grant-runtime.sql ./scripts/
COPY migrations ./migrations
USER node
CMD ["node", "scripts/self-host-schema.mjs"]

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
