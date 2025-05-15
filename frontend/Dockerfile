FROM node:22-alpine AS base


FROM base AS deps
RUN apk add --no-cache libc6-compat && npm install -g pnpm@10.4.1
WORKDIR /app

COPY package.json pnpm-lock.yaml source.config.ts ./

RUN pnpm install


FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat && npm install -g pnpm@10.4.1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build


FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3100

ENV PORT 3100

CMD HOSTNAME="0.0.0.0" node server.js