# Content Publisher

Low-cost, local-first content operations repo for managing text, image, image-plus-text, short-video, and long-video publishing across Xiaohongshu, Douyin, Bilibili, YouTube, and X.

## Current Scope

- React + Vite dashboard for draft and asset management.
- TypeScript domain rules for platform capability, validation, and publish package generation.
- Manual-review export path for platforms where stable public posting APIs should not be assumed.
- Official API-ready path for YouTube and X, with adapters to be added behind environment variables.

## Platform Boundaries

- YouTube: official API target, OAuth and quota controlled.
- X: official API target, media upload and plan limits need separate checks.
- Bilibili: official capability application first, then upload adapter.
- Douyin: official capability plus user confirmation flow.
- Xiaohongshu: manual-review publishing package first.

## Commands

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

## Cost Strategy

Start local and static. Do not pay for SaaS until account authorization, publish volume, or team workflows require it. Keep secrets in `.env` files and never commit platform tokens.
