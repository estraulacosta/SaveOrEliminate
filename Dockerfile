# Build stage for client
FROM node:18-alpine AS client-builder

WORKDIR /app

COPY client/package*.json ./

RUN npm install

COPY client/tsconfig.json ./
COPY client/vite.config.ts ./
COPY client/index.html ./
COPY client/src ./src
COPY client/public ./public

RUN npm run build

# Build stage for server
FROM node:18-alpine AS server-builder

WORKDIR /app

COPY server/package*.json ./
COPY server/tsconfig.json ./

RUN npm install

COPY server/src ./src

RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy production dependencies
COPY server/package*.json ./
RUN npm install --only=production

# Copy compiled server
COPY --from=server-builder /app/dist ./dist

# Copy compiled client
COPY --from=client-builder /app/dist ./client/dist

EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]
