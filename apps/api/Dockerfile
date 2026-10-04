# Build context must be the repository root:
#   docker build -f apps/api/Dockerfile -t ig-focus-hub-api .
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/meta/package.json packages/meta/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @ig-focus-hub/api...

FROM deps AS runtime
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @ig-focus-hub/db generate
ENV NODE_ENV=production
ENV PORT=4000
ENV UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
