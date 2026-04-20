FROM node:22-alpine AS base
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages yt-dlp

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV OPENAI_API_KEY=build-placeholder
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Generated Prisma client (for runtime)
COPY --from=builder /app/src/generated ./src/generated

# Prisma CLI with full deps in a separate directory (for migrate deploy only)
COPY --from=builder /app/node_modules /prisma-cli/node_modules
COPY --from=builder /app/prisma /prisma-cli/prisma
COPY --from=builder /app/prisma.config.ts /prisma-cli/prisma.config.ts

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
