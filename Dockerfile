FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy application files
COPY . .

# Generate Prisma client and run migrations
RUN npx prisma generate
RUN npx prisma migrate deploy || true

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Start the application
CMD ["npm", "start"]
