# VimTractor Production Dockerfile
# Multi-stage build with Vite for cache-busting

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite build)
RUN npm ci --no-audit --no-fund

# Copy source files needed for build
COPY index.html ./
COPY vite.config.js ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Build with Vite (outputs to dist/) then generate service worker
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vimtractor -u 1001

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy application files
COPY --chown=vimtractor:nodejs server.js ./

# Copy dist folder from builder (Vite output + service worker)
COPY --from=builder --chown=vimtractor:nodejs /app/dist ./dist

# Create data directory for leaderboard persistence
RUN mkdir -p /app/data && chown -R vimtractor:nodejs /app/data

# Switch to non-root user
USER vimtractor

# Expose port
EXPOSE 5110

# Environment
ENV NODE_ENV=production
ENV PORT=5110

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5110/health || exit 1

# Start application
CMD ["node", "server.js"]
