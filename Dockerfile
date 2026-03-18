# Build stage for client
FROM node:18-alpine AS client-builder

WORKDIR /build/client

# Copy client files
COPY client/package*.json ./
COPY client/tsconfig.json ./
COPY client/tsconfig.node.json ./
COPY client/vite.config.ts ./
COPY client/index.html ./
COPY client/src ./src
COPY client/public ./public

# Install and build
RUN npm install && npm run build

# Build stage for server
FROM node:18-alpine AS server-builder

WORKDIR /build/server

# Copy server files
COPY server/package*.json ./
COPY server/tsconfig.json ./
COPY server/src ./src

# Install and build
RUN npm install && npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy package files for runtime
COPY server/package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy compiled server from builder
COPY --from=server-builder /build/server/dist ./dist

# Copy compiled client from builder
COPY --from=client-builder /build/client/dist ./client/dist

EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]
