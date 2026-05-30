# Content Publisher

Low-cost, local-first content operations repo for managing text, image, image-plus-text, short-video, and long-video publishing across Xiaohongshu, Douyin, Bilibili, YouTube, and X.

## Current Scope

- React + Vite dashboard for draft and asset management.
- TypeScript domain rules for platform capability, validation, and publish package generation.
- Publish queue and adapter layer for X, YouTube, Douyin, Bilibili handoff, and Xiaohongshu manual packages.
- Local OAuth callback server with encrypted token storage in MongoDB.
- CLI commands for account checks, dry runs, and guarded single-platform live publishing.
- Manual-review export path for platforms where stable public posting APIs should not be assumed.
- Official API-ready path for YouTube, X, and Douyin behind environment variables.

## Platform Boundaries

- YouTube: official API target, OAuth and quota controlled.
- X: official API target, media upload and plan limits need separate checks.
- Bilibili: official capability application first, then upload adapter.
- Douyin: official capability plus user confirmation flow.
- Xiaohongshu: manual-review publishing package first.
- See `docs/account-testing.md` for the exact test inputs needed.

## Commands

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
npm run auth:server
npm run accounts:list
npm run accounts:import-env
npm run publish:check
npm run publish:dry-run -- --draft draft-001
npm run publish:live -- --platform x --draft draft-003
```

## Cost Strategy

Start local and static. Do not pay for SaaS until account authorization, publish volume, or team workflows require it. Keep secrets in `.env` files and never commit platform tokens.
