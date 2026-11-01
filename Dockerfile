# Campus, production build (QA / production with `tutor local`). In development
# it runs with `make front` instead.
FROM node:22-slim AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
# Uploaded videos (a volume in Tutor) and Nuxt Content's SQLite cache (.data/).
RUN mkdir -p /data/videos && chown node:node /data/videos /app
USER node
# Every URL is a runtime NUXT_* variable (see nuxt.config.ts); the Tutor
# plugin sets them from its config.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_ADMIN_VIDEO_DIR=/data/videos
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
