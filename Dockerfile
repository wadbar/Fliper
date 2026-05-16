FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
