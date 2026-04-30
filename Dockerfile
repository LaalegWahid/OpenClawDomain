FROM --platform=linux/arm64 node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

FROM --platform=linux/arm64 node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=http://placeholder
ENV BETTER_AUTH_SECRET=placeholderplaceholderplaceholder32
ENV WEBHOOK_BASE_URL=https://placeholder.com
ENV GATEWAY_TOKEN=placeholder
ENV CRON_SECRET=placeholder
ENV STRIPE_SECRET_KEY=sk_test_placeholder
ENV STRIPE_WEBHOOK_SECRET=whsec_placeholder
ENV STRIPE_PRICE_ID=price_placeholder
ENV STRIPE_PRICE_ID_TIER_10=price_placeholder
ENV STRIPE_PRICE_ID_TIER_20=price_placeholder
ENV TELEGRAM_WEBHOOK_SECRET=placeholder
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51TMXgtIN7sRD4CXkKWRbwdbEHnvWIvOpMcbtHuK9jX34czCM0keKFBsZz4LbgzaaxjmQJbljUZTVvbguCsBM6Cua00Tbx2q33p
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc2x0dmVyc2UuY29tJA
ENV CLERK_SECRET_KEY=sk_test_placeholder
RUN pnpm build

FROM --platform=linux/arm64 node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

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