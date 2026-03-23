FROM --platform=linux/arm64 oven/bun:1 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://postgres.lffjpkcmveldiifgidoa:OpenClawManager@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
ENV BETTER_AUTH_SECRET=vwb0o36ViBRHMv1C8OWH1c54lz0cOc1F
ENV BETTER_AUTH_URL=https://openclaw.sltverse.com
ENV NEXT_PUBLIC_APP_URL=https://openclaw.sltverse.com
ENV NEXT_PUBLIC_API_URL=https://openclaw.sltverse.com


ENV TELEGRAM_BOT_USERNAME=ClawManager00_bot 

ENV WEBHOOK_BASE_URL=https://openclaw.sltverse.com





RUN bun run build

# Production runner — use node for Next.js standalone
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]