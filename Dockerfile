FROM node:20.19.0-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20.19.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY start.cjs ./
COPY src ./src
USER node
EXPOSE 3001
CMD ["node", "start.cjs"]
