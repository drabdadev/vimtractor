# VimTractor Production Dockerfile
# Multi-stage build for optimized image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --no-audit

# Production stage
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vimtractor -u 1001

# Copy node_modules from builder
COPY --from=builder --chown=vimtractor:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=vimtractor:nodejs server.js ./
COPY --chown=vimtractor:nodejs public ./public

# Create data directory for leaderboard persistence
RUN mkdir -p /app/data && chown -R vimtractor:nodejs /app/data

# Switch to non-root user
USER vimtractor

# Expose port
EXPOSE 5003

# Environment
ENV NODE_ENV=production
ENV PORT=5003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5003/health || exit 1

# Start application
CMD ["node", "server.js"]
